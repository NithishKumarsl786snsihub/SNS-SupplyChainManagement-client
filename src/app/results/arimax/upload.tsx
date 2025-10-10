"use client"

import { useEffect, useState } from 'react'
import axios from 'axios'
import type { ApiError, DatasetInfo, UploadResponse } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, CheckCircle } from 'lucide-react'
import { FileUploadZone } from '@/components/file-upload-zone'
import { DataTable } from '@/components/data-table'
import LoaderSpinner from '@/components/ui/loader'


interface UploadProps {
  onProcessingComplete: (datasetInfo: DatasetInfo) => void
}


export default function Upload({ onProcessingComplete }: UploadProps) {
  const [uploading, setUploading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [uploadSteps, setUploadSteps] = useState<Array<{ id: string; label: string; status: 'pending' | 'processing' | 'completed' | 'error'; message?: string }>>([
    { id: 'upload', label: 'File Upload', status: 'pending' },
    { id: 'validate', label: 'Data Validation', status: 'pending' },
    { id: 'parse', label: 'Column Analysis', status: 'pending' },
    { id: 'train', label: 'Training ARIMAX Model', status: 'pending' },
    { id: 'predict', label: 'Generating Forecast', status: 'pending' },
    { id: 'ready', label: 'Ready for Results', status: 'pending' },
  ])

  // Example dataset preview
  const [exampleData, setExampleData] = useState<Array<Record<string, string | number>>>([])
  const [exampleColumns, setExampleColumns] = useState<string[]>([])

  useEffect(() => {
    const loadExample = async () => {
      try {
        const res = await fetch('/same_dataset/arimax_sample_dataset.csv')
        const text = await res.text()
        const lines = text.trim().split(/\r?\n/)
        if (lines.length === 0) return
        const headers = lines[0].split(',')
        const rows = lines.slice(1, 4)
        const parsed = rows.map((line) => {
          const values = line.split(',')
          const obj: Record<string, string | number> = {}
          headers.forEach((h, i) => {
            const v = values[i]
            const num = Number(v)
            obj[h] = Number.isNaN(num) ? v : num
          })
          return obj
        })
        setExampleColumns(headers)
        setExampleData(parsed)
      } catch {
        // ignore example load error silently
      }
    }
    loadExample()
  }, [])

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = '/same_dataset/arimax_sample_dataset.csv'
    a.download = 'arimax_sample_dataset.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setIsDownloaded(true)
    setTimeout(() => setIsDownloaded(false), 1500)
  }

  type UploadMeta = { columnsCount: number; rowsCount: number; hasRequired: boolean; datasetInfo: DatasetInfo }

  const uploadFileToBackend = async (file: File): Promise<UploadMeta> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('date_column', 'date')
    formData.append('demand_column', 'demand')

    setUploading(true)
    setError(null)
    try {
      const response = await axios.post<UploadResponse>('http://localhost:8000/api/arimax/upload-dataset/', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      })

      const text = await file.text()
      const allLines = text.trim().split(/\r?\n/)
      const headers = allLines[0]?.split(',') ?? []
      const hasRequired = headers.includes('date') && headers.includes('demand')
      const rowsCount = Math.max(allLines.length - 1, 0)

      return { 
        columnsCount: headers.length, 
        rowsCount, 
        hasRequired,
        datasetInfo: response.data.dataset_info
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError((err.response.data as ApiError).error || 'Upload failed')
      } else {
        setError('Upload failed')
      }
      throw err
    } finally {
      // keep uploading state controlled by startProcessing to avoid flicker
    }
  }

  const startProcessing = async (file: File) => {
    setUploadedFile(file)
    setUploading(true)
    setError(null)
    setUploadSteps((s) => s.map((st) => (st.id === 'upload' ? { ...st, status: 'processing', message: 'Uploading file...' } : st)))
    
    try {
      const meta = await uploadFileToBackend(file)
      setUploadSteps((s) => s.map((st) => (st.id === 'upload' ? { ...st, status: 'completed', message: 'File uploaded' } : st)))

      setUploadSteps((s) => s.map((st) => (st.id === 'validate' ? { ...st, status: 'processing', message: 'Validating file format...' } : st)))
      await new Promise((r) => setTimeout(r, 500))
      setUploadSteps((s) => s.map((st) => (st.id === 'validate' ? { ...st, status: meta.hasRequired ? 'completed' : 'error', message: meta.hasRequired ? 'Validation passed' : 'Missing required columns: date, demand' } : st)))

      setUploadSteps((s) => s.map((st) => (st.id === 'parse' ? { ...st, status: 'processing', message: 'Analyzing columns...' } : st)))
      await new Promise((r) => setTimeout(r, 500))
      setUploadSteps((s) => s.map((st) => (st.id === 'parse' ? { ...st, status: 'completed', message: `${meta.columnsCount} columns detected` } : st)))

      setUploadSteps((s) => s.map((st) => (st.id === 'train' ? { ...st, status: 'processing', message: 'Training ARIMAX model...' } : st)))
      try {
        await axios.post('http://localhost:8000/api/arimax/train/')
        setUploadSteps((s) => s.map((st) => (st.id === 'train' ? { ...st, status: 'completed', message: 'Model trained' } : st)))
      } catch {
        setUploadSteps((s) => s.map((st) => (st.id === 'train' ? { ...st, status: 'error', message: 'Training failed' } : st)))
        throw new Error('Model training failed')
      }

      setUploadSteps((s) => s.map((st) => (st.id === 'predict' ? { ...st, status: 'processing', message: 'Generating 30-day forecast...' } : st)))
      try {
        await axios.post('http://localhost:8000/api/arimax/predict/', {
          prediction_type: 'auto',
          periods: 30,
          include_confidence: true
        })
        setUploadSteps((s) => s.map((st) => (st.id === 'predict' ? { ...st, status: 'completed', message: 'Forecast generated' } : st)))
      } catch {
        setUploadSteps((s) => s.map((st) => (st.id === 'predict' ? { ...st, status: 'error', message: 'Prediction failed' } : st)))
        throw new Error('Prediction failed')
      }

      setUploadSteps((s) => s.map((st) => (st.id === 'ready' ? { ...st, status: 'processing', message: 'Preparing results...' } : st)))
      await new Promise((r) => setTimeout(r, 600))
      setUploadSteps((s) => s.map((st) => (st.id === 'ready' ? { ...st, status: 'completed', message: 'Ready' } : st)))
      
      // Complete processing and call the callback with the datasetInfo from uploadFileToBackend
      setUploading(false)
      onProcessingComplete(meta.datasetInfo)
    } catch {
      setUploadSteps((s) => s.map((st) => (st.id === 'upload' ? { ...st, status: 'error', message: 'Upload failed' } : st)))
      setUploading(false)
      setError('Upload failed. Please try again.')
      setShowErrorModal(true)
    }
  }

  const handleFileUploadInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) startProcessing(file)
  }

  const handleFileUploadZone = (file: File) => startProcessing(file)
  const handleFileRemove = () => {
    setUploadedFile(null)
    setError(null)
    setUploadSteps((prev) => prev.map((s) => ({ ...s, status: 'pending' as const, message: undefined })))
  }

  const handleErrorModalClose = () => {
    setShowErrorModal(false)
    setError(null)
    setUploadedFile(null)
    setUploadSteps((prev) => prev.map((s) => ({ ...s, status: 'pending' as const, message: undefined })))
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
                <p className="font-medium text-gray-900">arimax_sample_dataset.csv</p>
                <p className="text-sm text-gray-600">{exampleData.length} records • {exampleColumns.length} columns</p>
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
              <li>Include date, demand, and exogenous variables (price, ads, etc.)</li>
              <li>Ensure your data covers sufficient historical periods</li>
              <li>Remove or replace sample data with your actual values</li>
            </ul>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Example Dataset Preview</h3>
            <div>
              <DataTable data={exampleData} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-8 mb-10">
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Data (CSV)</CardTitle>
          </CardHeader>
          <CardContent>
            <input type="file" accept=".csv" onChange={handleFileUploadInput} className="hidden" id="csv-upload-arimax" />
            <FileUploadZone 
              onFileUpload={handleFileUploadZone}
              onFileRemove={handleFileRemove}
              uploadedFile={uploadedFile}
              isUploading={uploading}
              uploadError={error}
            />
            {uploading && (
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

        {/* Professional Error Modal */}
        {showErrorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 transform transition-all duration-300 scale-100">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Processing Failed</h3>
                    <p className="text-sm text-gray-600">An error occurred during data processing</p>
                  </div>
                </div>
                <button
                  onClick={handleErrorModalClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-red-800 mb-1">Error Details</h4>
                      <p className="text-red-700 text-sm">
                        {error || 'An unexpected error occurred during file processing. Please check your file format and try again.'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-800 mb-2">Troubleshooting Tips</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Ensure your CSV has &apos;date&apos; and &apos;demand&apos; columns</li>
                    <li>• Check that date format is consistent (YYYY-MM-DD)</li>
                    <li>• Verify demand values are numeric</li>
                    <li>• Include sufficient historical data (30+ records)</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleErrorModalClose}
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleErrorModalClose}
                    className="flex-1 bg-sns-orange hover:bg-sns-orange-dark text-white"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
