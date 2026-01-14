from typing import Dict, Any, Optional
from services.data_ingestion import DataIngestionService
from services.dashboard_service import DashboardService
from datetime import datetime


class DataStoryService:
    """
    Generates AI-powered narrative summaries of dashboard insights.

    Responsibilities:
    1. Collect dataset metadata
    2. Gather existing KPIs and chart information
    3. Build safe, high-level LLM context (no raw data rows)
    4. Return a structured narrative story
    """

    def __init__(self, llm_client):
        self.llm_client = llm_client
        self.ingestion = DataIngestionService()
        self.dashboard = DashboardService()

    async def generate_story(
        self,
        file_id: str,
        user_id: str,
        dashboard_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        try:
            dataset_context = self._build_dataset_context(file_id, user_id)

            if dashboard_data is None:
                dashboard_data = self.dashboard.generate_fallback_dashboard(file_id, user_id)

            kpis_context = self._build_kpis_context(dashboard_data.get("kpis", []))
            charts_context = self._build_charts_context(
                dashboard_data.get("trends", []),
                dashboard_data.get("distributions", [])
            )

            # Hard stop: nothing meaningful to explain
            if kpis_context == "No KPIs available." and charts_context == "No charts available.":
                return {
                    "story": "There are not enough insights available to generate a meaningful data story.",
                    "generated_at": self._get_timestamp()
                }

            story_context = {
                "dataset_context": dataset_context,
                "kpis_context": kpis_context,
                "charts_context": charts_context
            }

            result = await self.llm_client.get_data_story(story_context)

            if not isinstance(result, dict) or "error" in result:
                return {"error": result.get("error", "LLM failed to generate story.")}

            return {
                "story": result.get("story", "Unable to generate story."),
                "generated_at": self._get_timestamp()
            }

        except Exception as e:
            return {"error": f"Failed to generate data story: {str(e)}"}

    def _build_dataset_context(self, file_id: str, user_id: str) -> str:
        try:
            df = self.ingestion.load_dataset(file_id, user_id)

            row_count = len(df)
            col_count = len(df.columns)
            columns = list(df.columns)

            numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
            categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

            date_cols = [c for c in df.columns if "date" in c.lower() or "time" in c.lower()]
            date_range_str = ""

            if date_cols:
                try:
                    import pandas as pd
                    dates = pd.to_datetime(df[date_cols[0]], errors="coerce")
                    if dates.notna().any():
                        date_range_str = (
                            f" The data spans from {dates.min().date()} to {dates.max().date()}."
                        )
                except Exception:
                    pass

            return (
                f"The dataset contains {row_count:,} rows and {col_count} columns. "
                f"Key columns include {', '.join(columns[:8])}"
                f"{' and others' if len(columns) > 8 else ''}. "
                f"Numeric fields include {', '.join(numeric_cols[:5]) or 'none'}, "
                f"while categorical fields include {', '.join(categorical_cols[:5]) or 'none'}."
                f"{date_range_str}"
            )

        except Exception as e:
            return f"Dataset summary unavailable due to an error: {str(e)}."

    def _build_kpis_context(self, kpis: list) -> str:
        if not kpis:
            return "No KPIs available."

        sentences = []
        for kpi in kpis[:10]:
            title = kpi.get("title", "Unknown metric")
            value = kpi.get("value", "N/A")

            if isinstance(value, (int, float)) and not isinstance(value, bool):
                if value >= 1_000_000:
                    value = f"{value / 1_000_000:.2f}M"
                elif value >= 1_000:
                    value = f"{value / 1_000:.1f}K"
                else:
                    value = f"{value:,.2f}" if isinstance(value, float) else f"{value:,}"

            sentences.append(f"{title} is {value}")

        return ". ".join(sentences) + "."

    def _build_charts_context(self, trends: list, distributions: list) -> str:
        descriptions = []

        for chart in trends[:5]:
            title = chart.get("title", "Untitled trend")
            chart_type = chart.get("chart_type", "line")
            descriptions.append(f"a {chart_type} chart titled '{title}'")

        for chart in distributions[:5]:
            title = chart.get("title", "Untitled distribution")
            chart_type = chart.get("chart_type", "bar")
            descriptions.append(f"a {chart_type} chart titled '{title}'")

        if not descriptions:
            return "No charts available."

        return "The dashboard includes " + ", ".join(descriptions) + "."

    def _get_timestamp(self) -> str:
        return datetime.now().isoformat()
