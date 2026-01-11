import unittest
import os
import json
import sys
# adjust path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.report_service import ReportService

class TestReportService(unittest.TestCase):
    def setUp(self):
        # Use a temporary file for tests
        self.service = ReportService()
        # Override data file
        self.original_file = self.service._load_reports
        self.test_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "test_reports.json")
        
        # Monkey patch file path logic or just use a separate instance if possible?
        # Since _load_reports reads from global constant in the module, standard patch or mock is needed.
        # But for simplicity, I'll just check if I can modify the DATA_FILE location in logic.
        # Actually report_service.py defines REPORTS_FILE globally.
        # I will just write a functional test that creates a report and cleans it up.
        
    def test_create_report(self):
        report = self.service.create_report("Test Report")
        self.assertIsNotNone(report.report_id)
        self.assertEqual(report.title, "Test Report")
        
        # Verify persistence
        loaded = self.service.get_report(report.report_id)
        self.assertEqual(loaded.title, "Test Report")
        
        # Cleanup
        self.service.delete_report(report.report_id)
        
    def test_add_remove_tile(self):
        report = self.service.create_report("Tile Test")
        tile = {
            "tile_id": "t1",
            "type": "kpi",
            "title": "KPI 1",
            "data": {"value": 100}
        }
        
        updated = self.service.add_tile(report.report_id, tile)
        self.assertEqual(len(updated.tiles), 1)
        self.assertEqual(updated.tiles[0].title, "KPI 1")
        
        updated = self.service.remove_tile(report.report_id, "t1")
        self.assertEqual(len(updated.tiles), 0)
        
        self.service.delete_report(report.report_id)

    def test_list_reports(self):
        r1 = self.service.create_report("Report 1")
        r2 = self.service.create_report("Report 2")
        
        reports = self.service.list_reports()
        ids = [r.report_id for r in reports]
        self.assertIn(r1.report_id, ids)
        self.assertIn(r2.report_id, ids)
        
        self.service.delete_report(r1.report_id)
        self.service.delete_report(r2.report_id)

if __name__ == '__main__':
    unittest.main()
