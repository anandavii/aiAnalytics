"use client"

import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, GripVertical, Download, FileText, FileImage, FileJson } from "lucide-react";
import { Report, DashboardTile } from "@/types/report";
import { exportToPDF, exportToPNG } from "@/lib/export-utils";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// Format KPI values: max 2 decimals for floats, keep integers clean
function formatKpiValue(value: any): string {
    if (typeof value === 'number') {
        return Number.isInteger(value) ? String(value) : value.toFixed(2)
    }
    return String(value ?? 'N/A')
}

interface ReportCanvasProps {
    report: Report;
    onRemoveTile: (tileId: string) => void;
    onUpdateLayout: (tiles: DashboardTile[]) => void;
    onUpdateTitle: (title: string) => void;
    fileId: string;
}

export const ReportCanvas: React.FC<ReportCanvasProps> = ({
    report,
    onRemoveTile,
    onUpdateLayout,
    onUpdateTitle,
    fileId
}) => {
    const [draggedTileIndex, setDraggedTileIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => {
        setDraggedTileIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedTileIndex === null || draggedTileIndex === index) return;

        const newTiles = [...report.tiles];
        const draggedTile = newTiles[draggedTileIndex];

        // Remove dragged tile
        newTiles.splice(draggedTileIndex, 1);
        // Insert at new position
        newTiles.splice(index, 0, draggedTile);

        onUpdateLayout(newTiles);
        setDraggedTileIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedTileIndex(null);
    };

    const handleExportPDF = () => exportToPDF("report-canvas", report.title || "report");
    const handleExportPNG = () => exportToPNG("report-canvas", report.title || "report");
    const handleExportJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${report.title || "report"}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950/50">
            {/* Header */}
            <div className="p-4 border-b bg-background flex justify-between items-center sticky top-0 z-10">
                <input
                    value={report.title}
                    onChange={(e) => onUpdateTitle(e.target.value)}
                    className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-2"
                    placeholder="Report Title..."
                />
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportPDF}>
                        <FileText className="w-4 h-4 mr-2" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPNG}>
                        <FileImage className="w-4 h-4 mr-2" /> PNG
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportJSON}>
                        <FileJson className="w-4 h-4 mr-2" /> JSON
                    </Button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto p-8" >
                <div
                    id="report-canvas"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 bg-white dark:bg-slate-900 min-h-[800px] shadow-sm rounded-lg border"
                >
                    {report.tiles.length === 0 && (
                        <div className="col-span-full flex items-center justify-center text-muted-foreground h-64 border-2 border-dashed rounded-lg">
                            Drag and drop tiles here or add from the sidebar
                        </div>
                    )}

                    {report.tiles.map((tile, index) => {
                        // Safety Check: Data Isolation
                        if (tile.source?.file_id && tile.source.file_id !== fileId) {
                            console.warn(`[Security] Blocked tile from different dataset: ${tile.source.file_id} (expected ${fileId})`)
                            return null
                        }

                        return (
                            <div
                                key={tile.tile_id}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`relative group bg-card border rounded-lg shadow-sm transition-all duration-200
                  ${draggedTileIndex === index ? 'opacity-50 scale-95' : 'opacity-100'}
                  ${tile.type === 'kpi' ? 'col-span-1 h-36' : 'col-span-full h-[400px]'}
              `}
                            >
                                {/* Controls */}
                                <div className="absolute right-2 top-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <div className="cursor-grab p-1 hover:bg-muted rounded text-muted-foreground active:cursor-grabbing">
                                        <GripVertical className="w-4 h-4" />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                        onClick={() => onRemoveTile(tile.tile_id)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Content */}
                                <div className={`h-full w-full ${tile.type === 'kpi' ? 'overflow-visible' : 'overflow-hidden'}`}>
                                    {tile.type === 'kpi' ? (
                                        <div className="p-6 flex flex-col min-h-full">
                                            <h3 className="text-sm font-medium text-muted-foreground">{tile.title}</h3>
                                            <div className="text-3xl font-bold mt-2">{formatKpiValue(tile.data?.value)}</div>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tile.data?.description}</p>
                                        </div>
                                    ) : tile.type === 'chart' ? (
                                        <div className="flex flex-col h-full">
                                            <div className="p-4 border-b">
                                                <h3 className="font-semibold">{tile.title}</h3>
                                            </div>
                                            <div className="flex-1 p-2 min-h-0">
                                                <ReportChart tile={tile} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4">
                                            <h3 className="font-semibold">{tile.title}</h3>
                                            <div className="mt-2 text-sm text-muted-foreground">
                                                {JSON.stringify(tile.data)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

const ReportChart = ({ tile }: { tile: DashboardTile }) => {
    if (!tile.data || !Array.isArray(tile.data) || tile.data.length === 0) {
        return <div className="h-full flex items-center justify-center text-muted-foreground">No Data</div>;
    }

    const xKey = tile.config?.x || 'x';
    const yKey = tile.config?.y || 'y';

    // Check if data uses standard x/y format (from chat charts) or column-keyed format (from overview)
    const firstItem = tile.data[0];
    const useDirectXY = 'x' in firstItem && 'y' in firstItem && !(xKey in firstItem);

    // Extract x and y values based on data format
    const xValues = useDirectXY
        ? tile.data.map((d: any) => d.x)
        : tile.data.map((d: any) => d[xKey]);
    const yValues = useDirectXY
        ? tile.data.map((d: any) => d.y)
        : tile.data.map((d: any) => d[yKey]);

    // Validate we have actual data
    if (xValues.every((v: any) => v === undefined) || yValues.every((v: any) => v === undefined)) {
        console.warn('[ReportChart] Missing data for chart tile:', tile.tile_id, { xKey, yKey, data: tile.data });
        return <div className="h-full flex items-center justify-center text-muted-foreground">Chart data format error</div>;
    }

    const plotData = [{
        x: xValues,
        y: yValues,
        type: tile.chart_type === 'line' ? 'scatter' : 'bar',
        mode: tile.chart_type === 'line' ? 'lines+markers' : undefined,
        marker: { color: '#6366f1' },
    }];

    return (
        <Plot
            data={plotData as any}
            layout={{
                autosize: true,
                margin: { l: 40, r: 20, t: 10, b: 40 },
                showlegend: false,
                xaxis: { automargin: true },
                yaxis: { automargin: true }
            }}
            useResizeHandler={true}
            style={{ width: "100%", height: "100%" }}
            config={{ displayModeBar: false }}
        />
    );
}

