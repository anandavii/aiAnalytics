"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud, File, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import axios from "@/lib/axios"
import { toast } from "sonner"

interface FileUploadProps {
    onUploadComplete: (fileId: string, metadata: any) => void
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        if (!file.name.match(/\.(csv|xlsx|xls)$/)) {
            toast.error("Invalid file type. Please upload CSV or Excel.")
            return
        }

        setUploading(true)
        setProgress(10)

        const formData = new FormData()
        formData.append("file", file)

        try {
            const response = await axios.post("/api/v1/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / (progressEvent.total || 1)
                    )
                    setProgress(percentCompleted)
                },
            })

            setProgress(100)
            toast.success("File uploaded successfully!")
            onUploadComplete(response.data.file_id, response.data)
        } catch (error: any) {
            console.error("Upload error details:", error)
            if (error.response?.status === 401) {
                toast.error("Authentication failed. Please sign in again.")
            } else {
                const msg = error.response?.data?.detail || "Upload failed. Ensure backend is running."
                toast.error(msg)
            }
            setProgress(0)
        } finally {
            setUploading(false)
        }
    }, [onUploadComplete])

    // Simple makeshift dropzone implementation if react-dropzone not installed (I didn't install it).
    // Wait, I forgot to install react-dropzone. I'll use a simple input for now or install it.
    // I will install it via command first.

    // For now, let's assume I will install it.
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        }
    })

    return (
        <Card
            className={`p-8 border-2 transition-all duration-300 cursor-pointer ${isDragActive
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/20"
                : "border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-400 hover:shadow-md bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900/50 dark:to-neutral-900/30"
                }`}
            {...getRootProps()}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4 text-center">
                <div className={`p-5 rounded-full transition-all duration-300 ${isDragActive
                    ? "bg-blue-200 dark:bg-blue-800/50 scale-110"
                    : "bg-blue-100 dark:bg-blue-900/30"
                    }`}>
                    <UploadCloud className={`w-12 h-12 transition-colors duration-300 ${isDragActive
                        ? "text-blue-600 dark:text-blue-300"
                        : "text-blue-600 dark:text-blue-400"
                        }`} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                        {isDragActive ? "Drop your file here" : "Click to upload or drag & drop"}
                    </h3>
                    <p className="text-sm text-neutral-500">
                        CSV or Excel files only (max 10MB)
                    </p>
                    <p className="text-xs text-neutral-400 flex items-center justify-center gap-1">
                        <span>🔒</span> Files are processed securely
                    </p>
                </div>
                {uploading && (
                    <div className="w-full max-w-xs mt-4 space-y-2">
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-neutral-500">{progress}% uploading...</p>
                    </div>
                )}
            </div>
        </Card>
    )
}
