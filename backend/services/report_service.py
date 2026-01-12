import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from schemas import Report, DashboardTile
from config import DATA_DIR, REPORTS_FILE

class ReportService:
    def __init__(self):
        self._ensure_data_dir()

    def _ensure_data_dir(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
        if not os.path.exists(REPORTS_FILE):
            with open(REPORTS_FILE, "w") as f:
                json.dump({}, f)

    def _load_reports(self) -> Dict[str, Any]:
        try:
            with open(REPORTS_FILE, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save_reports(self, reports: Dict[str, Any]):
        with open(REPORTS_FILE, "w") as f:
            json.dump(reports, f, indent=2)

    def create_report(self, title: str, file_id: str) -> Report:
        reports = self._load_reports()
        report_id = str(uuid.uuid4())
        
        new_report = {
            "report_id": report_id,
            "file_id": file_id,
            "title": title,
            "created_at": datetime.now().isoformat(),
            "tiles": [],
            "layout": {"columns": 2} # Default layout config
        }
        
        reports[report_id] = new_report
        self._save_reports(reports)
        return Report(**new_report)

    def get_report(self, report_id: str) -> Optional[Report]:
        reports = self._load_reports()
        data = reports.get(report_id)
        if data:
            return Report(**data)
        return None

    def list_reports(self, file_id: Optional[str] = None) -> List[Report]:
        reports = self._load_reports()
        # Filter by file_id if provided
        filtered_values = reports.values()
        if file_id:
            filtered_values = [r for r in reports.values() if r.get("file_id") == file_id]
        
        # Sort by created_at desc
        report_list = [Report(**r) for r in filtered_values]
        report_list.sort(key=lambda x: x.created_at, reverse=True)
        return report_list

    def add_tile(self, report_id: str, tile_data: Dict[str, Any]) -> Optional[Report]:
        reports = self._load_reports()
        if report_id not in reports:
            return None
        
        # Ensure unique tile ID if not provided
        if "tile_id" not in tile_data:
            tile_data["tile_id"] = str(uuid.uuid4())
            
        reports[report_id]["tiles"].append(tile_data)
        self._save_reports(reports)
        return Report(**reports[report_id])

    def remove_tile(self, report_id: str, tile_id: str) -> Optional[Report]:
        reports = self._load_reports()
        if report_id not in reports:
            return None
        
        reports[report_id]["tiles"] = [
            t for t in reports[report_id]["tiles"] 
            if t.get("tile_id") != tile_id
        ]
        self._save_reports(reports)
        return Report(**reports[report_id])
    
    def update_report(self, report_id: str, updates: Dict[str, Any]) -> Optional[Report]:
        reports = self._load_reports()
        if report_id not in reports:
            return None
            
        for k, v in updates.items():
            if k in reports[report_id]:
                reports[report_id][k] = v
                
        self._save_reports(reports)
        return Report(**reports[report_id])

    def delete_report(self, report_id: str) -> bool:
        reports = self._load_reports()
        if report_id in reports:
            del reports[report_id]
            self._save_reports(reports)
            return True
        return False
