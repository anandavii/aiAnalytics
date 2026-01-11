from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class DatasetMetadata(BaseModel):
    file_id: str
    filename: str
    rows: int
    columns: int
    column_names: List[str]
    dtypes: Dict[str, str]
    preview: List[Dict[str, Any]]

class CleaningSuggestion(BaseModel):
    action: str
    column: Optional[str] = None
    value: Optional[Any] = None
    reason: str

class CleaningRequest(BaseModel):
    file_id: str
    selected_suggestions: List[CleaningSuggestion]

class AnalyticsQuery(BaseModel):
    file_id: str
    query: str
    addons: Optional[List[str]] = None  # Active add-ons for this request (e.g. ["charts"])

class StructuredChart(BaseModel):
    """Structured chart definition returned when charts addon is active"""
    title: str
    chart_type: str  # bar, line, pie, table
    x: str
    y: str
    data: List[Dict[str, Any]]

class AnalyticsResponse(BaseModel):
    intent: str
    answer: Optional[str] = None
    chart_type: Optional[str] = None
    chart_data: Optional[List[Dict[str, Any]]] = None
    chart: Optional[StructuredChart] = None  # Structured chart when charts addon is active
    explanation: str

class ErrorResponse(BaseModel):
    detail: str

class DashboardTile(BaseModel):
    tile_id: str
    type: str # kpi, chart, table, text
    title: str
    data: Optional[Any] = None  # Accept dict (KPIs) or list (charts)
    chart_type: Optional[str] = None # bar, line, pie, etc.
    config: Optional[Dict[str, Any]] = None # layout config, axies, etc.
    source: Optional[Dict[str, Any]] = None # file_id, query info

class Report(BaseModel):
    report_id: str
    file_id: str
    title: str
    created_at: str
    tiles: List[DashboardTile] = []
    layout: Optional[Dict[str, Any]] = None # For future advanced layout config

class SuggestionResponse(BaseModel):
    suggestions: List[str]

class SuggestionRequest(BaseModel):
    file_id: str
    chat_context: Optional[List[Dict[str, str]]] = None
    count: Optional[int] = 6
