"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import axios from "@/lib/axios"
import { FileUpload } from "@/components/file-upload"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataCleaning } from "@/components/data-cleaning"
import { ChatInterface } from "@/components/chat-interface"
import { DashboardOverview } from "@/components/dashboard-overview"
import { ProcessingState } from "@/components/processing-state"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/Navbar"
import { useActiveDataset } from "@/components/providers/active-dataset-provider"
import { toast } from "sonner"

export default function DashboardClient() {
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')
    const defaultTab = ['overview', 'preview', 'clean', 'chat'].includes(tabParam || '') ? tabParam! : 'overview'

    const { activeFileId, activeFileName, setActiveDataset, clearActiveDataset, hasActiveDataset } = useActiveDataset()
    const [metadata, setMetadata] = useState<any>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [previewRows, setPreviewRows] = useState<number>(10)
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
    const [loading, setLoading] = useState(true)

    // Handle upload completion - set active dataset in context
    const handleUploadComplete = (fid: string, meta: any) => {
        console.log('[Dashboard] Upload complete, setting active dataset:', fid)
        setActiveDataset(fid, meta.filename || 'Uploaded file')
        setMetadata(meta)
        setIsProcessing(true)
        setTimeout(() => setIsProcessing(false), 1500)
    }

    // Fetch file metadata on mount if activeFileId exists
    useEffect(() => {
        const fetchFileMetadata = async () => {
            if (!activeFileId) {
                setLoading(false)
                return
            }
            console.log('[Dashboard] Fetching metadata for active file:', activeFileId)
            try {
                const res = await axios.get(`/api/v1/files/${activeFileId}`, {
                    params: { preview_rows: previewRows }
                })
                setMetadata(res.data)
                console.log('[Dashboard] Loaded metadata for:', activeFileId)
            } catch (err: any) {
                console.error('[Dashboard] Failed to fetch file:', err)
                if (err.response?.status === 404 || err.response?.status === 410) {
                    toast.error('Dataset no longer exists. Please upload a new file.')
                    clearActiveDataset()
                }
            } finally {
                setLoading(false)
            }
        }
        fetchFileMetadata()
    }, [activeFileId, previewRows, clearActiveDataset])

    const sortedPreview = useMemo(() => {
        if (!metadata?.preview || !sortKey) return metadata?.preview || []
        const rows = [...metadata.preview]
        rows.sort((a: any, b: any) => {
            const av = a?.[sortKey]
            const bv = b?.[sortKey]
            if (av === bv) return 0
            // attempt numeric compare if both numeric
            const an = typeof av === "number" ? av : Number(av)
            const bn = typeof bv === "number" ? bv : Number(bv)
            const bothNumeric = !isNaN(an) && !isNaN(bn)
            const cmp = bothNumeric ? an - bn : String(av ?? "").localeCompare(String(bv ?? ""))
            return sortDir === "asc" ? cmp : -cmp
        })
        return rows
    }, [metadata?.preview, sortKey, sortDir])

    const handleSort = (col: string) => {
        if (sortKey === col) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
        } else {
            setSortKey(col)
            setSortDir("asc")
        }
    }

    return (
        <div className="relative overflow-hidden min-h-screen bg-surface text-slate-900">
            {/* Background effects matching landing page */}
            <div className="hero-aurora" />
            <div className="hero-orb hero-orb-1" />
            <div className="hero-orb hero-orb-2" />
            <div className="hero-orb hero-orb-3" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,144,255,0.18),transparent_25%),radial-gradient(circle_at_80%_10%,rgba(167,139,250,0.2),transparent_30%),radial-gradient(circle_at_40%_80%,rgba(94,234,212,0.16),transparent_28%)]" />

            <div className="relative z-10">
                <Navbar variant="app" hideDashboardLink />
                <div className="container mx-auto pt-24 pb-10 px-4 space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                            <p className="text-neutral-500">Manage your data and generate insights.</p>
                        </div>
                        <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
                            {metadata && (
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className="text-sm py-1">
                                        {metadata.filename}
                                    </Badge>
                                    <Badge variant="secondary" className="text-sm py-1">
                                        {metadata.rows} Rows
                                    </Badge>
                                    <Badge variant="secondary" className="text-sm py-1">
                                        {metadata.columns} Columns
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>

                    {!activeFileId ? (
                        <div className="max-w-xl mx-auto mt-20">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Upload Dataset</CardTitle>
                                    <CardDescription>
                                        Start by uploading your CSV or Excel file.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <FileUpload onUploadComplete={handleUploadComplete} />
                                </CardContent>
                            </Card>
                        </div>
                    ) : isProcessing ? (
                        <ProcessingState message="Processing your dataset" />
                    ) : (
                        <div className="flex-col space-y-4 animate-fade-in-up">
                            <Tabs defaultValue={defaultTab} className="space-y-4">
                                <TabsList>
                                    <TabsTrigger value="overview">Overview</TabsTrigger>
                                    <TabsTrigger value="preview">Data Preview</TabsTrigger>
                                    <TabsTrigger value="clean">AI Cleaning</TabsTrigger>
                                    <TabsTrigger value="chat">Analytics Chat</TabsTrigger>
                                </TabsList>

                                <TabsContent value="overview" className="space-y-4">
                                    <DashboardOverview fileId={activeFileId} />
                                </TabsContent>

                                <TabsContent value="preview" className="space-y-4">
                                    <Card>
                                        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <CardTitle>Data Preview</CardTitle>
                                                <CardDescription>Preview the first rows of your dataset.</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-sm text-neutral-600 dark:text-neutral-300">Rows:</label>
                                                <select
                                                    className="rounded-md border px-2 py-1 text-sm bg-white dark:bg-neutral-900"
                                                    value={previewRows}
                                                    onChange={(e) => setPreviewRows(Number(e.target.value))}
                                                >
                                                    {[10, 25, 50, 100].map((n) => (
                                                        <option key={n} value={n}>{n}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-[400px] w-full overflow-auto rounded-md border">
                                                <Table className="min-w-max">
                                                    <TableHeader>
                                                        <TableRow>
                                                            {metadata?.column_names && metadata.column_names.map((col: string) => (
                                                                <TableHead
                                                                    key={col}
                                                                    onClick={() => handleSort(col)}
                                                                    className="cursor-pointer select-none"
                                                                >
                                                                    <div className="flex items-center gap-1">
                                                                        <span>{col}</span>
                                                                        {sortKey === col && (
                                                                            <span className="text-xs text-neutral-500">{sortDir === "asc" ? "↑" : "↓"}</span>
                                                                        )}
                                                                    </div>
                                                                </TableHead>
                                                            ))}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {sortedPreview?.map((row: any, i: number) => (
                                                            <TableRow key={i}>
                                                                {metadata?.column_names && metadata.column_names.map((col: string) => (
                                                                    <TableCell key={col} className="whitespace-nowrap">{row[col]}</TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="clean">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Data Cleaning</CardTitle>
                                            <CardDescription>Review and apply AI suggestions.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {activeFileId && (
                                                <DataCleaning fileId={activeFileId} onCleanComplete={(newFileId) => {
                                                    toast.success("Cleaning Applied! Reloading data...")
                                                    setActiveDataset(newFileId, activeFileName || 'Cleaned file')
                                                }} />
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="chat">
                                    {activeFileId && <ChatInterface fileId={activeFileId} />}
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
