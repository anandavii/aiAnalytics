import os
import shutil
import uuid
import pandas as pd
from fastapi import UploadFile, HTTPException
from typing import Dict, Any
from schemas import DatasetMetadata
from config import UPLOAD_DIR, PROCESSED_DIR

class DataIngestionService:
    def __init__(self):
        pass

    async def save_upload(self, file: UploadFile, user_id: str) -> str:
        """Saves uploaded file and returns a unique file_id."""
        file_id = str(uuid.uuid4())
        extension = os.path.splitext(file.filename)[1]
        
        # User Scoped Directory
        user_upload_dir = os.path.join(UPLOAD_DIR, user_id)
        os.makedirs(user_upload_dir, exist_ok=True)
        
        file_path = os.path.join(user_upload_dir, f"{file_id}{extension}")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return file_id, file_path

    def load_dataset(self, file_id: str, user_id: str) -> pd.DataFrame:
        """Loads dataset from disk (checks processed first, then original)."""
        
        # Search in user specific directories
        user_processed_dir = os.path.join(PROCESSED_DIR, user_id)
        user_upload_dir = os.path.join(UPLOAD_DIR, user_id)
        
        for dir_path in [user_processed_dir, user_upload_dir]:
            if not os.path.exists(dir_path):
                continue
                
            for filename in os.listdir(dir_path):
                if filename.startswith(file_id):
                    path = os.path.join(dir_path, filename)
                    if filename.endswith('.csv'):
                        try:
                            return pd.read_csv(path, encoding='utf-8')
                        except UnicodeDecodeError:
                            try:
                                return pd.read_csv(path, encoding='latin1')
                            except Exception:
                                return pd.read_csv(path, encoding='cp1252')
                    elif filename.endswith(('.xlsx', '.xls')):
                        return pd.read_excel(path)
        
        raise FileNotFoundError(f"File ID {file_id} not found for user.")

    def get_metadata(self, file_id: str, user_id: str, preview_rows: int = 5) -> DatasetMetadata:
        df = self.load_dataset(file_id, user_id)
        preview_rows = max(1, min(int(preview_rows or 5), 100))
        
        import numpy as np
        preview_df = df.head(preview_rows).copy()
        preview_df.replace([np.inf, -np.inf], np.nan, inplace=True)
        preview_df = preview_df.where(pd.notnull(preview_df), None)
        
        preview = preview_df.to_dict(orient='records')
        
        return DatasetMetadata(
            file_id=file_id,
            filename=file_id, 
            rows=len(df),
            columns=len(df.columns),
            column_names=df.columns.tolist(),
            dtypes={k: str(v) for k, v in df.dtypes.items()},
            preview=preview
        )
