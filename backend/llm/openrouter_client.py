import os
import json
from openai import AsyncOpenAI
from typing import Dict, Any, List
from .prompt_templates import DATA_CLEANING_PROMPT, ANALYTICS_PROMPT, ANALYTICS_INTENT_PROMPT, DASHBOARD_OVERVIEW_PROMPT, ANALYTICS_CHART_PROMPT, DATA_STORY_PROMPT, SMART_SUGGESTIONS_PROMPT

class OpenRouterClient:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable not set")
        
        # OpenRouter uses the OpenAI SDK but with a different base URL
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        self.model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")
        # Optional: Add site URL and name for OpenRouter rankings/stats
        # extra_headers={
        #     "HTTP-Referer": "https://your-site-url.com",
        #     "X-Title": "AI Analytics Dashboard"
        # }

    def _clean_json_response(self, text: str) -> str:
        """Helper to strip markdown code blocks if present."""
        text = text.strip()
        if text.startswith("```"):
            first_newline = text.find("\n")
            if first_newline != -1:
                text = text[first_newline+1:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    async def get_cleaning_suggestions(self, dataset_summary: Dict[str, Any]) -> Dict[str, Any]:
        prompt = DATA_CLEANING_PROMPT.format(dataset_summary=json.dumps(dataset_summary, indent=2))
        return await self._generate(prompt)

    async def get_analytics_intent(self, user_query: str) -> Dict[str, Any]:
        prompt = ANALYTICS_INTENT_PROMPT.format(user_query=user_query)
        return await self._generate(prompt)

    async def get_analytics_insight(self, schema_summary: Dict[str, Any], user_query: str, intent: str) -> Dict[str, Any]:
        prompt = ANALYTICS_PROMPT.format(
            schema_summary=json.dumps(schema_summary, indent=2),
            user_query=user_query,
            intent=intent
        )
        return await self._generate(prompt)

    async def get_dashboard_plan(self, dataset_summary: Dict[str, Any]) -> Dict[str, Any]:
        prompt = DASHBOARD_OVERVIEW_PROMPT.format(dataset_summary=json.dumps(dataset_summary, indent=2))
        return await self._generate(prompt)

    async def get_analytics_with_chart(self, schema_summary: Dict[str, Any], user_query: str) -> Dict[str, Any]:
        """Generate analytics response with chart when charts addon is active."""
        prompt = ANALYTICS_CHART_PROMPT.format(
            schema_summary=json.dumps(schema_summary, indent=2),
            user_query=user_query
        )
        return await self._generate(prompt)

    async def get_chat_suggestions(self, schema_summary: Dict[str, Any], chat_context: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """Generate smart suggestions for the chat interface."""
        context_str = json.dumps(chat_context, indent=2) if chat_context else "None"
        prompt = SMART_SUGGESTIONS_PROMPT.format(
            dataset_summary=json.dumps(schema_summary, indent=2),
            chat_context=context_str
        )
        return await self._generate(prompt)

    async def get_data_story(self, story_context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a narrative data story based on dashboard insights."""
        prompt = DATA_STORY_PROMPT.format(
            dataset_context=story_context.get("dataset_context", ""),
            kpis_context=story_context.get("kpis_context", ""),
            charts_context=story_context.get("charts_context", "")
        )
        return await self._generate(prompt)

    async def _generate(self, prompt: str) -> Dict[str, Any]:
        try:
            # Note: We omit response_format={"type": "json_object"} because not all OpenRouter models support it.
            # We rely on the prompt to enforce JSON.
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful data analyst. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ]
            )
            content = response.choices[0].message.content
            cleaned_content = self._clean_json_response(content)
            return json.loads(cleaned_content)
        except json.JSONDecodeError as e:
            print(f"OpenRouter JSON Decode Error: {e}")
            return {"error": "Failed to parse LLM response"}
        except Exception as e:
            print(f"OpenRouter Error: {e}")
            return {"error": str(e)}
