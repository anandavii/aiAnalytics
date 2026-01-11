import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from services.data_ingestion import DataIngestionService

class AnalyticsEngine:
    def __init__(self):
        self.ingestion = DataIngestionService()

    def execute_plan(self, file_id: str, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a safe Analytics DSL plan on the dataset.
        NO dynamic code execution (exec/eval) is permitted.
        """
        try:
            df = self.ingestion.load_dataset(file_id)
            initial_count = len(df)
            
            # 1. Apply Filters
            if plan.get("filters"):
                df = self._apply_filters(df, plan["filters"])
            
            query_type = plan.get("query_type", "metadata")
            
            # 2. Handle Query Types
            result_data = None
            
            if query_type == "metadata":
                result_data = {
                    "row_count": len(df),
                    "column_count": len(df.columns),
                    "columns": df.columns.tolist(),
                    "initial_row_count": initial_count
                }
            
            elif query_type == "aggregation":
                result_data = self._handle_aggregation(df, plan)
                
            elif query_type == "timeseries":
                # Treat as aggregation but ensure date grouping
                result_data = self._handle_aggregation(df, plan)
                
            elif query_type == "filter":
                # Just return raw data
                result_data = self._apply_sorting_and_limit(df, plan)
                result_data = result_data.to_dict(orient='records')
            
            else:
                result_data = {"error": f"Unknown query type: {query_type}"}

            return {"result": result_data}

        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return {"error": str(e)}

    def _apply_filters(self, df: pd.DataFrame, filters: List[Dict]) -> pd.DataFrame:
        for f in filters:
            col = f.get("column")
            op = f.get("operator")
            val = f.get("value")
            
            if col not in df.columns:
                continue
            
            # Ensure safe type comparison
            try:
                if op == "equals":
                    df = df[df[col] == val]
                elif op == "not_equals":
                    df = df[df[col] != val]
                elif op == "greater_than":
                    df = df[pd.to_numeric(df[col], errors='coerce') > float(val)]
                elif op == "less_than":
                    df = df[pd.to_numeric(df[col], errors='coerce') < float(val)]
                elif op == "contains":
                    df = df[df[col].astype(str).str.contains(str(val), case=False, na=False)]
                elif op == "year_equals":
                    # Convert to datetime safely
                    temp_col = pd.to_datetime(df[col], errors='coerce')
                    df = df[temp_col.dt.year == int(val)]
            except Exception as e:
                # Log error but continue/empty result?
                print(f"Filter error on {col} {op} {val}: {e}")
                
        return df

    def _handle_aggregation(self, df: pd.DataFrame, plan: Dict) -> Any:
        metrics = plan.get("metrics", [])
        group_by = plan.get("group_by", [])
        
        if not metrics and not group_by:
             # Fallback to simple count
             return {"count": len(df)}

        # If grouping
        if group_by:
            # Validate columns exist
            valid_groups = [g for g in group_by if g in df.columns]
            if not valid_groups:
                return {"error": "Invalid group by columns"}
            
            # Build aggregation dictionary
            agg_dict = {}
            for m in metrics:
                col = m["column"]
                op = m["operation"]
                if col in df.columns:
                    # Map DSL op to pandas op
                    pd_op = "count"
                    if op == "sum": pd_op = "sum"
                    elif op == "avg": pd_op = "mean"
                    elif op == "min": pd_op = "min"
                    elif op == "max": pd_op = "max"
                    
                    agg_dict[col] = pd_op
            
            if not agg_dict:
                # If no metrics, just size()
                result_df = df.groupby(valid_groups).size().reset_index(name='count')
            else:
                result_df = df.groupby(valid_groups).agg(agg_dict).reset_index()
                # Rename aggregated columns to {op}_{col} format to match dashboard config
                rename_map = {}
                for m in metrics:
                    col = m.get("column")
                    op = m.get("operation")
                    if col and op and col in result_df.columns:
                        rename_map[col] = f"{op}_{col}"
                if rename_map:
                    result_df = result_df.rename(columns=rename_map)
            
            # Sorting limit
            result_df = self._apply_sorting_and_limit(result_df, plan)
            return result_df.to_dict(orient='records')
            
        else:
            # scalar aggregation (no group by)
            results = {}
            for m in metrics:
                col = m["column"]
                op = m["operation"]
                if col not in df.columns: continue
                
                # Coerce to numeric for math ops
                series = df[col] 
                if op in ["sum", "avg", "min", "max"]:
                    series = pd.to_numeric(series, errors='coerce')
                
                val = 0
                if op == "count": val = len(series)
                elif op == "sum": val = series.sum()
                elif op == "avg": val = series.mean()
                elif op == "min": val = series.min()
                elif op == "max": val = series.max()
                
                # Handle numpy types
                if isinstance(val, (np.integer, np.floating)):
                    val = float(val) if isinstance(val, np.floating) else int(val)
                    
                results[f"{op}_{col}"] = val
                
            return results

    def _apply_sorting_and_limit(self, df: pd.DataFrame, plan: Dict) -> pd.DataFrame:
        sort = plan.get("sort")
        limit = plan.get("limit")
        
        if sort and sort.get("column") in df.columns:
            ascending = sort.get("order") == "asc"
            df = df.sort_values(by=sort["column"], ascending=ascending)
            
        if limit and isinstance(limit, int):
            df = df.head(limit)
            
        return df
