"use client"

import { useState } from "react"
import { Download, FileText, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUploadZone } from "@/components/file-upload-zone"
// Removed UploadProgress in favor of dedicated processing loader page
import { FilePreview } from "@/components/file-preview"
import { DataTable } from "@/components/data-table"
// Removed legacy inline loader; we navigate to processing screen after upload

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
  onProcessingProgress?: (step: number) => void
  onProcessingFinished?: () => void
  onProcessingError?: (message: string) => void
}

export default function Upload({ onProcessingComplete, onProcessingProgress, onProcessingFinished, onProcessingError }: UploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [forecastDays, setForecastDays] = useState<number>(30)
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
    formData.append("forecast_days", String(forecastDays))
    
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
        dataInfo: result.data_info,
        hasFutureForecast: Boolean(result.future_forecast)
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
    // Immediately show the processing loader screen (no delay)
    onProcessingComplete()
    if (onProcessingProgress) onProcessingProgress(0)
    
    try {
      console.log('🌐 [FRONTEND] Calling CatBoost API...')
      if (onProcessingProgress) onProcessingProgress(1)
      // Call the real CatBoost API
      const result = await callCatBoostAPI(file)
      console.log('✅ [FRONTEND] API call completed successfully')
      if (onProcessingProgress) onProcessingProgress(2)
      
      // Use actual prediction results for preview
      const previewData = result.predictions?.slice(0, 5) || []
      const columns = previewData.length > 0 ? Object.keys(previewData[0]) : ['Date', 'StoreID', 'ProductID', 'PredictedDailySales', 'Confidence']
      
      console.log(`📊 [FRONTEND] Preview data: ${previewData.length} rows, ${columns.length} columns`)
      console.log(`📊 [FRONTEND] Columns: ${columns.join(', ')}`)
      console.log(`📊 [FRONTEND] Total predictions: ${result.predictions?.length || 0}`)
      
      // Log unique stores and products for debugging
      if (result.predictions && result.predictions.length > 0) {
        const uniqueStores = [...new Set(result.predictions.map((p: { StoreID: string }) => p.StoreID))].sort()
        const uniqueProducts = [...new Set(result.predictions.map((p: { ProductID: string }) => p.ProductID))].sort()
        console.log(`🏪 [FRONTEND] Unique stores: ${uniqueStores.length} - ${uniqueStores.join(', ')}`)
        console.log(`📦 [FRONTEND] Unique products: ${uniqueProducts.length} - ${uniqueProducts.join(', ')}`)
      }
      
      setFilePreview({ 
        fileName: file.name, 
        fileSize: file.size, 
        rowCount: result.count || 0, 
        columnCount: columns.length, 
        columns, 
        previewData: previewData as Array<Record<string, unknown>>, 
        validationErrors: [] 
      })

      // Store the results for the results component
      console.log('💾 [FRONTEND] Storing results in session storage...')
      
      // Also store the original CSV data for product-specific forecasting
      try {
        const csvText = await file.text()
        const originalCsvData = {
          content: csvText,
          fileName: file.name,
          size: file.size
        }
        sessionStorage.setItem('catboost_original_data', JSON.stringify(originalCsvData))
        console.log('💾 [FRONTEND] Original CSV data stored for product-specific forecasting')
      } catch (error) {
        console.warn('⚠️ [FRONTEND] Could not store original CSV data:', error)
      }
      
      sessionStorage.setItem('catboost_results', JSON.stringify(result))
      console.log('✅ [FRONTEND] Results stored successfully')
      
      setIsUploading(false)
      console.log('🎉 [FRONTEND] Processing completed successfully')
      if (onProcessingProgress) onProcessingProgress(3)
      if (onProcessingFinished) onProcessingFinished()
      
    } catch (error) {
      console.error('❌ [FRONTEND] Processing error:', error)
      setUploadError(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsUploading(false)
    }
  }

  const handleFileUpload = (file: File) => { 
    if (!file || file.size === 0) {
      if (onProcessingError) onProcessingError('No dataset detected. Please upload a valid CSV file and try again.')
      return
    }
    setUploadedFile(file)
    startProcessing(file) 
  }

  const handleFileRemove = () => { 
    setUploadedFile(null)
    setFilePreview(null)
    setUploadError(null)
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

      <div className="grid grid-cols-1 gap-8 mb-10">
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Data (CSV/XML)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-sm text-gray-700 mb-2">Forecast horizon</div>
              <div className="flex gap-2">
                <Button type="button" variant={forecastDays === 30 ? "default" : "outline"} onClick={() => setForecastDays(30)} className={forecastDays === 30 ? "bg-[#D96F32] hover:bg-[#C75D2C] text-white" : ""}>30 days</Button>
                <Button type="button" variant={forecastDays === 90 ? "default" : "outline"} onClick={() => setForecastDays(90)} className={forecastDays === 90 ? "bg-[#D96F32] hover:bg-[#C75D2C] text-white" : ""}>90 days</Button>
                <Button type="button" variant={forecastDays === 180 ? "default" : "outline"} onClick={() => setForecastDays(180)} className={forecastDays === 180 ? "bg-[#D96F32] hover:bg-[#C75D2C] text-white" : ""}>180 days</Button>
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
      </div>
    </>
  )
}
