"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUploadZone } from "@/components/file-upload-zone"
import { UploadProgress } from "@/components/upload-progress"
import LoaderSpinner from "@/components/ui/loader"
import axios from "axios"

interface UploadStep {
  id: string
  label: string
  status: "pending" | "processing" | "completed" | "error"
  message?: string
}

interface UploadProps {
  onProcessingComplete: (data: any) => void
  modelName: string
}

export default function Upload({ onProcessingComplete, modelName }: UploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>([
    { id: "upload", label: "File Upload", status: "pending" },
    { id: "analyze", label: "Analyzing & Forecasting", status: "pending" },
    { id: "done", label: "Ready for Results", status: "pending" },
  ])

 const startProcessing = async (file: File) => {
  setIsUploading(true)
  setUploadError(null)

  try {
    setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "processing" } : st)))
    await new Promise((r) => setTimeout(r, 700))
    setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "completed" } : st)))

    setUploadSteps((s) => s.map((st) => (st.id === "analyze" ? { ...st, status: "processing" } : st)))

    const formData = new FormData()
    formData.append("file", file)

    // ✅ Corrected endpoint
    const endpoint = "http://localhost:8000/api/prophet/prophet_forecast/"
    console.log("Calling backend:", endpoint, "file size:", file.size, "file name:", file.name)

    const response = await axios.post(endpoint, formData)

    console.log("Backend response:", response.status, response.data)
    setUploadSteps((s) => s.map((st) => (st.id === "analyze" ? { ...st, status: "completed" } : st)))
    setUploadSteps((s) => s.map((st) => (st.id === "done" ? { ...st, status: "completed" } : st)))

    onProcessingComplete(response.data)
  } catch (err: any) {
    console.error("Upload error (full):", err)
    const serverMsg = err?.response?.data?.error ?? err?.response?.data ?? err?.message
    setUploadError(String(serverMsg || "Error uploading or processing file."))
    setUploadSteps((s) => s.map((st) => (st.id === "analyze" ? { ...st, status: "error" } : st)))
  } finally {
    setIsUploading(false)
  }
}



  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    startProcessing(file)
  }

  const handleFileRemove = () => {
    setUploadedFile(null)
    setUploadError(null)
    setUploadSteps((prev) =>
      prev.map((s) => ({ ...s, status: "pending" as const, message: undefined }))
    )
  }

  return (
    <>
      <div className="mt-8 mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Data</h2>
        <p className="text-gray-600">
          Upload your CSV file. It will be analyzed and sent for forecasting with Prophet.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploadZone
              onFileUpload={handleFileUpload}
              onFileRemove={handleFileRemove}
              uploadedFile={uploadedFile}
              isUploading={isUploading}
              uploadError={uploadError}
            />
          </CardContent>
        </Card>
        <UploadProgress steps={uploadSteps} />
      </div>

      {isUploading && <LoaderSpinner message="Processing your data..." />}
    </>
  )
}
