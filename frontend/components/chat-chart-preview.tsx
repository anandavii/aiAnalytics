"use client"

import { useState } from "react"
import dynamic from 'next/dynamic'
import { Button } from "@/components/ui/button"
import { Check, Plus, X } from "lucide-react"
import { StructuredChart } from "@/lib/chat-storage"
import { DashboardTile } from "@/types/report"
import { v4 as uuidv4 } from 'uuid'

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface ChatChartPreviewProps {
    chart: StructuredChart
    fileId: string
    onAddToReport: (tile: DashboardTile) => void
    onDismiss?: () => void
    isAddedToReport?: boolean
    isPending?: boolean
}

export function ChatChartPreview({
    chart,
    fileId,
    onAddToReport,
    onDismiss,
    isAddedToReport = false,
    isPending = false
}: ChatChartPreviewProps) {
    const [dismissed, setDismissed] = useState(false)

    if (dismissed) return null

    // Prepare Plotly data
    const plotData = (() => {
        if (!chart.data || chart.data.length === 0) return []

        const xValues = chart.data.map(d => d.x)
        const yValues = chart.data.map(d => d.y)

        switch (chart.chart_type) {
            case 'pie':
                return [{
                    labels: xValues,
                    values: yValues,
                    type: 'pie' as const,
                    marker: {
                        colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff']
                    }
                }]
            case 'line':
                return [{
                    x: xValues,
                    y: yValues,
                    type: 'scatter' as const,
                    mode: 'lines+markers' as const,
                    marker: { color: '#8b5cf6' },
                    line: { color: '#8b5cf6', width: 2 }
                }]
            case 'bar':
            default:
                return [{
                    x: xValues,
                    y: yValues,
                    type: 'bar' as const,
                    marker: {
                        color: '#8b5cf6',
                        line: { color: '#7c3aed', width: 1 }
                    }
                }]
        }
    })()

    const handleAddToReport = () => {
        const tile: DashboardTile = {
            tile_id: `chart_${uuidv4().slice(0, 8)}`,
            type: 'chart',
            title: chart.title,
            chart_type: chart.chart_type === 'table' ? 'bar' : chart.chart_type,
            data: chart.data,
            config: {
                x: chart.x,
                y: chart.y
            },
            source: {
                file_id: fileId
            }
        }
        onAddToReport(tile)
    }

    const handleDismiss = () => {
        setDismissed(true)
        onDismiss?.()
    }

    return (
        <div className="mt-3 rounded-xl border bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
            {/* Chart Header */}
            <div className="px-4 py-3 border-b bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-between">
                <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                    {chart.title}
                </h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 capitalize">
                    {chart.chart_type}
                </span>
            </div>

            {/* Chart Content */}
            <div className="aspect-[16/10] w-full min-h-[200px] max-h-[320px]">
                {chart.chart_type === 'table' ? (
                    <div className="p-4 overflow-auto h-full">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 font-medium">{chart.x}</th>
                                    <th className="text-right py-2 font-medium">{chart.y}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chart.data.slice(0, 10).map((row, i) => (
                                    <tr key={i} className="border-b last:border-0">
                                        <td className="py-2">{row.x}</td>
                                        <td className="py-2 text-right">{row.y}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Plot
                        data={plotData as any}
                        layout={{
                            autosize: true,
                            margin: { l: 50, r: 20, t: 20, b: 50 },
                            showlegend: false,
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            xaxis: {
                                automargin: true,
                                tickfont: { size: 11 }
                            },
                            yaxis: {
                                automargin: true,
                                tickfont: { size: 11 }
                            }
                        }}
                        useResizeHandler={true}
                        style={{ width: "100%", height: "100%" }}
                        config={{ displayModeBar: false, responsive: true }}
                    />
                )}
            </div>

            {/* Actions Row */}
            <div className="px-4 py-3 border-t bg-neutral-50 dark:bg-neutral-800/50 flex items-center gap-2">
                <Button
                    size="sm"
                    onClick={handleAddToReport}
                    disabled={isAddedToReport || isPending}
                    className={`gap-1.5 ${isAddedToReport
                            ? "bg-green-600 hover:bg-green-600 cursor-default"
                            : "bg-violet-600 hover:bg-violet-700"
                        }`}
                >
                    {isAddedToReport ? (
                        <>
                            <Check className="w-3.5 h-3.5" />
                            Added to Report
                        </>
                    ) : isPending ? (
                        "Adding..."
                    ) : (
                        <>
                            <Plus className="w-3.5 h-3.5" />
                            Add to Custom Report
                        </>
                    )}
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                    className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Dismiss
                </Button>
            </div>
        </div>
    )
}
