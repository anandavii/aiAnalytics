import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from schemas import Report, DashboardTile
from config import DATA_DIR, REPORTS_FILE

class ReportService:
    def __init__(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)

    def _get_user_reports_dir(self, user_id: str) -> str:
        path = os.path.join(DATA_DIR, user_id, "reports")
        os.makedirs(path, exist_ok=True)
        return path

    def _load_report_file(self, user_id: str, report_id: str) -> Optional[Dict[str, Any]]:
        path = os.path.join(self._get_user_reports_dir(user_id), f"{report_id}.json")
        try:
            with open(path, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    def _save_report_file(self, user_id: str, report: Dict[str, Any]):
        path = os.path.join(self._get_user_reports_dir(user_id), f"{report['report_id']}.json")
        with open(path, "w") as f:
            json.dump(report, f, indent=2)

    def _delete_report_file(self, user_id: str, report_id: str) -> bool:
        path = os.path.join(self._get_user_reports_dir(user_id), f"{report_id}.json")
        if os.path.exists(path):
            os.remove(path)
            return True
        return False

    def create_report(self, title: str, file_id: str, user_id: str) -> Report:
        report_id = str(uuid.uuid4())
        
        new_report = {
            "report_id": report_id,
            "file_id": file_id,
            "user_id": user_id,
            "title": title,
            "created_at": datetime.now().isoformat(),
            "tiles": [],
            "layout": {"columns": 2} 
        }
        
        self._save_report_file(user_id, new_report)
        return Report(**new_report)

    def get_report(self, report_id: str, user_id: str) -> Optional[Report]:
        data = self._load_report_file(user_id, report_id)
        if data:
            return Report(**data)
        return None

    def list_reports(self, file_id: Optional[str], user_id: str) -> List[Report]:
        reports_dir = self._get_user_reports_dir(user_id)
        report_list = []
        for filename in os.listdir(reports_dir):
            if filename.endswith(".json"):
                path = os.path.join(reports_dir, filename)
                try:
                    with open(path, "r") as f:
                        data = json.load(f)
                        # Filter by file_id if provided (and ensure user ownership implicit by directory)
                        if file_id is None or data.get("file_id") == file_id:
                            report_list.append(Report(**data))
                except Exception:
                    continue
        
        report_list.sort(key=lambda x: x.created_at, reverse=True)
        return report_list

    def add_tile(self, report_id: str, tile_data: Dict[str, Any], user_id: str) -> Optional[Report]:
        report_data = self._load_report_file(user_id, report_id)
        if not report_data:
            return None
        
        if "tile_id" not in tile_data:
            tile_data["tile_id"] = str(uuid.uuid4())
            
        report_data["tiles"].append(tile_data)
        self._save_report_file(user_id, report_data)
        return Report(**report_data)

    def remove_tile(self, report_id: str, tile_id: str, user_id: str) -> Optional[Report]:
        report_data = self._load_report_file(user_id, report_id)
        if not report_data:
            return None
        
        report_data["tiles"] = [
            t for t in report_data["tiles"] 
            if t.get("tile_id") != tile_id
        ]
        self._save_report_file(user_id, report_data)
        return Report(**report_data)
    
    def update_report(self, report_id: str, updates: Dict[str, Any], user_id: str) -> Optional[Report]:
        report_data = self._load_report_file(user_id, report_id)
        if not report_data:
            return None
            
        for k, v in updates.items():
            if k in report_data:
                report_data[k] = v
                
        self._save_report_file(user_id, report_data)
        return Report(**report_data)

    def delete_report(self, report_id: str, user_id: str) -> bool:
        return self._delete_report_file(user_id, report_id)
