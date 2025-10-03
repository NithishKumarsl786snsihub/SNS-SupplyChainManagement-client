"use client"

import { useState } from "react"
import { Download, FileText, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUploadZone } from "@/components/file-upload-zone"
import { UploadProgress } from "@/components/upload-progress"
import { FilePreview } from "@/components/file-preview"
import { DataTable } from "@/components/data-table"
import LoaderSpinner from "@/components/ui/loader"
import { Input } from "@/components/ui/input"
import type { SarimaxResult } from "./page"

interface UploadStep { 
  id: string
  label: string
  status: "pending" | "processing" | "completed" | "error"
  message?: string 
}

interface FilePreviewState { 
  fileName: string
  fileSize: number
  rowCount: number
  columnCount: number
  columns: string[]
  previewData: Array<Record<string, unknown>>
  validationErrors: string[] 
}

interface UploadProps {
  onProcessingComplete: (payload: SarimaxResult) => void
}

export default function Upload({ onProcessingComplete }: UploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [forecastMonths, setForecastMonths] = useState<number>(6)
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>([
    { id: "upload", label: "File Upload", status: "pending" },
    { id: "validate", label: "Data Validation", status: "pending" },
    { id: "parse", label: "Column Analysis", status: "pending" },
    { id: "ready", label: "Ready for Results", status: "pending" },
  ])
  const [filePreview, setFilePreview] = useState<FilePreviewState | null>(null)

  const getSampleData = () => [
    { Date: "1/1/2024", StoreID: "S001", ProductID: "P001", "Product Name": "T-Shirt Ba: T-Shirt", Category: "T-Shirt", SubCategory: "Basic", City: "Bhubanes", Region: "East", Price: 925, "Discount_Percentage": 12, Promotion: 0, "Competition_Sales": 759, Season: "Winter", "Holiday_Flag": 1, "Holiday_Name": "NewYear", "Ad_Spend": 519, "Unemployment_Rate": 6.013891, Inflation: 5.453265, Temperature: 17.388, Precipitation: 16, "Median_Income": 38921, "Competitor_Count": 15 },
    { Date: "2/1/2024", StoreID: "S001", ProductID: "P001", "Product Name": "T-Shirt Ba: T-Shirt", Category: "T-Shirt", SubCategory: "Basic", City: "Bhubanes", Region: "East", Price: 1985, "Discount_Percentage": 5, Promotion: 1, "Competition_Sales": 1977, Season: "Spring", "Holiday_Flag": 0, "Holiday_Name": "", "Ad_Spend": 2172, "Unemployment_Rate": 6.228197, Inflation: 5.907183, Temperature: 29.30521, Precipitation: 4, "Median_Income": 39225, "Competitor_Count": 18 },
    { Date: "3/1/2024", StoreID: "S001", ProductID: "P001", "Product Name": "T-Shirt Ba: T-Shirt", Category: "T-Shirt", SubCategory: "Basic", City: "Bhubanes", Region: "East", Price: 713, "Discount_Percentage": 13, Promotion: 0, "Competition_Sales": 1427, Season: "Spring", "Holiday_Flag": 0, "Holiday_Name": "", "Ad_Spend": 158, "Unemployment_Rate": 6.571115, Inflation: 5.78738, Temperature: 15.7679, Precipitation: 38, "Median_Income": 38965, "Competitor_Count": 8 },
    { Date: "4/1/2024", StoreID: "S001", ProductID: "P001", "Product Name": "T-Shirt Ba: T-Shirt", Category: "T-Shirt", SubCategory: "Basic", City: "Bhubanes", Region: "East", Price: 1245, "Discount_Percentage": 8, Promotion: 1, "Competition_Sales": 1856, Season: "Spring", "Holiday_Flag": 0, "Holiday_Name": "", "Ad_Spend": 892, "Unemployment_Rate": 6.234567, Inflation: 5.654321, Temperature: 22.4567, Precipitation: 12, "Median_Income": 39150, "Competitor_Count": 12 },
    { Date: "5/1/2024", StoreID: "S001", ProductID: "P001", "Product Name": "T-Shirt Ba: T-Shirt", Category: "T-Shirt", SubCategory: "Basic", City: "Bhubanes", Region: "East", Price: 1567, "Discount_Percentage": 15, Promotion: 0, "Competition_Sales": 2103, Season: "Summer", "Holiday_Flag": 0, "Holiday_Name": "", "Ad_Spend": 1345, "Unemployment_Rate": 6.123456, Inflation: 5.987654, Temperature: 31.2345, Precipitation: 6, "Median_Income": 39300, "Competitor_Count": 14 }
  ]

  const handleDownload = () => {
    const rows = getSampleData()
    const headers = Object.keys(rows[0])
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => String((r as Record<string, unknown>)[h])).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sarimax_sample_dataset.csv"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setIsDownloaded(true)
    setTimeout(() => setIsDownloaded(false), 2000)
  }

  const callSarimaxForecast = async (file: File, steps: number): Promise<SarimaxResult> => {
    const formData = new FormData()
    formData.append("file", file)
    if (Number.isFinite(steps) && steps > 0) {
      formData.append("steps", String(Math.floor(steps)))
    }
    formData.append("group_cols", "StoreID,ProductID")
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
    const resp = await fetch(`${base}/api/sarimax/sarimax-batch-forecast/`, {
      method: "POST",
      body: formData,
    })
    if (!resp.ok) {
      let message = "Request failed"
      try {
        type ErrorResponse = { error?: unknown }
        const data: unknown = await resp.json()
        if (data && typeof data === "object" && "error" in data) {
          const errVal = (data as ErrorResponse).error
          if (typeof errVal === "string") {
            message = errVal
          }
        } else {
          const text = await resp.text()
          if (text) message = text
        }
      } catch {
        const text = await resp.text().catch(() => "")
        if (text) message = text
      }
      throw new Error(message)
    }
    return resp.json()
  }

  const quickValidateCsvHasDate = async (file: File): Promise<{ ok: boolean; error?: string }> => {
    try {
      const text = await file.text()
      const firstLine = text.split(/\r?\n/)[0] ?? ""
      if (!firstLine) return { ok: false, error: "Empty file." }
      const headers = firstLine.split(",").map((h) => h.trim())
      const hasDate = headers.some((h) => h.toLowerCase() === "date")
      if (!hasDate) return { ok: false, error: "CSV must contain a 'date' column." }
      return { ok: true }
    } catch {
      return { ok: false, error: "Unable to read the CSV file." }
    }
  }

  const startProcessing = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)
    setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "processing", message: "Uploading file..." } : st)))

    try {
      const basicCheck = await quickValidateCsvHasDate(file)
      if (!basicCheck.ok) {
        throw new Error(basicCheck.error || "Invalid CSV format.")
      }
      const steps = Math.max(1, Math.floor((forecastMonths || 1) * 30))
      const result = await callSarimaxForecast(file, steps)
      setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "completed", message: "File uploaded" } : st)))

      setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "processing", message: "Validating file format..." } : st)))
      await new Promise((r) => setTimeout(r, 400))
      setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "completed", message: "Validation passed" } : st)))

      setUploadSteps((s) => s.map((st) => (st.id === "parse" ? { ...st, status: "processing", message: "Analyzing columns..." } : st)))
      const previewData = (result?.preview as Array<Record<string, unknown>>) ?? []
      const columns = previewData.length > 0 ? Object.keys(previewData[0]) : []
      setFilePreview({ 
        fileName: file.name, 
        fileSize: file.size, 
        rowCount: previewData.length, 
        columnCount: columns.length, 
        columns, 
        previewData, 
        validationErrors: [] 
      })
      setUploadSteps((s) => s.map((st) => (st.id === "parse" ? { ...st, status: "completed", message: `${columns.length} columns detected` } : st)))

      setUploadSteps((s) => s.map((st) => (st.id === "ready" ? { ...st, status: "processing", message: "Preparing results..." } : st)))
      await new Promise((r) => setTimeout(r, 200))
      setUploadSteps((s) => s.map((st) => (st.id === "ready" ? { ...st, status: "completed", message: "Ready" } : st)))

      // Build store->products map from the uploaded CSV
      let storeToProducts: Record<string, string[]> | undefined
      try {
        const text = await file.text()
        const lines = text.split(/\r?\n/).filter((l) => l.trim())
        if (lines.length > 1) {
          const header = lines[0].split(",")
          const storeIdx = header.findIndex((h) => h.trim() === "StoreID")
          const prodIdx = header.findIndex((h) => h.trim() === "ProductID")
          if (storeIdx >= 0 && prodIdx >= 0) {
            const map = new Map<string, Set<string>>()
            for (let i = 1; i < lines.length; i++) {
              const parts = lines[i].split(",")
              if (parts.length < Math.max(storeIdx, prodIdx) + 1) continue
              const s = parts[storeIdx]?.trim()
              const p = parts[prodIdx]?.trim()
              if (!s || !p) continue
              if (!map.has(s)) map.set(s, new Set<string>())
              map.get(s)!.add(p)
            }
            storeToProducts = Object.fromEntries(Array.from(map.entries()).map(([k, v]) => [k, Array.from(v)]))
          }
        }
      } catch {}

      // Encode the original CSV so downstream (Results) can use it for elasticity fallback
      let original_csv_base64: string | undefined
      try {
        const text = await file.text()
        original_csv_base64 = typeof window !== 'undefined' ? btoa(text) : Buffer.from(text, 'utf-8').toString('base64')
      } catch {}

      setIsUploading(false)
      onProcessingComplete({ ...result, storeToProducts, original_csv_base64 })
    } catch (err: unknown) {
      const message = typeof err === "object" && err && "message" in err ? String((err as { message?: unknown }).message) : "Upload failed"
      setUploadError(message)
      setIsUploading(false)
      setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "error", message } : st)))
    }
  }

  const handleFileUpload = (file: File) => { 
    setUploadedFile(file)
    startProcessing(file) 
  }

  const handleFileRemove = () => { 
    setUploadedFile(null)
    setFilePreview(null)
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
                <p className="font-medium text-gray-900">sarimax_sample_dataset.csv</p>
                <p className="text-sm text-gray-600">{getSampleData().length} records • 22 columns • 2.7 KB</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Data (CSV/XML)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="forecast-months" className="block text-sm font-medium text-gray-700 mb-1">Forecast horizon (months)</label>
                <Input
                  id="forecast-months"
                  type="number"
                  min={1}
                  max={12}
                  value={forecastMonths}
                  onChange={(e) => setForecastMonths(Number(e.target.value) || 1)}
                  disabled={isUploading}
                />
              </div>
            </div>
            <FileUploadZone 
              onFileUpload={handleFileUpload} 
              onFileRemove={handleFileRemove} 
              uploadedFile={uploadedFile} 
              isUploading={isUploading} 
              uploadError={uploadError} 
            />
            {filePreview && <div className="mt-6"><FilePreview {...filePreview} /></div>}
          </CardContent>
        </Card>
        <UploadProgress steps={uploadSteps} />
      </div>

      {uploadedFile && isUploading && <LoaderSpinner message="Processing your data..." />}
    </>
  )
}
