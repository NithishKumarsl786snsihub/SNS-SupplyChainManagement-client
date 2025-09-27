"use client"

import { useState } from "react"
import axios from 'axios'
import { Download, FileText, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUploadZone } from "@/components/file-upload-zone"
import { UploadProgress } from "@/components/upload-progress"
import { DataTable } from "@/components/data-table"
import LoaderSpinner from "@/components/ui/loader"

interface UploadStep { 
  id: string
  label: string
  status: "pending" | "processing" | "completed" | "error"
  message?: string 
}

interface UploadProps {
  onProcessingComplete: () => void
}

export default function Upload({ onProcessingComplete }: UploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>([
    { id: "upload", label: "File Upload", status: "pending" },
    { id: "validate", label: "Data Validation", status: "pending" },
    { id: "parse", label: "Column Analysis", status: "pending" },
    { id: "ready", label: "Ready for Results", status: "pending" },
  ])

  // Sample dataset used in the Dataset Preview card
  const getSampleData = () => [
    { Date: "2024-01-01", Demand: 1300, Price: 30, "Inventory Level": 5200, "Seasonal Factor": 1.3, Promotional: 0 },
    { Date: "2024-01-02", Demand: 1220, Price: 30, "Inventory Level": 5050, "Seasonal Factor": 1.3, Promotional: 0 },
    { Date: "2024-01-03", Demand: 1380, Price: 28, "Inventory Level": 4900, "Seasonal Factor": 1.3, Promotional: 1 },
  ]

  const handleDownload = () => {
    const rows = getSampleData()
    const headers = Object.keys(rows[0])
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => String((r as Record<string, unknown>)[h])).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "lightgbm_sample_dataset.csv"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setIsDownloaded(true)
    setTimeout(() => setIsDownloaded(false), 2000)
  }

  type UploadMeta = { columnsCount: number; rowsCount: number; hasRequired: boolean }

  const uploadFileToBackend = async (file: File): Promise<{ meta: UploadMeta; datasetInfo: any; trainingResult: any; analyzeResult: any }> => {
    const formData = new FormData()
    formData.append('csv_file', file)

    const res = await axios.post('http://localhost:8000/api/m2/upload-train/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    const datasetInfo = res.data.dataset_info
    const trainingResult = res.data.training_result

    // Run one-shot analysis for metrics/forecasts/pricing
    const resAnalyze = await axios.post('http://localhost:8000/api/m2/analyze/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const analyzeResult = resAnalyze.data

    const text = await file.text()
    const lines = text.trim().split(/\r?\n/)
    const headers = lines[0]?.split(',') ?? []
    const hasRequired = ['date','category','sku','units_sold','price_unit'].every(h => headers.includes(h))
    const rowsCount = Math.max(lines.length - 1, 0)
    return { meta: { columnsCount: headers.length, rowsCount, hasRequired }, datasetInfo, trainingResult, analyzeResult }
  }

  const startProcessing = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)
    setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "processing", message: "Uploading file..." } : st)))
    try {
      const { meta, datasetInfo, trainingResult, analyzeResult } = await uploadFileToBackend(file)
      setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "completed", message: "File uploaded" } : st)))

      setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "processing", message: "Validating file format..." } : st)))
      await new Promise((r) => setTimeout(r, 400))
      setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: meta.hasRequired ? "completed" : "error", message: meta.hasRequired ? "Validation passed" : "Missing required columns: date, category, sku, units_sold, price_unit" } : st)))

      setUploadSteps((s) => s.map((st) => (st.id === "parse" ? { ...st, status: "processing", message: "Analyzing columns..." } : st)))
      await new Promise((r) => setTimeout(r, 400))
      setUploadSteps((s) => s.map((st) => (st.id === "parse" ? { ...st, status: "completed", message: `${meta.columnsCount} columns detected` } : st)))

      // Persist to session for results page
      try {
        sessionStorage.setItem('m2_lightgbm_dataset_info', JSON.stringify(datasetInfo))
        sessionStorage.setItem('m2_lightgbm_training_result', JSON.stringify(trainingResult))
        sessionStorage.setItem('m2_lightgbm_analyze_result', JSON.stringify(analyzeResult))
      } catch {}

      setUploadSteps((s) => s.map((st) => (st.id === "ready" ? { ...st, status: "processing", message: "Preparing results..." } : st)))
      await new Promise((r) => setTimeout(r, 400))
      setUploadSteps((s) => s.map((st) => (st.id === "ready" ? { ...st, status: "completed", message: "Ready" } : st)))
      onProcessingComplete()
    } catch (e) {
      setUploadError('Upload failed')
      setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "error", message: "Upload failed" } : st)))
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
    setUploadSteps((prev) => prev.map((s) => ({ ...s, status: "pending" as const, message: undefined }))) 
  }

  return (
    <>
      <div id="dataset" className="scroll-mt-28 mt-12 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dataset Preview</h2>
        <p className="text-gray-600">Review the sample dataset structure and download it to understand the required format for your data.</p>
      </div>

      <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur ring-1 ring-[#F3E9DC] shadow-[0_10px_30px_rgba(217,111,50,0.06)] mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#D96F32]" />
            Download Sample Dataset
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-[#F3E9DC]/50 rounded-lg mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">lightgbm_sample_dataset.csv</p>
                <p className="text-sm text-gray-600">{getSampleData().length} records • 6 columns • 2.1 KB</p>
              </div>
            </div>
            <Button onClick={handleDownload} className="bg-[#D96F32] hover:bg-[#C75D2C] text-white" disabled={isDownloaded}>
              {isDownloaded ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Downloaded
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </>
              )}
            </Button>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-medium text-gray-900">Instructions:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Use this sample as a template for your own data</li>
              <li>Maintain the same column structure and data types</li>
              <li>Ensure your data covers sufficient historical periods</li>
              <li>Remove or replace sample data with your actual values</li>
            </ul>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Example Dataset Preview</h3>
            <div>
              <DataTable data={getSampleData()} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Data</h2>
        <p className="text-gray-600">Upload your CSV file containing supply chain data. We&apos;ll validate the format and prepare it for forecasting with your selected LightGBM model.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Data (CSV/XML)</CardTitle>
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

      {uploadedFile && isUploading && <LoaderSpinner message="Processing your data..." />}
    </>
  )
}
