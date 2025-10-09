
"use client"

import { useState } from "react"
import { Download, FileText, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUploadZone } from "@/components/file-upload-zone"
import LoaderSpinner from "@/components/ui/loader"
import { DataTable } from "@/components/data-table"

interface UploadStep { 
  id: string
  label: string
  status: "pending" | "processing" | "completed" | "error"
  message?: string 
}

// (Preview suppressed during upload; table preview still available for sample dataset)

type XGBPredictionRow = {
  StoreID: string
  ProductID: string
  Date: string
  PredictedMonthlyDemand: number
}

type XGBApiResponse = {
  count: number
  predictions: XGBPredictionRow[]
}

interface UploadProps {
  onProcessingComplete: (response: XGBApiResponse, categoryMap: Record<string, string>, contextMap: Record<string, Record<string, unknown>>) => void
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
  // Preview state removed per spec (show UploadProgress instead)

  // Required headers (exact match) based on backend sample_input.csv
  const requiredHeaders = [
    "Date",
    "StoreID",
    "ProductID",
    "ProductName",
    "Category",
    "SubCategory",
    "City",
    "Region",
    "Price",
    "DiscountPct",
    "PromotionFlag",
    "CompetitionPrice",
    "Season",
    "HolidayFlag",
    "HolidayName",
    "AdSpend",
    "UnemploymentRate",
    "Inflation",
    "Temperature",
    "Precipitation",
    "MedianIncome",
    "CompetitorStoresNearby",
  ] as const

  type RequiredHeader = typeof requiredHeaders[number]

  // Sample dataset used in the Dataset Preview card and for sample CSV download
  const getSampleData = (): Array<Record<RequiredHeader, unknown>> => [
    {
      Date: "2024-01-01",
      StoreID: "S001",
      ProductID: "P001",
      ProductName: "T-Shirt Basic",
      Category: "T-Shirt",
      SubCategory: "Basic",
      City: "Bhubaneswar",
      Region: "East",
      Price: 925,
      DiscountPct: 12,
      PromotionFlag: 0,
      CompetitionPrice: 759,
      Season: "Winter",
      HolidayFlag: 0,
      HolidayName: "",
      AdSpend: 519,
      UnemploymentRate: 6.013890880411348,
      Inflation: 5.453264869089431,
      Temperature: 17.38800277190036,
      Precipitation: 16,
      MedianIncome: 38921,
      CompetitorStoresNearby: 15,
    },
    {
      Date: "2024-02-01",
      StoreID: "S001",
      ProductID: "P001",
      ProductName: "T-Shirt Basic",
      Category: "T-Shirt",
      SubCategory: "Basic",
      City: "Bhubaneswar",
      Region: "East",
      Price: 1985,
      DiscountPct: 5,
      PromotionFlag: 0,
      CompetitionPrice: 1977,
      Season: "Winter",
      HolidayFlag: 0,
      HolidayName: "",
      AdSpend: 2172,
      UnemploymentRate: 6.228196763887352,
      Inflation: 5.907182589647006,
      Temperature: 29.305207652983846,
      Precipitation: 4,
      MedianIncome: 39225,
      CompetitorStoresNearby: 18,
    },
  ]

  const handleDownload = () => {
    const rows = getSampleData()
    const headers = Object.keys(rows[0])
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => String((r as Record<string, unknown>)[h])).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "xgboost_sample_dataset.csv"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setIsDownloaded(true)
    setTimeout(() => setIsDownloaded(false), 2000)
  }

  // Use our hosted sample CSV from Cloudinary
  const handleUseOurData = async () => {
    try {
      setUploadError(null)
      setIsUploading(true)
      setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "processing", message: "Fetching sample CSV..." } : st)))

      const url = "https://res.cloudinary.com/dka0p2eln/raw/upload/v1759838223/xgboost_sample_input_bwigwy.csv"
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)
      const resp = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (!resp.ok) {
        throw new Error(`Failed to download sample CSV (${resp.status})`)
      }
      const blob = await resp.blob()
      const file = new File([blob], "xgboost_sample_input.csv", { type: "text/csv" })

      // Early header validation like manual upload
      const validation = await validateCsvHeaders(file)
      if (!validation.ok) {
        setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "error", message: validation.error } : st)))
        setIsUploading(false)
        setUploadError(validation.error ?? "Invalid CSV headers")
        return
      }

      // Set as the uploaded file and continue the normal flow
      setUploadedFile(file)
      setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "completed", message: "Headers verified" } : st)))
      await startProcessing(file)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to fetch sample CSV"
      setUploadError(msg)
      setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "error", message: msg } : st)))
      setIsUploading(false)
    }
  }

  const validateCsvHeaders = async (file: File): Promise<{ ok: boolean; error?: string }> => {
    try {
      const text = await file.text()
      const firstLine = text.split(/\r?\n/)[0] ?? ""
      const incoming = firstLine.split(",").map((h) => h.trim())
      const required = [...requiredHeaders]

      const missing = required.filter((h) => !incoming.includes(h))
      const extra = incoming.filter((h) => !required.includes(h as RequiredHeader))

      if (missing.length > 0) {
        return { ok: false, error: `Missing required columns: ${missing.join(", ")}` }
      }
      if (extra.length > 0) {
        return { ok: false, error: `Unexpected columns present: ${extra.join(", ")}` }
      }
      // Also enforce exact order match to avoid mapping ambiguity
      const orderMatches = required.every((h, idx) => incoming[idx] === h)
      if (!orderMatches) {
        return { ok: false, error: "Column order must exactly match the template sample." }
      }
      return { ok: true }
    } catch {
      return { ok: false, error: "Unable to read the CSV file for validation." }
    }
  }

  const uploadToBackend = async (file: File): Promise<XGBApiResponse> => {
    const formData = new FormData()
    formData.append("file", file)
    const resp = await fetch("http://127.0.0.1:8000/api/m1/", {
      method: "POST",
      body: formData,
    })
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "")
      throw new Error(errText || `Upload failed with status ${resp.status}`)
    }
    return (await resp.json()) as XGBApiResponse
  }

  const startProcessing = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)
    setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "processing", message: "Uploading file..." } : st)))
    let apiResponse: XGBApiResponse | null = null
    try {
      apiResponse = await uploadToBackend(file)
      setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "completed", message: "File uploaded" } : st)))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to upload"
      setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "error", message: msg } : st)))
      setIsUploading(false)
      setUploadError(msg)
      return
    }

    setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "processing", message: "Validating file format..." } : st)))
    const validation = await validateCsvHeaders(file)
    await new Promise((r) => setTimeout(r, 300))
    if (!validation.ok) {
      setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "error", message: validation.error } : st)))
      setIsUploading(false)
      setUploadError(validation.error ?? "Validation failed")
      return
    }
    setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "completed", message: "Validation passed" } : st)))

    setUploadSteps((s) => s.map((st) => (st.id === "parse" ? { ...st, status: "processing", message: "Analyzing response..." } : st)))
    // skip file preview; rely on progress component
    setUploadSteps((s) => s.map((st) => (st.id === "parse" ? { ...st, status: "completed", message: `${apiResponse?.count || 0} predictions` } : st)))

    setUploadSteps((s) => s.map((st) => (st.id === "ready" ? { ...st, status: "processing", message: "Preparing results..." } : st)))
    await new Promise((r) => setTimeout(r, 1200))
    setUploadSteps((s) => s.map((st) => (st.id === "ready" ? { ...st, status: "completed", message: "Ready" } : st)))

    // Build (StoreID, ProductID) -> Category map and full context map from the uploaded CSV on the client
    const categoryMap: Record<string, string> = {}
    const contextMap: Record<string, Record<string, unknown>> = {}
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
      const header = (lines[0] || "").split(",")
      const storeIdx = header.indexOf("StoreID")
      const productIdx = header.indexOf("ProductID")
      const categoryIdx = header.indexOf("Category")
      const dateIdx = header.indexOf("Date")
      if (storeIdx >= 0 && productIdx >= 0 && categoryIdx >= 0) {
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",")
          if (parts.length !== header.length) continue
          const store = parts[storeIdx]?.trim()
          const product = parts[productIdx]?.trim()
          const category = parts[categoryIdx]?.trim()
          const date = dateIdx >= 0 ? parts[dateIdx]?.trim() : undefined
          if (store && product && category) {
            const key = `${store}::${product}`
            if (!categoryMap[key]) categoryMap[key] = category
          }
          // Build full context map keyed by StoreID::ProductID::Date
          if (store && product && date) {
            const ctxKey = `${store}::${product}::${date}`
            if (!contextMap[ctxKey]) {
              const obj: Record<string, unknown> = {}
              for (let c = 0; c < header.length; c++) {
                const col = header[c]
                let val: unknown = parts[c]
                // best-effort numeric parse for numeric-like fields
                if ([
                  "Price","DiscountPct","PromotionFlag","CompetitionPrice","HolidayFlag","AdSpend","UnemploymentRate","Inflation","Temperature","Precipitation","MedianIncome","CompetitorStoresNearby"
                ].includes(col)) {
                  const num = Number(parts[c])
                  val = Number.isFinite(num) ? num : parts[c]
                }
                obj[col] = (val ?? "").toString() === "" ? "" : val
              }
              contextMap[ctxKey] = obj
            }
          }
        }
      }
    } catch {}

    setIsUploading(false)
    if (apiResponse) {
      onProcessingComplete(apiResponse, categoryMap, contextMap)
    }
  }

  const handleFileUpload = async (file: File) => { 
    setUploadedFile(file)
    setUploadError(null)
    // Early header validation before starting processing
    setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "processing", message: "Checking headers..." } : st)))
    const validation = await validateCsvHeaders(file)
    if (!validation.ok) {
      setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "error", message: validation.error } : st)))
      setUploadError(validation.error ?? "Invalid CSV headers")
      return
    }
    setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "completed", message: "Headers verified" } : st)))
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
                <p className="font-medium text-gray-900">xgboost_sample_dataset.csv</p>
                  <p className="text-sm text-gray-600">{getSampleData().length} records • {Object.keys(getSampleData()[0]).length} columns</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleUseOurData} variant="outline" className="border-sns-orange text-sns-orange hover:bg-sns-orange/10">
                Use our data
              </Button>
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

      <div className="grid grid-cols-1 gap-8 mb-10">
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
            {isUploading && (
              <LoaderSpinner 
                fullscreen
                showStepper 
                message="Processing your data..." 
                steps={uploadSteps.map(s => s.label)}
                step={uploadSteps.findIndex(s => s.status === "processing")}
                size="md"
                background="#fdfaf6"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}