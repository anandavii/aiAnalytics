import os
import json
from openai import AsyncOpenAI
from typing import Dict, Any, List
from .prompt_templates import DATA_CLEANING_PROMPT, ANALYTICS_PROMPT, ANALYTICS_INTENT_PROMPT, DASHBOARD_OVERVIEW_PROMPT, ANALYTICS_CHART_PROMPT

class OpenAIClient:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        
        self.client = AsyncOpenAI(api_key=self.api_key)
        self.model = "gpt-4o" # Recommended for complex analytics

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

    async def _generate(self, prompt: str) -> Dict[str, Any]:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful data analyst. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={ "type": "json_object" } # Strict JSON mode
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            print(f"OpenAI Error: {e}")
            return {"error": str(e)}
