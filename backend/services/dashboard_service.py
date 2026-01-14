import traceback
from typing import Dict, Any, List
from services.analytics_engine import AnalyticsEngine
from services.data_ingestion import DataIngestionService

class DashboardService:
    def __init__(self):
        self.analytics = AnalyticsEngine()
        self.ingestion = DataIngestionService()

    def generate_dashboard_data(self, file_id: str, dashboard_plan: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """
        Executes the dashboard plan against the dataset using AnalyticsEngine.
        """
        try:
            dashboard = dashboard_plan.get("dashboard", {})
            if not dashboard:
                # Handle case where plan might be just the dashboard dict itself
                dashboard = dashboard_plan if "kpis" in dashboard_plan else {}

            output = {
                "kpis": [],
                "trends": [],
                "distributions": [],
                "data_health": {}
            }
            
            # 1. KPIs
            for item in dashboard.get("kpis", []):
                val = self._resolve_metric(file_id, item.get("metric"), item.get("title"), user_id)
                output["kpis"].append({
                    "title": item.get("title"),
                    "value": val,
                    "description": item.get("description")
                })
                
            # 2. Trends
            output["trends"] = self._resolve_charts(file_id, dashboard.get("trends", []), "trends", user_id)
            
            # 3. Distributions
            output["distributions"] = self._resolve_charts(file_id, dashboard.get("distributions", []), "distributions", user_id)
            
            # 4. Data Health
            if dashboard.get("data_health", {}).get("include"):
                output["data_health"] = self._get_data_health(file_id, user_id)
                
            return output
            
        except Exception as e:
            print(f"Dashboard Generation Error: {traceback.format_exc()}")
            return {"error": str(e)}

    def _resolve_metric(self, file_id: str, metric: Dict, title: str, user_id: str) -> Any:
        if not metric: return "N/A"
        
        # Handle ROW_COUNT special case
        if metric.get("column") == "ROW_COUNT" or metric.get("column") == "__ROW_COUNT__":
            plan = {
                "query_type": "metadata", # or aggregation with no metrics
                "metrics": [],
                "group_by": []
            }
            # Analytics engine metadata query returns row_count
            res = self.analytics.execute_plan(file_id, plan, user_id)
            return res.get("result", {}).get("row_count", 0)

        # Construct a mini-plan for AnalyticsEngine
        plan = {
            "query_type": "aggregation",
            "metrics": [metric],
            "group_by": [],
            "filters": [],
            "limit": None
        }
        
        try:
            result = self.analytics.execute_plan(file_id, plan, user_id)
            if "error" in result:
                return "Error"
            
            data = result.get("result", {})
            
            # If aggregation returns a dict: {"sum_Sales": 123}
            if isinstance(data, dict):
                # Return first value
                return list(data.values())[0] if data else 0
            return 0
            
        except Exception:
             return "Error"

    def _resolve_charts(self, file_id: str, items: List[Dict], section: str, user_id: str) -> List[Dict]:
        resolved = []
        for item in items:
            chart_type = item.get("chart_type")
            x_col = item.get("x")
            y_def = item.get("y") # {column, operation}
            
            if not x_col or not y_def:
                continue

            # Construct plan
            # Trends/Distributions usually require GroupBy X
            
            # Handle ROW_COUNT in charts (e.g. Count of rows by Category)
            metrics_payload = []
            if y_def.get("column") not in ["ROW_COUNT", "__ROW_COUNT__"]:
                metrics_payload = [y_def]
            else:
                # If row count, we send empty metrics to analytics engine implies count(*)
                metrics_payload = [] 
            
            plan = {
                "query_type": "aggregation",
                "metrics": metrics_payload,
                "group_by": [x_col] if x_col else [],
                "filters": [],
                # Sort trend by date asc, distribution by value desc
                "sort": {"column": x_col, "order": "asc"} if section == "trends" else None 
            }
            
            # If distribution, limit to top 10 and sort by value (which we don't know the key of easily ahead of time without executing)
            # Analytics engine sort expects column name.
            # If metrics is empty (count), the key is 'count'.
            # If metric is sum(Sales), key is 'sum_Sales'.
            if section == "distributions":
                 plan["limit"] = 10
                 # Try to guess sort column
                 sort_col = "count"
                 if metrics_payload:
                     sort_col = f"{metrics_payload[0]['operation']}_{metrics_payload[0]['column']}"
                 
                 plan["sort"] = {"column": sort_col, "order": "desc"}
            
            try:
                res = self.analytics.execute_plan(file_id, plan, user_id)
                if "error" in res:
                    continue
                    
                data = res.get("result", [])
                
                # Determine Y key for frontend
                y_key = "count"
                if metrics_payload:
                     y_key = f"{metrics_payload[0]['operation']}_{metrics_payload[0]['column']}"

                resolved.append({
                    "title": item.get("title"),
                    "chart_type": chart_type,
                    "data": data,
                    "config": {
                        "x": x_col,
                        "y": y_key
                    }
                })
            except Exception:
                continue
                
        return resolved

    def _get_data_health(self, file_id: str, user_id: str) -> Dict[str, Any]:
        df = self.ingestion.load_dataset(file_id, user_id)
        
        # Null analysis
        null_counts = df.isnull().sum()
        total_rows = len(df)
        
        # High nulls
        null_analysis = []
        for col, count in null_counts.items():
            if count > 0:
                null_analysis.append({
                    "column": col,
                    "null_count": int(count),
                    "null_percentage": round((count / total_rows) * 100, 1)
                })
        
        # Sort by null percentage
        null_analysis.sort(key=lambda x: x["null_percentage"], reverse=True)
        
        return {
             "total_rows": total_rows,
             "duplicate_rows": int(df.duplicated().sum()),
             "null_analysis_top_5": null_analysis[:5]
        }

    def generate_fallback_dashboard(self, file_id: str, user_id: str) -> Dict[str, Any]:
        """
        Generates a basic dashboard when LLM is unavailable (e.g. rate limits).
        """
        try:
            df = self.ingestion.load_dataset(file_id, user_id)
            health = self._get_data_health(file_id, user_id)
            
            # Basic KPIs
            kpis = [
                {
                    "title": "Total Rows",
                    "value": len(df),
                    "description": "Total records in dataset"
                },
                {
                    "title": "Total Columns",
                    "value": len(df.columns),
                    "description": "Number of fields"
                }
            ]
            
            # Try to find a date column for a simple trend
            trends = []
            date_cols = [c for c in df.columns if "date" in c.lower() or "time" in c.lower()]
            if date_cols:
                # Pick first date column
                dc = date_cols[0]
                # Simple count by date
                try:
                    # Convert to datetime to be sure
                    temp_df = df.copy()
                    temp_df[dc] = pd.to_datetime(temp_df[dc], errors='coerce')
                    # Group by date (floor to day)
                    daily_counts = temp_df.groupby(temp_df[dc].dt.date).size().reset_index(name='count')
                    # Sort
                    daily_counts = daily_counts.sort_values(by=dc).tail(50) # Last 50 points
                    
                    trends.append({
                        "title": f"Records over Time ({dc})",
                        "chart_type": "line",
                        "data": daily_counts.to_dict(orient='records'),
                        "config": {"x": dc, "y": "count"}
                    })
                except Exception:
                    pass # Skip if fails
            
            return {
                "kpis": kpis,
                "trends": trends,
                "distributions": [],
                "data_health": health
            }
        except Exception as e:
            print(f"Fallback Generation Error: {e}")
            return {"kpis": [], "trends": [], "distributions": [], "data_health": {}}
