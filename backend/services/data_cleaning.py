import pandas as pd
import numpy as np
from typing import List, Dict, Any
from schemas import CleaningSuggestion
from services.data_ingestion import DataIngestionService, PROCESSED_DIR
import os

class DataCleaningService:
    def __init__(self):
        self.ingestion = DataIngestionService()

    def generate_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generates a summary for the LLM."""
        return {
            "columns": df.columns.tolist(),
            "dtypes": {k: str(v) for k, v in df.dtypes.items()},
            "missing_values": df.isnull().sum().to_dict(),
            "sample_data": df.head(3).to_dict(orient='records'),
            "num_rows": len(df)
        }

    def rule_based_suggestions(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Lightweight fallback suggestions when the LLM is unavailable or returns bad JSON.
        """
        suggestions: List[Dict[str, Any]] = []

        total_rows = len(df)
        if total_rows == 0:
            return suggestions

        missing_counts = df.isnull().sum()

        # Suggest handling missing values
        for col, missing in missing_counts.items():
            if missing == 0:
                continue

            pct = (missing / total_rows) * 100
            if pct >= 40:
                suggestions.append({
                    "action": "DROP_NULLS",
                    "column": col,
                    "reason": f"{pct:.1f}% values missing in '{col}'. Dropping rows with nulls in this column."
                })
            else:
                # Choose a sensible fill strategy
                if pd.api.types.is_numeric_dtype(df[col]):
                    fill_value = "median"  # resolved at apply time
                    fill_desc = "median"
                else:
                    mode_series = df[col].mode(dropna=True)
                    fill_value = mode_series.iloc[0] if not mode_series.empty else "Unknown"
                    fill_desc = "mode"

                suggestions.append({
                    "action": "FILL_NULLS",
                    "column": col,
                    "value": fill_value,
                    "reason": f"{pct:.1f}% values missing in '{col}'. Fill using {fill_desc}."
                })

        # Suggest dropping duplicates if present
        dup_count = df.duplicated().sum()
        if dup_count > 0:
            suggestions.append({
                "action": "DROP_DUPLICATES",
                "reason": f"Detected {dup_count} duplicate rows. Remove duplicates to clean the dataset."
            })

        return suggestions

    def apply_cleaning(self, file_id: str, suggestions: List[CleaningSuggestion], user_id: str) -> str:
        """Applies cleaning suggestions and saves a new version."""
        df = self.ingestion.load_dataset(file_id, user_id)
        
        # Deep copy for safety
        df_clean = df.copy()

        for sug in suggestions:
            try:
                if sug.action == "DROP_NULLS":
                    if sug.column:
                        df_clean.dropna(subset=[sug.column], inplace=True)
                    else:
                        df_clean.dropna(inplace=True)
                
                elif sug.action == "FILL_NULLS":
                    if sug.column and sug.value is not None:
                        # Handle type conversion if needed
                        val = sug.value
                        if val == "mean":
                            val = df_clean[sug.column].mean()
                        elif val == "median":
                            val = df_clean[sug.column].median()
                        elif val == "mode":
                            val = df_clean[sug.column].mode()[0]
                        
                        df_clean[sug.column] = df_clean[sug.column].fillna(val)
                
                elif sug.action == "DROP_DUPLICATES":
                    df_clean.drop_duplicates(inplace=True)
                
                elif sug.action == "RENAME_COLUMN":
                    if sug.column and sug.value:
                         df_clean.rename(columns={sug.column: sug.value}, inplace=True)

            except Exception as e:
                print(f"Error applying suggestion {sug}: {e}")

        # Save processed file to user directory
        new_filename = f"{file_id}_cleaned.csv"
        user_processed_dir = os.path.join(PROCESSED_DIR, user_id)
        os.makedirs(user_processed_dir, exist_ok=True)
        
        save_path = os.path.join(user_processed_dir, new_filename)
        df_clean.to_csv(save_path, index=False)
        
        return f"{file_id}_cleaned"
