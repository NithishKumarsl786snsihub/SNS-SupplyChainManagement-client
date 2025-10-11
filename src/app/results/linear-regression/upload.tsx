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
import { uploadDataset, uploadDatasetM6, analyzeDataset, trainModel, predictFuture, predictFromFutureFile, DatasetUploadResponse, TrainingResponse, PredictionResponse, FuturePredictResponse } from "@/config/api"

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

interface ProcessingState {
  datasetId: number | null
  datasetIdM6: number | null
  trainingResult: TrainingResponse | null
  predictionResult: PredictionResponse | null
}

interface UploadProps {
  onProcessingComplete: (
    trainingResult: TrainingResponse,
    predictionResult: PredictionResponse,
    datasetId?: number,
    datasetIdM6?: number
  ) => void
}

export default function Upload({ onProcessingComplete }: UploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [isSampleFlow, setIsSampleFlow] = useState(false)
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>([
    { id: "upload", label: "File Upload", status: "pending" },
    { id: "validate", label: "Data Validation", status: "pending" },
    { id: "parse", label: "Column Analysis", status: "pending" },
    { id: "ready", label: "Ready for Results", status: "pending" },
  ])
  const [filePreview, setFilePreview] = useState<FilePreviewState | null>(null)
  const [processingState, setProcessingState] = useState<ProcessingState>({
    datasetId: null,
    datasetIdM6: null,
    trainingResult: null,
    predictionResult: null
  })

  // Sample dataset used in the Dataset Preview card (matches actual LR columns)
  const getSampleData = () => [
    {
      date: "2023-01-01",
      demand: 150,
      price: 25.5,
      sales_volume: 140,
      inventory_level: 500,
      marketing_spend: 1000,
      temperature: 22.3,
      seasonality: 1,
      competitor_price: 26.0,
      holiday_flag: 0,
      weather_condition: "sunny",
    },
    {
      date: "2023-01-02",
      demand: 165,
      price: 25.0,
      sales_volume: 155,
      inventory_level: 485,
      marketing_spend: 1200,
      temperature: 24.1,
      seasonality: 1,
      competitor_price: 25.8,
      holiday_flag: 0,
      weather_condition: "cloudy",
    },
    {
      date: "2023-01-03",
      demand: 142,
      price: 26.0,
      sales_volume: 135,
      inventory_level: 520,
      marketing_spend: 800,
      temperature: 20.5,
      seasonality: 1,
      competitor_price: 26.5,
      holiday_flag: 0,
      weather_condition: "rainy",
    },
    {
      date: "2023-01-04",
      demand: 178,
      price: 24.5,
      sales_volume: 170,
      inventory_level: 470,
      marketing_spend: 1500,
      temperature: 25.8,
      seasonality: 1,
      competitor_price: 24.8,
      holiday_flag: 0,
      weather_condition: "sunny",
    },
    {
      date: "2023-01-05",
      demand: 195,
      price: 24.0,
      sales_volume: 185,
      inventory_level: 445,
      marketing_spend: 1800,
      temperature: 27.2,
      seasonality: 1,
      competitor_price: 24.2,
      holiday_flag: 1,
      weather_condition: "sunny",
    },
    {
      date: "2023-01-06",
      demand: 160,
      price: 25.5,
      sales_volume: 152,
      inventory_level: 488,
      marketing_spend: 1100,
      temperature: 23.4,
      seasonality: 1,
      competitor_price: 25.9,
      holiday_flag: 0,
      weather_condition: "cloudy",
    },
    {
      date: "2023-01-07",
      demand: 145,
      price: 26.5,
      sales_volume: 138,
      inventory_level: 510,
      marketing_spend: 900,
      temperature: 21.8,
      seasonality: 1,
      competitor_price: 27.0,
      holiday_flag: 0,
      weather_condition: "rainy",
    },
    {
      date: "2023-01-08",
      demand: 172,
      price: 25.0,
      sales_volume: 164,
      inventory_level: 475,
      marketing_spend: 1300,
      temperature: 24.9,
      seasonality: 1,
      competitor_price: 25.3,
      holiday_flag: 0,
      weather_condition: "sunny",
    },
    {
      date: "2023-01-09",
      demand: 188,
      price: 24.5,
      sales_volume: 179,
      inventory_level: 450,
      marketing_spend: 1600,
      temperature: 26.5,
      seasonality: 1,
      competitor_price: 24.7,
      holiday_flag: 0,
      weather_condition: "sunny",
    },
    {
      date: "2023-01-10",
      demand: 155,
      price: 25.8,
      sales_volume: 148,
      inventory_level: 495,
      marketing_spend: 1050,
      temperature: 22.8,
      seasonality: 1,
      competitor_price: 26.2,
      holiday_flag: 0,
      weather_condition: "cloudy",
    },
    {
      date: "2023-01-11",
      demand: 162,
      price: 25.2,
      sales_volume: 154,
      inventory_level: 485,
      marketing_spend: 1150,
      temperature: 23.1,
      seasonality: 1,
      competitor_price: 25.6,
      holiday_flag: 0,
      weather_condition: "sunny",
    },
    {
      date: "2023-01-12",
      demand: 169,
      price: 24.9,
      sales_volume: 160,
      inventory_level: 472,
      marketing_spend: 1225,
      temperature: 24.0,
      seasonality: 1,
      competitor_price: 25.1,
      holiday_flag: 0,
      weather_condition: "cloudy",
    },
    {
      date: "2023-01-13",
      demand: 151,
      price: 26.1,
      sales_volume: 144,
      inventory_level: 498,
      marketing_spend: 980,
      temperature: 21.9,
      seasonality: 1,
      competitor_price: 26.4,
      holiday_flag: 0,
      weather_condition: "rainy",
    },
    {
      date: "2023-01-14",
      demand: 176,
      price: 24.6,
      sales_volume: 168,
      inventory_level: 463,
      marketing_spend: 1480,
      temperature: 25.6,
      seasonality: 1,
      competitor_price: 24.9,
      holiday_flag: 0,
      weather_condition: "sunny",
    },
    {
      date: "2023-01-15",
      demand: 183,
      price: 24.3,
      sales_volume: 175,
      inventory_level: 448,
      marketing_spend: 1580,
      temperature: 26.8,
      seasonality: 1,
      competitor_price: 24.4,
      holiday_flag: 1,
      weather_condition: "sunny",
    },
    {
      date: "2023-01-16",
      demand: 158,
      price: 25.4,
      sales_volume: 150,
      inventory_level: 486,
      marketing_spend: 1120,
      temperature: 23.2,
      seasonality: 1,
      competitor_price: 25.7,
      holiday_flag: 0,
      weather_condition: "cloudy",
    },
    {
      date: "2023-01-17",
      demand: 147,
      price: 26.3,
      sales_volume: 140,
      inventory_level: 505,
      marketing_spend: 920,
      temperature: 21.6,
      seasonality: 1,
      competitor_price: 26.9,
      holiday_flag: 0,
      weather_condition: "rainy",
    },
    {
      date: "2023-01-18",
      demand: 170,
      price: 25.1,
      sales_volume: 162,
      inventory_level: 470,
      marketing_spend: 1320,
      temperature: 24.7,
      seasonality: 1,
      competitor_price: 25.2,
      holiday_flag: 0,
      weather_condition: "sunny",
    },
    {
      date: "2023-01-19",
      demand: 186,
      price: 24.4,
      sales_volume: 177,
      inventory_level: 452,
      marketing_spend: 1625,
      temperature: 26.2,
      seasonality: 1,
      competitor_price: 24.6,
      holiday_flag: 0,
      weather_condition: "sunny",
    },
    {
      date: "2023-01-20",
      demand: 154,
      price: 25.7,
      sales_volume: 146,
      inventory_level: 492,
      marketing_spend: 1080,
      temperature: 22.6,
      seasonality: 1,
      competitor_price: 26.1,
      holiday_flag: 0,
      weather_condition: "cloudy",
    },
  ]

  const buildSampleCsv = () => {
    const rows = getSampleData()
    const headers = Object.keys(rows[0])
    const csvLines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => String((r as Record<string, unknown>)[h])).join(',')),
    ]
    return csvLines.join('\n')
  }

  const handleUseSampleForPrediction = async () => {
    try {
      const csv = buildSampleCsv()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const file = new File([blob], 'linear_regression_sample_dataset.csv', { type: 'text/csv' })
      setUploadedFile(file)
      setIsSampleFlow(true)
      await startProcessing(file, true)
    } catch (e) {
      console.error('Failed to process sample dataset', e)
      setUploadError(e instanceof Error ? e.message : 'Failed to process sample dataset')
    }
  }

  const handleDownload = () => {
    const rows = getSampleData()
    const headers = Object.keys(rows[0])
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => String((r as Record<string, unknown>)[h])).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "linear_regression_sample_dataset.csv"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setIsDownloaded(true)
    setTimeout(() => setIsDownloaded(false), 2000)
  }

  const startProcessing = async (file: File, autoStart: boolean = false) => {
    setIsUploading(true)
    setUploadError(null)
    
    try {
      // Step 1: Upload file to backend
      setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "processing", message: "Uploading file..." } : st)))
      
      const uploadResponse = await uploadDataset(file)
      setProcessingState(prev => ({ ...prev, datasetId: uploadResponse.dataset_id }))

      // Best-effort upload to M6 for log-log and capture id
      let m6Id: number | null = null
      try {
        const uploadM6 = await uploadDatasetM6(file)
        m6Id = uploadM6.dataset_id as unknown as number
        setProcessingState(prev => ({ ...prev, datasetIdM6: uploadM6.dataset_id }))
      } catch {}
      
      setUploadSteps((s) => s.map((st) => (st.id === "upload" ? { ...st, status: "completed", message: "File uploaded" } : st)))

      // Step 2: Validate and analyze dataset
      setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "processing", message: "Validating file format..." } : st)))
      
      const analysisResponse = await analyzeDataset(uploadResponse.dataset_id)
      
      setUploadSteps((s) => s.map((st) => (st.id === "validate" ? { ...st, status: "completed", message: "Validation passed" } : st)))

      // Step 3: Analyze columns and prepare preview
      setUploadSteps((s) => s.map((st) => (st.id === "parse" ? { ...st, status: "processing", message: "Analyzing columns..." } : st)))
      
      setFilePreview({ 
        fileName: file.name, 
        fileSize: file.size, 
        rowCount: analysisResponse.rows, 
        columnCount: analysisResponse.columns, 
        columns: analysisResponse.column_names, 
        previewData: analysisResponse.sample_data as Array<Record<string, unknown>>, 
        validationErrors: [] 
      })
      
      setUploadSteps((s) => s.map((st) => (st.id === "parse" ? { ...st, status: "completed", message: `${analysisResponse.columns} columns detected` } : st)))

      if (autoStart) {
      setUploadSteps((s) => s.map((st) => (st.id === "ready" ? { ...st, status: "processing", message: "Training model..." } : st)))
      const trainingResult = await trainModel(uploadResponse.dataset_id, 'demand')
      setProcessingState(prev => ({ ...prev, trainingResult }))
      if (!trainingResult.success) {
        throw new Error(trainingResult.error || 'Training failed')
      }
        setUploadSteps((s) => s.map((st) => (st.id === "ready" ? { ...st, status: "processing", message: "Forecasting future demand..." } : st)))
      const predictionResult = await predictFuture(uploadResponse.dataset_id, 5, 'demand')
      setProcessingState(prev => ({ ...prev, predictionResult }))
      if (!predictionResult.success) {
        throw new Error(predictionResult.error || 'Prediction failed')
      }
      setUploadSteps((s) => s.map((st) => (st.id === "ready" ? { ...st, status: "completed", message: "Ready" } : st)))
      setIsUploading(false)
      onProcessingComplete(trainingResult, predictionResult, uploadResponse.dataset_id, m6Id ?? undefined)
      } else {
        // Wait for explicit user action
        setUploadSteps((s) => s.map((st) => (st.id === "ready" ? { ...st, status: "pending", message: "Click Start Prediction to train & forecast" } : st)))
        setIsUploading(false)
      }
      
    } catch (error) {
      console.error('Processing error:', error)
      setUploadError(error instanceof Error ? error.message : 'Processing failed')
      setUploadSteps((s) => s.map((st) => ({ ...st, status: "error", message: error instanceof Error ? error.message : 'Processing failed' })))
      setIsUploading(false)
    }
  }

  const handleFileUpload = (file: File) => { 
    setUploadedFile(file)
    setIsSampleFlow(false)
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
                <p className="font-medium text-gray-900">linear_regression_sample_dataset.csv</p>
                <p className="text-sm text-gray-600">{getSampleData().length} records • {Object.keys(getSampleData()[0]).length} columns</p>
              </div>
            </div>
            <div className="flex gap-3">
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
              <Button onClick={handleUseSampleForPrediction} className="border border-[#D96F32] border-[1px] text-[#D96F32] hover:bg-[#D96F32] hover:text-white bg-transparent" disabled={isUploading}>
                Use Sample for Prediction
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
              <DataTable data={getSampleData().slice(0, 3)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Data</h2>
        <p className="text-gray-600">Upload your CSV file containing supply chain data. We&apos;ll validate the format and prepare it for forecasting with your selected Linear Regression model.</p>
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
            {filePreview && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">Uploaded Dataset Preview</h4>
                  <button
                    type="button"
                    onClick={() => setShowPreview((v) => !v)}
                    className="text-xs px-2 py-1 rounded-md border bg-gray-50 hover:bg-gray-100 text-gray-800"
                  >
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                </div>
                {showPreview && <FilePreview {...filePreview} />}
              </div>
            )}
          </CardContent>
        </Card>
        <UploadProgress 
          steps={uploadSteps}
          canStart={Boolean(processingState.datasetId) && !isUploading && !isSampleFlow}
          onStart={async () => {
            if (!processingState.datasetId) return
            try {
              setUploadSteps((s) => s.map((st) => (st.id === 'ready' ? { ...st, status: 'processing', message: 'Training model...' } : st)))
              const trainingResult = await trainModel(processingState.datasetId, 'demand')
              setProcessingState(prev => ({ ...prev, trainingResult }))
              if (!trainingResult.success) {
                throw new Error(trainingResult.error || 'Training failed')
              }
              setUploadSteps((s) => s.map((st) => (st.id === 'ready' ? { ...st, status: 'processing', message: 'Forecasting future demand...' } : st)))
              const predictionResult = await predictFuture(processingState.datasetId, 5, 'demand')
              setProcessingState(prev => ({ ...prev, predictionResult }))
              if (!predictionResult.success) {
                throw new Error(predictionResult.error || 'Prediction failed')
              }
              setUploadSteps((s) => s.map((st) => (st.id === 'ready' ? { ...st, status: 'completed', message: 'Ready' } : st)))
              onProcessingComplete(trainingResult, predictionResult, processingState.datasetId, processingState.datasetIdM6 ?? undefined)
            } catch (error) {
              console.error('Prediction error:', error)
              setUploadError(error instanceof Error ? error.message : 'Prediction failed')
              setUploadSteps((s) => s.map((st) => (st.id === 'ready' ? { ...st, status: 'error', message: error instanceof Error ? error.message : 'Prediction failed' } : st)))
            }
          }}
        />
      </div>

      {uploadedFile && isUploading && <LoaderSpinner message="Processing your data..." />}
    </>
  )
}
