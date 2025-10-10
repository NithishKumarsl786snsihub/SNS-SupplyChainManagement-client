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

interface UploadStep { 
  id: string
  label: string
  status: "pending" | "processing" | "completed" | "error"
  message?: string 
}

export default function Upload({ onProcessingComplete }: UploadProps) {
  const [uploading, setUploading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>([
    { id: 'upload', label: 'File Upload', status: 'pending' },
    { id: 'validate', label: 'Data Validation', status: 'pending' },
    { id: 'parse', label: 'Column Analysis', status: 'pending' },
    { id: 'ready', label: 'Ready for Results', status: 'pending' },
  ])

  // Example dataset preview from public/same_dataset/arima_sample_dataset.csv
  const [exampleData, setExampleData] = useState<Array<Record<string, string | number>>>([])
  const [exampleColumns, setExampleColumns] = useState<string[]>([])

  useEffect(() => {
    const loadExample = async () => {
      try {
        const res = await fetch('/same_dataset/arima_sample_dataset.csv')
        const text = await res.text()
        const lines = text.trim().split(/\r?\n/)
        if (lines.length === 0) return
        const headers = lines[0].split(',')
        const rows = lines.slice(1, 4) // show a few rows
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
    a.href = '/same_dataset/arima_sample_dataset.csv'
    a.download = 'arima_sample_dataset.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setIsDownloaded(true)
    setTimeout(() => setIsDownloaded(false), 1500)
  }

  type UploadMeta = { columnsCount: number; rowsCount: number; hasRequired: boolean }

  const uploadFileToBackend = async (file: File): Promise<UploadMeta> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('date_column', 'date')
    formData.append('demand_column', 'demand')

    setUploading(true)
    setError(null)
    try {
      const response = await axios.post<UploadResponse>('http://localhost:8000/api/arima/upload-dataset/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setDatasetInfo(response.data.dataset_info)

      // Build metadata directly from the uploaded file to ensure accuracy
      const text = await file.text()
      const allLines = text.trim().split(/\r?\n/)

      const headers = allLines[0]?.split(',') ?? []
      const hasRequired = headers.includes('date') && headers.includes('demand')
      const rowsCount = Math.max(allLines.length - 1, 0)

      return { columnsCount: headers.length, rowsCount, hasRequired }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError((err.response.data as ApiError).error || 'Upload failed')
      } else {
        setError('Upload failed')
      }
      throw err
    } finally {
      setUploading(false)
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

      setUploadSteps((s) => s.map((st) => (st.id === 'ready' ? { ...st, status: 'processing', message: 'Preparing results...' } : st)))
      await new Promise((r) => setTimeout(r, 600))
      setUploadSteps((s) => s.map((st) => (st.id === 'ready' ? { ...st, status: 'completed', message: 'Ready' } : st)))
      
      // Complete processing and call the callback
      setUploading(false)
      if (datasetInfo) {
        onProcessingComplete(datasetInfo)
      }
    } catch {
      setUploadSteps((s) => s.map((st) => (st.id === 'upload' ? { ...st, status: 'error', message: 'Upload failed' } : st)))
      setUploading(false)
    }
  }

  const handleFileUpload = async (file: File) => { 
    setUploadedFile(file)
    setError(null)
    startProcessing(file) 
  }

  const handleFileRemove = () => { 
    setUploadedFile(null)
    setDatasetInfo(null)
    setError(null)
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
                <p className="font-medium text-gray-900">arima_sample_dataset.csv</p>
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
              <li>Maintain the same column structure and data types</li>
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
            <CardTitle>Upload Your Data (CSV/XML)</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploadZone 
              onFileUpload={handleFileUpload} 
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
      </div>
    </>
  )
}


