from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.data_ingestion import DataIngestionService
from services.data_cleaning import DataCleaningService
from services.analytics_engine import AnalyticsEngine
from services.dashboard_service import DashboardService
from services.report_service import ReportService
from services.data_story_service import DataStoryService
from llm.gemini_client import GeminiClient
from llm.openai_client import OpenAIClient
from llm.openrouter_client import OpenRouterClient
from schemas import DatasetMetadata, CleaningRequest, AnalyticsQuery, CleaningSuggestion, AnalyticsResponse, Report, DashboardTile, SuggestionRequest, SuggestionResponse, StructuredChart
from dotenv import load_dotenv
from dotenv import load_dotenv
import os
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, Security
from auth.supabase_auth import verify_supabase_jwt

load_dotenv()

app = FastAPI(title="AI Data Analytics Dashboard API", version="1.0")

# ... CORS ...
# ... CORS ...
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Security Scheme
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    print(f"[AUTH] Received token: {token[:20]}..." if len(token) > 20 else f"[AUTH] Received token: {token}")
    try:
        payload = verify_supabase_jwt(token)
        print(f"[AUTH] Validated user: {payload.get('sub')}")
        return payload
    except Exception as e:
        print(f"[AUTH] Validation failed: {e}")
        raise HTTPException(
            status_code=401,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

# Services
ingestion_service = DataIngestionService()
cleaning_service = DataCleaningService()
analytics_engine = AnalyticsEngine()
dashboard_service = DashboardService()
report_service = ReportService()

# LLM Provider Selection (auto-fallback aware)
llm_provider_env = os.getenv("LLM_PROVIDER", "gemini").lower()
llm_provider = llm_provider_env

# Auto mode prefers OpenAI/OpenRouter if available (often higher rate limits), otherwise Gemini
if llm_provider_env == "auto":
    if os.getenv("OPENROUTER_API_KEY"):
         llm_provider = "openrouter"
    elif os.getenv("OPENAI_API_KEY"):
        llm_provider = "openai"
    elif os.getenv("GEMINI_API_KEY"):
        llm_provider = "gemini"

try:
    if llm_provider == "openai":
        llm_client = OpenAIClient()
    elif llm_provider == "openrouter":
        llm_client = OpenRouterClient()
    else:
        llm_provider = "gemini"
        llm_client = GeminiClient()
except Exception as e:
    # Fallback to the other provider if configured
    if llm_provider == "gemini" and os.getenv("OPENAI_API_KEY"):
        print("Gemini initialization failed, falling back to OpenAI.")
        llm_provider = "openai"
        llm_client = OpenAIClient()
    elif llm_provider == "openai" and os.getenv("GEMINI_API_KEY"):
        print("OpenAI initialization failed, falling back to Gemini.")
        llm_provider = "gemini"
        llm_client = GeminiClient()
    else:
        raise e

print(f"Using LLM Provider: {llm_provider}")

@app.get("/")
def health_check():
    return {"status": "ok", "version": "1.0"}

@app.post("/api/v1/upload", response_model=DatasetMetadata)
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    try:
        print(f"Received upload: {file.filename}")
        if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
            raise HTTPException(400, "Invalid file format")
        
        file_id, _ = await ingestion_service.save_upload(file, user_id)
        print(f"File saved: {file_id}")
        return ingestion_service.get_metadata(file_id, user_id)
    except Exception as e:
        print(f"UPLOAD ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, str(e))

@app.get("/api/v1/files/{file_id}", response_model=DatasetMetadata)
def get_file_metadata(file_id: str, preview_rows: int = 5, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    try:
        return ingestion_service.get_metadata(file_id, user_id, preview_rows=preview_rows)
    except FileNotFoundError:
        raise HTTPException(404, "File not found")

@app.post("/api/v1/clean/suggest")
async def suggest_cleaning(file_id_wrapper: dict, current_user: dict = Depends(get_current_user)): 
    # Wrap int simple dict for body: {"file_id": "..."}
    file_id = file_id_wrapper.get("file_id")
    user_id = current_user["sub"]
    try:
        df = ingestion_service.load_dataset(file_id, user_id)
        summary = cleaning_service.generate_summary(df)
        llm_error = None

        try:
            llm_response = await llm_client.get_cleaning_suggestions(summary)
        except Exception as e:
            llm_error = f"LLM request error: {e}"
            llm_response = {"error": llm_error}

        if isinstance(llm_response, dict) and "error" in llm_response:
            llm_error = llm_response.get("error")

        suggestions = llm_response.get("suggestions") if isinstance(llm_response, dict) else None
        if not isinstance(suggestions, list) and isinstance(llm_response, list):
            suggestions = llm_response

        # Fall back to rule-based suggestions if the LLM fails or returns an invalid payload
        if not isinstance(suggestions, list):
            suggestions = cleaning_service.rule_based_suggestions(df)

        # Ensure we always return a list (even empty) to keep the contract stable
        if suggestions is None:
            suggestions = []

        response_body = {"suggestions": suggestions}
        if llm_error:
            response_body["llm_error"] = llm_error

        return response_body
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/api/v1/clean/apply")
def apply_cleaning(request: CleaningRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    try:
        new_file_id = cleaning_service.apply_cleaning(request.file_id, request.selected_suggestions, user_id)
        return {"new_file_id": new_file_id}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/api/v1/suggestions", response_model=SuggestionResponse)
async def get_suggestions(request: SuggestionRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    try:
        # 1. Get Schema/Summary
        df = ingestion_service.load_dataset(request.file_id, user_id)
        schema_summary = cleaning_service.generate_summary(df)

        # 2. Get LLM Suggestions
        llm_response = await llm_client.get_chat_suggestions(schema_summary, request.chat_context)
        
        suggestions = []
        if "suggestions" in llm_response and isinstance(llm_response["suggestions"], list):
             suggestions = llm_response["suggestions"]
        
        # 3. Fallback if empty or error
        if not suggestions:
             print("LLM returned no suggestions, using fallback.")
             suggestions = [
                 "Show summary statistics",
                 "Show trends over time", 
                 "Find top categories",
                 "Compare groups",
                 "Count records",
                 "Show data distribution"
             ]
             
        # Ensure we limit to requested count (default 6)
        return SuggestionResponse(suggestions=suggestions[:request.count])

    except Exception as e:
        print(f"Suggestion Error: {e}")
        # Final fallback on critical error
        return SuggestionResponse(suggestions=[
             "Show summary statistics",
             "Show trends over time", 
             "Find top categories",
             "Compare groups"
        ])

@app.post("/api/v1/chat/query", response_model=AnalyticsResponse)
async def analytics_chat(query: AnalyticsQuery, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    try:
        # 1. Get Schema
        df = ingestion_service.load_dataset(query.file_id, user_id)
        schema_summary = cleaning_service.generate_summary(df) # Reuse summary logic
        
        # NEW: Check for charts addon - use dedicated chart prompt path
        if query.addons and "charts" in query.addons:
            print(f"Charts addon active for query: {query.query}")
            chart_response = await llm_client.get_analytics_with_chart(schema_summary, query.query)
            
            # Fallback to other provider if error
            if "error" in chart_response and llm_provider == "gemini" and os.getenv("OPENAI_API_KEY"):
                fallback_client = OpenAIClient()
                chart_response = await fallback_client.get_analytics_with_chart(schema_summary, query.query)
            
            if "error" not in chart_response:
                text_response = chart_response.get("text_response", "Here is your analysis.")
                chart_data = chart_response.get("chart")
                
                # Build structured chart if present
                structured_chart = None
                if chart_data and isinstance(chart_data, dict):
                    try:
                        structured_chart = StructuredChart(
                            title=chart_data.get("title", "Chart"),
                            chart_type=chart_data.get("chart_type", "bar"),
                            x=chart_data.get("x", "x"),
                            y=chart_data.get("y", "y"),
                            data=chart_data.get("data", [])
                        )
                    except Exception as e:
                        print(f"Failed to build StructuredChart: {e}")
                        # Continue without chart
                
                return AnalyticsResponse(
                    intent="chart" if structured_chart else "analytics",
                    answer=text_response,
                    chart=structured_chart,
                    chart_type=chart_data.get("chart_type") if chart_data else None,
                    explanation=text_response
                )
            else:
                # Chart generation failed, fall through to standard path
                print(f"Chart generation failed: {chart_response.get('error')}, falling back to standard path")
        
        # 2. Get LLM Intent & DSL Plan (standard path)
        # First, classify intent
        intent_response = await llm_client.get_analytics_intent(query.query)
        if "error" in intent_response:
             raise HTTPException(500, f"Intent Classification Error: {intent_response['error']}")
             
        intent = intent_response.get("intent")
        valid_intents = ["metadata", "aggregation", "filter", "timeseries"]
        if intent not in valid_intents:
             intent = "aggregation" # Default fallback
             
        print(f"Detected Intent: {intent}")

        # Second, generate plan based on intent
        llm_response = await llm_client.get_analytics_insight(schema_summary, query.query, intent)

        # Fallback logic for providers (same as before)
        if llm_provider == "gemini" and "error" in llm_response and os.getenv("OPENAI_API_KEY"):
            fallback_client = OpenAIClient()
            # Retry intent classification with fallback? Or just reuse? 
            # Let's reuse the intent for now to save a call, or re-classify if we suspect the model is bad.
            # Simpler to just re-do the plan generation part.
            fallback_response = await fallback_client.get_analytics_insight(schema_summary, query.query, intent)
            if "error" not in fallback_response:
                llm_response = fallback_response
        
        if "error" in llm_response:
            raise HTTPException(500, f"LLM Error: {llm_response['error']}")
            
        # The whole response is now the plan module
        plan = llm_response
        explanation = plan.get("explanation", "Here is the analysis result.")
        chart_config = plan.get("chart")
        chart_type = chart_config.get("type") if chart_config else None
        
        # 3. Execute Plan (Safe DSL Execution)
        execution_result = analytics_engine.execute_plan(query.file_id, plan, user_id)
        
        if "error" in execution_result:
             return AnalyticsResponse(
                intent="Analysis Error",
                answer=f"Error executing analysis: {execution_result['error']}",
                explanation=explanation
            )
            
        result_data = execution_result["result"]

        # 4. Format the answer based on result type
        formatted_answer = explanation
        
        if result_data:
            # Scalar results (metadata or simple aggregation)
            if isinstance(result_data, dict):
                # Format simple k/v pairs
                summary_parts = []
                for k, v in result_data.items():
                    # Clean up keys like 'sum_Sales' -> 'Sum Sales'
                    clean_key = k.replace("_", " ").title()
                    summary_parts.append(f"**{clean_key}**: {v}")
                
                if summary_parts:
                    formatted_answer += "\n\n" + "\n".join(summary_parts)
            
            # List results (table/chart data)
            elif isinstance(result_data, list):
                if not result_data:
                    formatted_answer += "\n\n**No matching data found.**"
                else:
                    # If it's a small list, maybe show a preview? 
                    # For now just let the FE handle the chart/table.
                    pass
        
        return AnalyticsResponse(
            intent=plan.get("query_type", "analytics"),
            answer=formatted_answer,
            chart_type=chart_type,
            chart_data=result_data if isinstance(result_data, list) else None,
            explanation=explanation 
        )

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Analytics chat error: {error_trace}")
        raise HTTPException(500, str(e))

@app.get("/api/v1/dashboard/overview")
async def get_dashboard_overview(file_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    try:
        df = ingestion_service.load_dataset(file_id, user_id)
        summary = cleaning_service.generate_summary(df)
        
        # LLM Plan
        print(f"Generating dashboard plan for {file_id}...")
        plan_response = await llm_client.get_dashboard_plan(summary)
        
        if "error" in plan_response:
             print(f"Dashboard Plan Error: {plan_response['error']}")
             print("Falling back to basic dashboard generation...")
             return dashboard_service.generate_fallback_dashboard(file_id, user_id)
             
        # Generate Data
        print("Executing dashboard plan...")
        dashboard_data = dashboard_service.generate_dashboard_data(file_id, plan_response, user_id)
        
        return dashboard_data
    except Exception as e:
        print(f"Dashboard Critical Error: {e}")
        traceback.print_exc()
        # Final safety net
        return dashboard_service.generate_fallback_dashboard(file_id, user_id)


@app.post("/api/v1/data-story")
async def generate_data_story(request: dict, current_user: dict = Depends(get_current_user)):
    """
    Generate an AI-powered narrative summary of the dashboard insights.
    
    Request body:
        file_id: str - The dataset file ID
        dashboard_data: dict (optional) - Pre-fetched dashboard data to use
    
    Returns:
        story: str - The generated narrative
        generated_at: str - ISO timestamp
    """
    file_id = request.get("file_id")
    if not file_id:
        raise HTTPException(400, "file_id is required")
    
    try:
        # Get dashboard data if not provided
        dashboard_data = request.get("dashboard_data")
        user_id = current_user["sub"]
        
        if not dashboard_data:
            # Fetch fresh dashboard data
            df = ingestion_service.load_dataset(file_id, user_id)
            summary = cleaning_service.generate_summary(df)
            
            plan_response = await llm_client.get_dashboard_plan(summary)
            if "error" not in plan_response:
                dashboard_data = dashboard_service.generate_dashboard_data(file_id, plan_response, user_id)
            else:
                dashboard_data = dashboard_service.generate_fallback_dashboard(file_id, user_id)
        
        # Generate story using dedicated service
        story_service = DataStoryService(llm_client)
        result = await story_service.generate_story(file_id, user_id, dashboard_data)
        
        if "error" in result:
            # Try fallback provider if available
            if llm_provider == "gemini" and os.getenv("OPENAI_API_KEY"):
                fallback_client = OpenAIClient()
                fallback_story_service = DataStoryService(fallback_client)
                result = await fallback_story_service.generate_story(file_id, user_id, dashboard_data)
            elif llm_provider == "openai" and os.getenv("GEMINI_API_KEY"):
                fallback_client = GeminiClient()
                fallback_story_service = DataStoryService(fallback_client)
                result = await fallback_story_service.generate_story(file_id, user_id, dashboard_data)
        
        if "error" in result:
            raise HTTPException(500, result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Failed to generate data story: {str(e)}")


@app.post("/api/v1/reports", response_model=Report)
def create_report(request: dict, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    title = request.get("title", "New Report")
    file_id = request.get("file_id")
    if not file_id:
        raise HTTPException(400, "file_id is required")
    return report_service.create_report(title, file_id, user_id)

@app.get("/api/v1/reports", response_model=list[Report])
def list_reports(file_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    return report_service.list_reports(file_id, user_id)

@app.get("/api/v1/reports/{report_id}", response_model=Report)
def get_report(report_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    report = report_service.get_report(report_id, user_id)
    if not report:
        raise HTTPException(404, "Report not found")
    return report

@app.delete("/api/v1/reports/{report_id}")
def delete_report(report_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    success = report_service.delete_report(report_id, user_id)
    if not success:
        raise HTTPException(404, "Report not found")
    return {"status": "success"}

@app.post("/api/v1/reports/{report_id}/tiles", response_model=Report)
def add_tile_to_report(report_id: str, tile: DashboardTile, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    # Pass model_dump to service
    updated_report = report_service.add_tile(report_id, tile.model_dump(), user_id)
    if not updated_report:
        raise HTTPException(404, "Report not found")
    return updated_report

@app.delete("/api/v1/reports/{report_id}/tiles/{tile_id}", response_model=Report)
def remove_tile_from_report(report_id: str, tile_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    updated_report = report_service.remove_tile(report_id, tile_id, user_id)
    if not updated_report:
        raise HTTPException(404, "Report not found")
    return updated_report

@app.put("/api/v1/reports/{report_id}", response_model=Report)
def update_report(report_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    updated_report = report_service.update_report(report_id, updates, user_id)
    if not updated_report:
        raise HTTPException(404, "Report not found")
    return updated_report

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
