"use client"

import { useState } from "react"
import Papa from "papaparse"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import LoaderSpinner from "@/components/ui/loader"
import { Button } from "@/components/ui/button"

interface UploadProps {
  onProcessingComplete: (data: any[]) => void
}

export default function Upload({ onProcessingComplete }: UploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dataPreview, setDataPreview] = useState<any[]>([])

  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    setIsUploading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const normalizedColumns = results.meta.fields.map((col) => col.trim())
        const normalizedData = results.data.map((row) => {
          const newRow: any = {}
          normalizedColumns.forEach((col, idx) => {
            newRow[col] = row[results.meta.fields[idx]]
          })
          return newRow
        })
        setDataPreview(normalizedData)
        localStorage.setItem("uploadedData", Papa.unparse(normalizedData))
        setTimeout(() => {
          setIsUploading(false)
          onProcessingComplete(normalizedData)
        }, 500)
      },
      error: (err) => {
        console.error(err)
        setIsUploading(false)
      },
    })
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Your CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            className="p-2 border rounded w-full"
          />
        </CardContent>
      </Card>

      {isUploading && <LoaderSpinner fullscreen size="md" message="Processing CSV data..." />}

      {dataPreview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Uploaded Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-64">
              <table className="table-auto w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    {Object.keys(dataPreview[0]).map((key) => (
                      <th key={key} className="border px-2 py-1 text-left bg-gray-100">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataPreview.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="border px-2 py-1">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {dataPreview.length > 5 && <p className="text-sm text-gray-500 mt-1">Showing first 5 rows...</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
