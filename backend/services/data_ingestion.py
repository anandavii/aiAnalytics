import os
import shutil
import uuid
import pandas as pd
from fastapi import UploadFile, HTTPException
from typing import Dict, Any
from schemas import DatasetMetadata

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./data/original")
PROCESSED_DIR = os.getenv("PROCESSED_DIR", "./data/processed")

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

class DataIngestionService:
    def __init__(self):
        pass

    async def save_upload(self, file: UploadFile) -> str:
        """Saves uploaded file and returns a unique file_id."""
        file_id = str(uuid.uuid4())
        extension = os.path.splitext(file.filename)[1]
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}{extension}")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return file_id, file_path

    def load_dataset(self, file_id: str) -> pd.DataFrame:
        """Loads dataset from disk (checks processed first, then original)."""
        # Simple lookup logic
        # Try finding in processed (needs extension)
        # For V1, we simply iterate or assume extension. 
        # To keep it simple, we search for the file with the ID.
        
        for dir_path in [PROCESSED_DIR, UPLOAD_DIR]:
            for filename in os.listdir(dir_path):
                if filename.startswith(file_id):
                    path = os.path.join(dir_path, filename)
                    if filename.endswith('.csv'):
                        # Robust CSV reading with encoding fallback
                        try:
                            return pd.read_csv(path, encoding='utf-8')
                        except UnicodeDecodeError:
                            try:
                                return pd.read_csv(path, encoding='latin1')
                            except Exception:
                                return pd.read_csv(path, encoding='cp1252')
                    elif filename.endswith(('.xlsx', '.xls')):
                        return pd.read_excel(path)
        
        raise FileNotFoundError(f"File ID {file_id} not found.")

    def get_metadata(self, file_id: str, preview_rows: int = 5) -> DatasetMetadata:
        df = self.load_dataset(file_id)
        preview_rows = max(1, min(int(preview_rows or 5), 100))  # clamp to 1-100 rows for safety
        
        # Determine original filename if possible (mocked for now or stored in DB)
        # MVP: just return file_id as filename
        
        # Handle Inf/Nan for JSON serialization (Replace with None, which maps to null)
        # Using specific replacement to avoid future warnings
        import numpy as np
        preview_df = df.head(preview_rows).copy()
        preview_df.replace([np.inf, -np.inf], np.nan, inplace=True)
        preview_df = preview_df.where(pd.notnull(preview_df), None)
        
        preview = preview_df.to_dict(orient='records')
        
        return DatasetMetadata(
            file_id=file_id,
            filename=file_id, # In a real app, we'd look up the original name
            rows=len(df),
            columns=len(df.columns),
            column_names=df.columns.tolist(),
            dtypes={k: str(v) for k, v in df.dtypes.items()},
            preview=preview
        )
