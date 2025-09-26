"use client"

import { useEffect, useState } from 'react'
import axios from 'axios'
import type { ApiError, DatasetInfo, UploadResponse } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, CheckCircle } from 'lucide-react'
import { FileUploadZone } from '@/components/file-upload-zone'
import { DataTable } from '@/components/data-table'
import { UploadProgress } from '@/components/upload-progress'

type PreviewRow = { row: string[] }

interface UploadProps {
  onProcessingComplete: (datasetInfo: DatasetInfo) => void
}

export default function Upload({ onProcessingComplete }: UploadProps) {
  const [uploading, setUploading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null)
  const [datasetPreview, setDatasetPreview] = useState<PreviewRow[]>([])
  const [showPreview, setShowPreview] = useState<boolean>(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [uploadSteps, setUploadSteps] = useState<Array<{ id: string; label: string; status: 'pending' | 'processing' | 'completed' | 'error'; message?: string }>>([
    { id: 'upload', label: 'File Upload', status: 'pending' },
    { id: 'validate', label: 'Data Validation', status: 'pending' },
    { id: 'parse', label: 'Column Analysis', status: 'pending' },
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

  type UploadMeta = { columnsCount: number; rowsCount: number; hasRequired: boolean }

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
      setDatasetInfo(response.data.dataset_info)

      const text = await file.text()
      const allLines = text.trim().split(/\r?\n/)
      const lines = allLines.slice(0, 6)
      const previewData: PreviewRow[] = lines.map((line) => ({ row: line.split(',') }))
      setDatasetPreview(previewData)
      setShowPreview(true)

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
    } catch {
      setUploadSteps((s) => s.map((st) => (st.id === 'upload' ? { ...st, status: 'error', message: 'Upload failed' } : st)))
    }
  }

  const handleFileUploadInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) startProcessing(file)
  }

  const handleFileUploadZone = (file: File) => startProcessing(file)
  const handleFileRemove = () => {
    setUploadedFile(null)
    setDatasetInfo(null)
    setDatasetPreview([])
    setShowPreview(false)
    setError(null)
    setUploadSteps((prev) => prev.map((s) => ({ ...s, status: 'pending' as const, message: undefined })))
  }

  const togglePreview = () => setShowPreview(!showPreview)

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur ring-1 ring-[#F3E9DC] shadow-[0_10px_30px_rgba(217,111,50,0.06)]">
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

            {datasetInfo && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">Dataset Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-blue-700">Rows:</span> {datasetInfo.rows}</div>
                    <div><span className="text-blue-700">Columns:</span> {datasetInfo.columns.length}</div>
                    <div><span className="text-blue-700">Avg Demand:</span> {datasetInfo.demand_stats?.mean?.toFixed(1) || 'N/A'}</div>
                    <div><span className="text-blue-700">Exogenous Vars:</span> {
                      datasetInfo.columns.filter(col => 
                        ['price', 'ads', 'holidays', 'promotions', 'competitor_price', 'weather_index'].includes(col)
                      ).length || 'None'
                    }</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 border-sns-orange text-sns-orange hover:bg-sns-orange hover:text-white bg-transparent" onClick={togglePreview}>
                    {showPreview ? 'Hide Dataset Preview' : 'Show Dataset Preview'}
                  </Button>
                  <Button disabled={!datasetInfo} className="bg-sns-orange hover:bg-sns-orange-dark text-white" onClick={() => datasetInfo && onProcessingComplete(datasetInfo)}>
                    Continue
                  </Button>
                </div>

                {showPreview && datasetPreview.length > 0 && (
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-semibold text-gray-900 mb-2">Dataset Preview (First 5 rows)</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            {datasetPreview[0]?.row.map((header: string, index: number) => (
                              <th key={index} className="px-4 py-2 text-left font-medium text-gray-700 border">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {datasetPreview.slice(1).map((row, rowIndex) => (
                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                              {row.row.map((cell: string, cellIndex: number) => (
                                <td key={cellIndex} className="px-4 py-2 border">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <UploadProgress steps={uploadSteps} />
      </div>
    </>
  )
}