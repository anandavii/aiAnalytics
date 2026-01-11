export type TileType = 'kpi' | 'chart' | 'table' | 'text';

export interface DashboardTile {
    tile_id: string;
    type: TileType;
    title: string;
    data?: any; // Dynamic data for charts/tables
    chart_type?: 'bar' | 'line' | 'pie' | 'scatter' | null;
    config?: any; // Layout or specific chart config
    source?: {
        file_id?: string;
        query?: string;
    };
}

export interface Report {
    report_id: string;
    title: string;
    created_at: string;
    tiles: DashboardTile[];
    layout?: any;
}
