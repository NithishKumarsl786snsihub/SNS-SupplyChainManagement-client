"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, AlertTriangle, CheckCircle } from "lucide-react"

type RowRecord = Record<string, unknown>

interface FilePreviewProps {
  fileName: string
  fileSize: number
  rowCount: number
  columnCount: number
  columns: string[]
  previewData: Array<RowRecord>
  validationErrors: string[]
}

export function FilePreview({
  fileName,
  fileSize,
  rowCount,
  columnCount,
  columns,
  previewData,
  validationErrors,
}: FilePreviewProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const hasErrors = validationErrors.length > 0

  return (
    <div className="space-y-6">
      {/* File Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-sns-orange" />
            File Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">File Name</p>
              <p className="font-medium text-gray-900">{fileName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">File Size</p>
              <p className="font-medium text-gray-900">{formatFileSize(fileSize)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Rows</p>
              <p className="font-medium text-gray-900">{rowCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Columns</p>
              <p className="font-medium text-gray-900">{columnCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Status */}
      <Card className={hasErrors ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {hasErrors ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${hasErrors ? "text-red-900" : "text-green-900"}`}>
                {hasErrors ? "Validation Issues Found" : "File Validation Passed"}
              </p>
              {hasErrors && (
                <ul className="text-sm text-red-700 mt-2 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Information */}
      <Card>
        <CardHeader>
          <CardTitle>Detected Columns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {columns.map((column, index) => (
              <Badge key={index} variant="outline" className="border-sns-orange text-sns-orange">
                {column}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Preview (First 5 rows)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-sns-cream/50">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-sns-cream/20"}>
                    {columns.map((column) => (
                      <td key={column} className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100">
                        {String((row as RowRecord)[column] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
