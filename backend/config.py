import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Base directory is the backend folder
BACKEND_DIR = Path(__file__).resolve().parent
# Project root is one level up
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"

# Subdirectories
UPLOAD_DIR = DATA_DIR / "original"
PROCESSED_DIR = DATA_DIR / "processed"
REPORTS_FILE = DATA_DIR / "reports.json"

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)
