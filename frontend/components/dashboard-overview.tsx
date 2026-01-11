"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Download, FileJson, FileImage, FileText, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

import { exportToPDF, exportToPNG } from "@/lib/export-utils"

import { ReportCanvas } from "./report/report-canvas"
import { TileSidebar } from "./report/tile-sidebar"
import { DashboardTile, Report } from "@/types/report"

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

// Format KPI values: max 2 decimals for floats, keep integers clean
function formatKpiValue(value: any): string {
    if (typeof value === 'number') {
        return Number.isInteger(value) ? String(value) : value.toFixed(2)
    }
    return String(value ?? 'N/A')
}

interface DashboardOverviewProps {
    fileId: string
}

export function DashboardOverview({ fileId }: DashboardOverviewProps) {
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState("dashboard")
    const [activeReportId, setActiveReportId] = useState<string | null>(null)
    const [addedTileIds, setAddedTileIds] = useState<string[]>([]) // Track tiles that were just added for ✓ icon feedback

    // 1. Fetch Dashboard Data
    const { data: dashboard, isLoading, error } = useQuery({
        queryKey: ["dashboard", fileId],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/dashboard/overview?file_id=${fileId}`)
            return res.data
        },
        retry: 1,
        refetchOnWindowFocus: false
    })

    // 2. Fetch or Create Default Report
    const { data: reports, refetch: refetchReports } = useQuery({
        queryKey: ["reports", fileId],
        queryFn: async () => {
            if (!fileId) return []
            const res = await axios.get(`/api/v1/reports?file_id=${fileId}`)
            return res.data as Report[]
        },
        enabled: !!fileId
    })

    const { data: activeReport, refetch: refetchActiveReport } = useQuery({
        queryKey: ["report", activeReportId],
        queryFn: async () => {
            if (!activeReportId) return null
            const res = await axios.get(`/api/v1/reports/${activeReportId}`)
            return res.data as Report
        },
        enabled: !!activeReportId,
        refetchOnMount: 'always', // Always refetch when component mounts (tab switch)
        staleTime: 0 // Consider data stale immediately for cross-component updates
    })


    // Initialize/Create report if none exists
    useEffect(() => {
        if (reports && reports.length > 0 && !activeReportId) {
            setActiveReportId(reports[0].report_id)
        } else if (reports && reports.length === 0 && !activeReportId) {
            // Create default report
            if (fileId) {
                axios.post("/api/v1/reports", { title: "My Custom Report", file_id: fileId })
                    .then(res => {
                        refetchReports()
                        setActiveReportId(res.data.report_id)
                    })
            }
        }
    }, [reports, activeReportId, refetchReports])


    // Mutations
    const addTileMutation = useMutation({
        mutationFn: async (tile: DashboardTile) => {
            if (!activeReportId) return
            await axios.post(`/api/v1/reports/${activeReportId}/tiles`, tile)
        },
        onSuccess: () => refetchActiveReport()
    })

    const removeTileMutation = useMutation({
        mutationFn: async (tileId: string) => {
            if (!activeReportId) return
            await axios.delete(`/api/v1/reports/${activeReportId}/tiles/${tileId}`)
        },
        onSuccess: () => refetchActiveReport()
    })

    const updateReportMutation = useMutation({
        mutationFn: async (payload: { tiles?: DashboardTile[], title?: string }) => {
            if (!activeReportId) return
            await axios.put(`/api/v1/reports/${activeReportId}`, payload)
        },
        onSuccess: () => refetchActiveReport()
    })


    // Build available tiles from dashboard data
    const availableTiles: DashboardTile[] = []
    if (dashboard) {
        dashboard.kpis?.forEach((kpi: any, i: number) => {
            availableTiles.push({
                tile_id: `kpi-${i}`,
                type: 'kpi',
                title: kpi.title,
                data: kpi,
                source: { file_id: fileId }
            })
        })
        dashboard.trends?.forEach((chart: any, i: number) => {
            availableTiles.push({
                tile_id: `trend-${i}`,
                type: 'chart',
                title: chart.title,
                data: chart.data,
                chart_type: chart.chart_type,
                config: chart.config,
                source: { file_id: fileId }
            })
        })
        dashboard.distributions?.forEach((chart: any, i: number) => {
            availableTiles.push({
                tile_id: `dist-${i}`,
                type: 'chart',
                title: chart.title,
                data: chart.data,
                chart_type: chart.chart_type,
                config: chart.config,
                source: { file_id: fileId }
            })
        })
    }

    // Handlers
    const handleExportPDF = async () => {
        await exportToPDF("dashboard-content", `dashboard-${fileId}`)
    }
    const handleExportPNG = async () => {
        await exportToPNG("dashboard-content", `dashboard-${fileId}`)
    }
    const handleExportJSON = () => {
        if (!dashboard) return
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dashboard, null, 2))
        const node = document.createElement('a')
        node.setAttribute("href", dataStr)
        node.setAttribute("download", `dashboard-${fileId}.json`)
        document.body.appendChild(node)
        node.click()
        node.remove()
    }

    // Handler for adding tiles to Custom Report with duplicate prevention
    const handleAddTile = (tile: DashboardTile) => {
        // Dataset isolation check - silently block cross-dataset tiles
        if (tile.source?.file_id && tile.source.file_id !== fileId) {
            return
        }

        // Duplicate check
        const existingTile = activeReport?.tiles.find(t => t.tile_id === tile.tile_id)
        if (existingTile) {
            toast.warning("Tile already added")
            return
        }

        // Perform add and show success feedback
        addTileMutation.mutate(tile, {
            onSuccess: () => {
                toast.success("Tile added to report")
                setAddedTileIds(prev => [...prev, tile.tile_id])
                setTimeout(() => {
                    setAddedTileIds(prev => prev.filter(id => id !== tile.tile_id))
                }, 2000)
            },
            onError: (error) => {
                console.error('[Tile Add Error]', tile.tile_id, tile.type, error)
                toast.error("Failed to add tile")
            }
        })
    }


    if (isLoading) return <DashboardSkeleton />
    if (error) return (
        <div className="flex flex-col items-center justify-center h-64 text-destructive gap-2 border rounded-xl bg-destructive/10">
            <AlertCircle className="w-8 h-8" />
            <span>Failed to generate dashboard. {String(error)}</span>
        </div>
    )
    if (!dashboard) return null

    return (
        <div className="h-full flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="dashboard">Data Overview</TabsTrigger>
                        <TabsTrigger value="report">Custom Report</TabsTrigger>
                    </TabsList>

                    {activeTab === "dashboard" && (
                        <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg p-1 border border-border/30 shadow-sm">
                            <span className="text-xs text-muted-foreground px-2 font-medium hidden sm:inline">Export:</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleExportPDF}
                                title="Export dashboard as PDF"
                                className="h-7 px-2.5 hover:bg-background hover:shadow-sm transition-all"
                            >
                                <FileText className="w-4 h-4 mr-1.5" /> PDF
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleExportPNG}
                                title="Export dashboard as PNG image"
                                className="h-7 px-2.5 hover:bg-background hover:shadow-sm transition-all"
                            >
                                <FileImage className="w-4 h-4 mr-1.5" /> PNG
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleExportJSON}
                                title="Export dashboard data as JSON"
                                className="h-7 px-2.5 hover:bg-background hover:shadow-sm transition-all"
                            >
                                <FileJson className="w-4 h-4 mr-1.5" /> JSON
                            </Button>
                        </div>
                    )}
                </div>

                <TabsContent value="dashboard" className="flex-1 data-[state=inactive]:hidden">
                    <div id="dashboard-content" className="space-y-6 animate-in fade-in duration-300">
                        {/* KPI Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {dashboard.kpis.map((kpi: any, i: number) => {
                                const tileId = `kpi-${i}`
                                const tile: DashboardTile = {
                                    tile_id: tileId,
                                    type: 'kpi',
                                    title: kpi.title,
                                    data: kpi,
                                    source: { file_id: fileId }
                                }
                                const isAdded = addedTileIds.includes(tileId)
                                return (
                                    <Card key={tileId} className="group relative">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="absolute right-2 top-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 hover:bg-primary hover:text-primary-foreground cursor-pointer shadow-sm"
                                            title="Move tile to Custom Report"
                                            onClick={() => handleAddTile(tile)}
                                            disabled={addTileMutation.isPending}
                                        >
                                            {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                        </Button>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold truncate" title={String(kpi.value)}>{formatKpiValue(kpi.value)}</div>
                                            <p className="text-xs text-muted-foreground line-clamp-1" title={kpi.description}>{kpi.description}</p>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>

                        {/* Charts and Content... */}
                        {/* We need to re-render charts here using ChartCard equivalent or same code */}
                        {dashboard.trends.length > 0 && (
                            <div className="grid grid-cols-1 gap-4">
                                {dashboard.trends.map((chart: any, i: number) => {
                                    const tileId = `trend-${i}`
                                    const tile: DashboardTile = {
                                        tile_id: tileId,
                                        type: 'chart',
                                        title: chart.title,
                                        data: chart.data,
                                        chart_type: chart.chart_type,
                                        config: chart.config,
                                        source: { file_id: fileId }
                                    }
                                    return (
                                        <ChartCard
                                            key={tileId}
                                            chart={chart}
                                            onAdd={() => handleAddTile(tile)}
                                            isAdded={addedTileIds.includes(tileId)}
                                            isPending={addTileMutation.isPending}
                                        />
                                    )
                                })}
                            </div>
                        )}
                        {dashboard.distributions.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {dashboard.distributions.map((chart: any, i: number) => {
                                    const tileId = `dist-${i}`
                                    const tile: DashboardTile = {
                                        tile_id: tileId,
                                        type: 'chart',
                                        title: chart.title,
                                        data: chart.data,
                                        chart_type: chart.chart_type,
                                        config: chart.config,
                                        source: { file_id: fileId }
                                    }
                                    return (
                                        <ChartCard
                                            key={tileId}
                                            chart={chart}
                                            onAdd={() => handleAddTile(tile)}
                                            isAdded={addedTileIds.includes(tileId)}
                                            isPending={addTileMutation.isPending}
                                        />
                                    )
                                })}
                            </div>
                        )}

                        {/* Data Health - keeping it simple without add button for now as it's complex */}
                        {dashboard.data_health && (
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Data Health Summary</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-6 text-sm">
                                        <div className="space-y-1">
                                            <p className="font-semibold text-muted-foreground">Row Count</p>
                                            <p className="text-xl font-bold">{dashboard.data_health.total_rows}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-muted-foreground">Duplicate Rows</p>
                                            <p className="text-xl font-bold">{dashboard.data_health.duplicate_rows}</p>
                                        </div>
                                    </div>
                                    {dashboard.data_health.null_analysis_top_5?.length > 0 && (
                                        <div className="mt-6">
                                            <p className="font-semibold mb-3 text-muted-foreground">Missing Values (Critical Columns)</p>
                                            <ul className="space-y-2">
                                                {dashboard.data_health.null_analysis_top_5.map((n: any) => (
                                                    <li key={n.column} className="flex justify-between items-center text-sm border-b pb-1 last:border-0">
                                                        <span className="font-medium">{n.column}</span>
                                                        <span className="text-muted-foreground">
                                                            {n.null_count} <span className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded ml-1">{n.null_percentage}%</span>
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="report" className="flex-1 data-[state=inactive]:hidden flex h-full gap-4 min-h-[500px]">
                    {activeReport ? (
                        <>
                            <ReportCanvas
                                report={activeReport}
                                onRemoveTile={(id) => removeTileMutation.mutate(id)}
                                onUpdateLayout={(tiles) => updateReportMutation.mutate({ tiles })}
                                onUpdateTitle={(title) => updateReportMutation.mutate({ title })}
                                fileId={fileId}
                            />
                            <div className="hidden xl:block h-full">
                                <TileSidebar
                                    availableTiles={availableTiles}
                                    onAddTile={handleAddTile}
                                    activeReport={activeReport}
                                    addedTileIds={addedTileIds}
                                    isPending={addTileMutation.isPending}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            Loading Report...
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}

function ChartCard({ chart, onAdd, isAdded, isPending }: { chart: any, onAdd: () => void, isAdded?: boolean, isPending?: boolean }) {
    if (!chart.data || chart.data.length === 0) return (
        <Card className="min-h-[300px] flex items-center justify-center text-muted-foreground">
            No data for {chart.title}
        </Card>
    )

    const xKey = chart.config.x
    const yKey = chart.config.y

    const plotData = [{
        x: chart.data.map((d: any) => d[xKey]),
        y: chart.data.map((d: any) => d[yKey]),
        type: chart.chart_type === 'line' ? 'scatter' : 'bar',
        mode: chart.chart_type === 'line' ? 'lines+markers' : undefined,
        marker: { color: '#6366f1' },
        line: { shape: 'spline' }
    }]

    return (
        <Card className="min-h-[350px] flex flex-col overflow-hidden group relative">
            <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-sm hover:bg-primary hover:text-primary-foreground cursor-pointer"
                title="Move tile to Custom Report"
                onClick={onAdd}
                disabled={isPending}
            >
                {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
            <CardHeader>
                <CardTitle className="text-lg">{chart.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 w-full min-h-[300px] p-2">
                <Plot
                    data={plotData as any}
                    layout={{
                        autosize: true,
                        margin: { l: 40, r: 20, t: 10, b: 40 },
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        showlegend: false,
                        xaxis: { automargin: true },
                        yaxis: { automargin: true }
                    }}
                    useResizeHandler={true}
                    style={{ width: "100%", height: "100%" }}
                    config={{ displayModeBar: false }}
                />
            </CardContent>
        </Card>
    )
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
            <Skeleton className="h-[350px] rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-[350px] rounded-xl" />
                <Skeleton className="h-[350px] rounded-xl" />
            </div>
        </div>
    )
}

