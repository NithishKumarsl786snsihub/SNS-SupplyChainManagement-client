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
  const [filePreview, setFilePreview] = useState<FilePreviewState | null>(null)

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
    a.download = "catboost_sample_dataset.csv"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setIsDownloaded(true)
    setTimeout(() => setIsDownloaded(false), 2000)
  }

  const callCatBoostAPI = async (file: File) => {
    console.log('🚀 [FRONTEND] Starting CatBoost API call')
    console.log(`📁 [FRONTEND] File: ${file.name} (${file.size} bytes)`)
    
    const formData = new FormData()
    formData.append("file", file)
    
    try {
      console.log('🌐 [FRONTEND] Sending request to http://localhost:8000/api/m3/predict/')
      
      // Create AbortController for timeout handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout
      
      const response = await fetch("http://localhost:8000/api/m3/predict/", {
        method: "POST",
        body: formData,
        credentials: 'include',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      console.log(`📊 [FRONTEND] Response status: ${response.status}`)
      console.log(`📊 [FRONTEND] Response headers:`, Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ [FRONTEND] HTTP error: ${response.status}`)
        console.error(`❌ [FRONTEND] Error details: ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }
      
      console.log('📖 [FRONTEND] Parsing JSON response...')
      const result = await response.json()
      console.log('✅ [FRONTEND] API call successful')
      console.log(`📊 [FRONTEND] Response data:`, {
        count: result.count,
        model: result.model,
        status: result.status,
        predictionsCount: result.predictions?.length || 0,
        dataInfo: result.data_info
      })
      
      // Log data validation info if available
      if (result.data_info) {
        console.log(`📊 [FRONTEND] Data processing info:`, {
          totalRows: result.data_info.total_rows_processed,
          predictionsGenerated: result.data_info.predictions_generated,
          processingTime: result.data_info.processing_time_seconds,
          targetVariableHandled: result.data_info.target_variable_handled
        })
      }
      
      return result
    } catch (error) {
      console.error('❌ [FRONTEND] Error calling CatBoost API:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. The file is too large or the server is taking too long to process.')
      }
      throw error
    }
  }

  const startProcessing = async (file: File) => {
    console.log('🚀 [FRONTEND] Starting file processing')
    console.log(`📁 [FRONTEND] Processing file: ${file.name}`)
    
    // Check file size and warn user
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > 50) {
      console.warn(`⚠️ [FRONTEND] Large file detected: ${fileSizeMB.toFixed(2)}MB. Processing may take several minutes.`)
    }
    
    setIsUploading(true)
    setUploadError(null)
    setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "processing", message: `Uploading file (${fileSizeMB.toFixed(1)}MB)...` } : st)))
    
    try {
      console.log('🌐 [FRONTEND] Calling CatBoost API...')
      // Call the real CatBoost API
      const result = await callCatBoostAPI(file)
      console.log('✅ [FRONTEND] API call completed successfully')
      
      setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "completed", message: "File uploaded" } : st)))

      console.log('🔍 [FRONTEND] Starting validation step...')
      setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "processing", message: "Validating file format and columns..." } : st)))
      await new Promise((r) => setTimeout(r, 500))
      
      // Check if DailySalesQty was handled (target variable)
      const validationMessage = result.data_info?.target_variable_handled 
        ? "Validation passed (DailySalesQty column detected and handled)" 
        : "Validation passed"
      
      setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "completed", message: validationMessage } : st)))

      console.log('📊 [FRONTEND] Starting column analysis...')
      setUploadSteps((s) => s.map((st) => (st.id === "parse" ? { ...st, status: "processing", message: "Analyzing columns..." } : st)))
      await new Promise((r) => setTimeout(r, 500))
      
      // Use actual prediction results for preview
      const previewData = result.predictions?.slice(0, 5) || []
      const columns = previewData.length > 0 ? Object.keys(previewData[0]) : ['Date', 'StoreID', 'ProductID', 'PredictedDailySales', 'Confidence']
      
      console.log(`📊 [FRONTEND] Preview data: ${previewData.length} rows, ${columns.length} columns`)
      console.log(`📊 [FRONTEND] Columns: ${columns.join(', ')}`)
      
      setFilePreview({ 
        fileName: file.name, 
        fileSize: file.size, 
        rowCount: result.count || 0, 
        columnCount: columns.length, 
        columns, 
        previewData: previewData as Array<Record<string, unknown>>, 
        validationErrors: [] 
      })
      setUploadSteps((s) => s.map((st) => (st.id === "parse" ? { ...st, status: "completed", message: `${columns.length} columns detected` } : st)))

      console.log('🎯 [FRONTEND] Preparing final results...')
      setUploadSteps((s) => s.map((st) => (st.id === "ready" ? { ...st, status: "processing", message: "Preparing results..." } : st)))
      await new Promise((r) => setTimeout(r, 500))
      setUploadSteps((s) => s.map((st) => (st.id === "ready" ? { ...st, status: "completed", message: "Ready" } : st)))

      // Store the results for the results component
      console.log('💾 [FRONTEND] Storing results in session storage...')
      sessionStorage.setItem('catboost_results', JSON.stringify(result))
      console.log('✅ [FRONTEND] Results stored successfully')
      
      setIsUploading(false)
      console.log('🎉 [FRONTEND] Processing completed successfully')
      onProcessingComplete()
      
    } catch (error) {
      console.error('❌ [FRONTEND] Processing error:', error)
      setUploadError(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setUploadSteps((s) => s.map((st) => ({ ...st, status: "error" as const, message: "Processing failed" })))
      setIsUploading(false)
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
                <p className="font-medium text-gray-900">catboost_sample_dataset.csv</p>
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
            {filePreview && <div className="mt-6"><FilePreview {...filePreview} /></div>}
          </CardContent>
        </Card>
        <UploadProgress steps={uploadSteps} />
      </div>

      {uploadedFile && isUploading && (
        <LoaderSpinner 
          message={`Processing your data... ${uploadedFile.size > 50 * 1024 * 1024 ? 'Large file detected - this may take several minutes.' : ''}`} 
        />
      )}
    </>
  )
}
