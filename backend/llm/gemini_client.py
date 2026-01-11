import os
import json
import asyncio
from typing import Dict, Any, List
from google import genai

from .prompt_templates import DATA_CLEANING_PROMPT, ANALYTICS_PROMPT, ANALYTICS_INTENT_PROMPT, DASHBOARD_OVERVIEW_PROMPT, SMART_SUGGESTIONS_PROMPT, ANALYTICS_CHART_PROMPT


class GeminiClient:
    """
    Gemini wrapper with model preference + graceful rate-limit fallback.
    - Configure a primary model via GEMINI_MODEL (default: gemini-1.5-flash-002)
    - Optionally add comma-separated GEMINI_MODEL_FALLBACKS for automatic failover
    """

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")

        primary_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
        fallback_env = os.getenv("GEMINI_MODEL_FALLBACKS", "")
        fallback_models = [m.strip() for m in fallback_env.split(",") if m.strip()]

        # Sensible defaults based on available models
        default_fallbacks = [
            "gemini-2.0-flash-001",
            "gemini-flash-latest",
            "gemini-2.0-flash-lite",
            "gemini-2.5-flash",
        ]

        self.model_candidates: List[str] = [primary_model, *fallback_models, *default_fallbacks]
        # Deduplicate while keeping order
        seen = set()
        self.model_candidates = [m for m in self.model_candidates if not (m in seen or seen.add(m))]

        self.client = genai.Client(api_key=self.api_key)

    def _clean_json_response(self, text: str) -> str:
        """Helper to strip markdown code blocks if present."""
        text = text.strip()
        if text.startswith("```"):
            first_newline = text.find("\n")
            if first_newline != -1:
                text = text[first_newline + 1 :]

        if text.endswith("```"):
            text = text[:-3]

        return text.strip()

    def _is_rate_limit_error(self, error: Exception) -> bool:
        msg = str(error).lower()
        return "429" in msg or "quota" in msg or "rate limit" in msg or "resourceexhausted" in msg

    async def get_cleaning_suggestions(self, dataset_summary: Dict[str, Any]) -> Dict[str, Any]:
        prompt = DATA_CLEANING_PROMPT.format(dataset_summary=json.dumps(dataset_summary, indent=2))
        return await self._generate_with_retry(prompt)

    async def get_analytics_intent(self, user_query: str) -> Dict[str, Any]:
        prompt = ANALYTICS_INTENT_PROMPT.format(user_query=user_query)
        return await self._generate_with_retry(prompt)

    async def get_analytics_insight(self, schema_summary: Dict[str, Any], user_query: str, intent: str) -> Dict[str, Any]:
        prompt = ANALYTICS_PROMPT.format(
            schema_summary=json.dumps(schema_summary, indent=2),
            user_query=user_query,
            intent=intent
        )
        return await self._generate_with_retry(prompt)

    async def get_dashboard_plan(self, dataset_summary: Dict[str, Any]) -> Dict[str, Any]:
        prompt = DASHBOARD_OVERVIEW_PROMPT.format(dataset_summary=json.dumps(dataset_summary, indent=2))
        return await self._generate_with_retry(prompt)

    async def get_chat_suggestions(self, schema_summary: Dict[str, Any], chat_context: List[Dict[str, str]] = None) -> Dict[str, Any]:
        context_str = json.dumps(chat_context, indent=2) if chat_context else "None"
        prompt = SMART_SUGGESTIONS_PROMPT.format(
            dataset_summary=json.dumps(schema_summary, indent=2),
            chat_context=context_str
        )
        return await self._generate_with_retry(prompt)

    async def get_analytics_with_chart(self, schema_summary: Dict[str, Any], user_query: str) -> Dict[str, Any]:
        """Generate analytics response with chart when charts addon is active."""
        prompt = ANALYTICS_CHART_PROMPT.format(
            schema_summary=json.dumps(schema_summary, indent=2),
            user_query=user_query
        )
        return await self._generate_with_retry(prompt)

    async def _generate_with_retry(self, prompt: str, retries: int = 3) -> Dict[str, Any]:
        """Handles content generation with retries/fallbacks for 429s and JSON parsing."""
        last_error = None
        model_index = 0

        for attempt in range(retries):
            model_name = self.model_candidates[min(model_index, len(self.model_candidates) - 1)]
            try:
                response = await self.client.aio.models.generate_content(model=model_name, contents=prompt)
                cleaned_text = self._clean_json_response(response.text)
                return json.loads(cleaned_text)

            except json.JSONDecodeError as e:
                raw_text = response.text if "response" in locals() else ""
                with open("llm_debug.log", "a") as f:
                    f.write(f"\n\nJSON ERROR (Attempt {attempt+1}, model={model_name}):\n{raw_text}\n")
                last_error = f"Failed to parse LLM response: {e}"

            except Exception as e:
                error_msg = str(e)
                if self._is_rate_limit_error(e):
                    wait_time = min((2**attempt) * 2, 15)  # 2, 4, 8, 15...
                    print(f"Rate limited on {model_name}. Retrying in {wait_time}s...")
                    last_error = f"Rate limit exceeded on {model_name}: {e}"
                    await asyncio.sleep(wait_time)
                    # Try the next model if available
                    if model_index + 1 < len(self.model_candidates):
                        model_index += 1
                else:
                    with open("llm_debug.log", "a") as f:
                        f.write(f"\n\nGENERIC ERROR (Attempt {attempt+1}, model={model_name}):\n{error_msg}\n")
                    last_error = f"LLM Error on {model_name}: {e}"

        return {"error": last_error or "Unknown error occurred"}
