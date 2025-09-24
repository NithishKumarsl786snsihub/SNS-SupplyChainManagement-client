"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void
  onFileRemove: () => void
  uploadedFile: File | null
  isUploading: boolean
  uploadError: string | null
}

export function FileUploadZone({
  onFileUpload,
  onFileRemove,
  uploadedFile,
  isUploading,
  uploadError,
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const isAccepted = (file: File) => {
    const name = file.name.toLowerCase()
    const type = file.type
    return (
      name.endsWith(".csv") ||
      name.endsWith(".xml") ||
      type === "text/csv" ||
      type === "text/xml" ||
      type === "application/xml"
    )
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      const picked = files.find((file) => isAccepted(file))

      if (picked) {
        onFileUpload(picked)
      }
    },
    [onFileUpload],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && isAccepted(file)) {
        onFileUpload(file)
      }
    },
    [onFileUpload],
  )

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (uploadedFile) {
    return (
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">{uploadedFile.name}</p>
                <p className="text-sm text-green-700">{formatFileSize(uploadedFile.size)} • Uploaded successfully</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onFileRemove}
              className="border-green-300 text-green-700 hover:bg-green-100 bg-transparent"
           >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "border-2 border-dashed transition-all duration-300",
        isDragOver
          ? "border-sns-orange bg-sns-orange/5 scale-105"
          : "border-sns-orange/50 hover:border-sns-orange hover:bg-sns-orange/5",
        uploadError && "border-red-300 bg-red-50",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className="p-12 text-center">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xml,text/csv,text/xml,application/xml"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />

        <div className="space-y-4">
          <div
            className={cn(
              "mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors",
              uploadError ? "bg-red-100" : isDragOver ? "bg-sns-orange/20" : "bg-sns-yellow/20",
            )}
          >
            {uploadError ? (
              <AlertCircle className="h-8 w-8 text-red-600" />
            ) : isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sns-orange"></div>
            ) : (
              <Upload className={cn("h-8 w-8 transition-colors", isDragOver ? "text-sns-orange" : "text-sns-yellow")} />
            )}
          </div>

          <div>
            <p className={cn("text-lg font-medium mb-2", uploadError ? "text-red-900" : "text-gray-900")}> 
              {isUploading
                ? "Uploading your file..."
                : uploadError
                  ? "Upload failed"
                  : isDragOver
                    ? "Drop your CSV/XML file here"
                    : "Drag your CSV/XML file here or click to browse"}
            </p>

            {uploadError ? (
              <p className="text-sm text-red-600 mb-4">{uploadError}</p>
            ) : (
              <p className="text-gray-600 mb-4">Supports CSV or XML files up to 10MB</p>
            )}

            {!isUploading && (
              <Button
                type="button"
                className="bg-sns-orange hover:bg-sns-orange-dark text-white"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
              >
                <FileText className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
