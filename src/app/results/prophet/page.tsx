"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { Download, BarChart3, TrendingUp, Zap, Activity, Percent, FileText, CheckCircle, UploadCloud, X } from "lucide-react"
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, Area, ComposedChart } from 'recharts'
import { useDropzone } from 'react-dropzone'

// --- Self-Contained UI Components to Avoid Path Errors ---

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white/70 backdrop-blur shadow-[0_10px_30px_rgba(217,111,50,0.06)] ${className}`}>
    {children}
  </div>
)

const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 border-b border-slate-200 ${className}`}>{children}</div>
)

const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`text-xl font-bold text-slate-800 ${className}`}>{children}</h3>
)

const CardDescription = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <p className={`text-slate-600 ${className}`}>{children}</p>
)

const Button = ({ children, onClick, className = '', disabled = false, variant = 'primary' }: { children: React.ReactNode, onClick?: () => void, className?: string, disabled?: boolean, variant?: 'primary' | 'outline' }) => {
  const baseClasses = "font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center gap-2"
  const variantClasses = variant === 'primary' 
    ? "bg-orange-600 text-white hover:bg-orange-700 disabled:bg-slate-400"
    : "bg-white text-orange-600 border-2 border-orange-600 hover:bg-orange-600 hover:text-white"
  return (
    <button onClick={onClick} className={`${baseClasses} ${variantClasses} ${className}`} disabled={disabled}>
      {children}
    </button>
  )
}

const BreadcrumbNav = ({ items }: { items: { label: string, href?: string, current?: boolean }[] }) => (
  <nav className="mb-6 text-sm font-medium text-slate-600">
    {items.map((item, index) => (
      <span key={item.label}>
        {index > 0 && <span className="mx-2">/</span>}
        {item.href ? <a href={item.href} className="hover:text-orange-600">{item.label}</a> : <span>{item.label}</span>}
      </span>
    ))}
  </nav>
)

const LoaderSpinner = ({ message, fullscreen = false }: { message: string, fullscreen?: boolean }) => (
  <div className={`flex flex-col items-center justify-center ${fullscreen ? 'fixed inset-0 bg-white/90 z-50' : 'h-full w-full'}`}>
    <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="mt-4 text-lg font-semibold text-slate-700">{message}</p>
  </div>
)

// --- Interfaces for Prophet API Response ---

interface ModelInfo {
  name: string
  version: string
  description: string
  target_variable: string
  model_type: string
  last_updated: string
}

interface ForecastPoint {
  ds: string
  yhat: number
  yhat_lower: number
  yhat_upper: number
}

interface ElasticityPoint {
  ds: string
  Price: number
  y: number
  elasticity: number
}

interface ProphetResultsData {
  model_info: ModelInfo
  forecast: ForecastPoint[]
  price_elasticity: ElasticityPoint[]
}

// --- Data Table Component ---
const DataTable = ({ data }: { data: Record<string, any>[] }) => {
  if (!data || data.length === 0) return null
  const headers = Object.keys(data[0])
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>{headers.map(h => <th key={h} className="p-3 text-left font-semibold text-slate-700">{h}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t hover:bg-slate-50">
              {headers.map(h => <td key={h} className="p-3 text-slate-600">{row[h]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- File Upload Zone ---
const FileUploadZone = ({ onFileUpload, onFileRemove, uploadedFile, isUploading, uploadError }: any) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onFileUpload(acceptedFiles[0]);
        }
    }, [onFileUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: false,
    });

    return (
        <div>
            {!uploadedFile ? (
                <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-xl cursor-pointer text-center transition-colors ${isDragActive ? 'border-orange-500 bg-orange-50' : 'border-slate-300 hover:border-orange-400'}`}>
                    <input {...getInputProps()} />
                    <UploadCloud className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <p className="font-semibold text-slate-700">
                        {isDragActive ? "Drop the file here..." : "Drag & drop a CSV file here, or click to select"}
                    </p>
                    <p className="text-sm text-slate-500">Max file size: 50MB</p>
                </div>
            ) : (
                <div className="p-4 border rounded-lg bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-green-600" />
                        <div>
                            <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                            <p className="text-sm text-gray-600">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>
                    <button onClick={onFileRemove} className="p-2 rounded-full hover:bg-slate-200">
                        <X className="w-5 h-5 text-slate-600" />
                    </button>
                </div>
            )}
            {isUploading && <p className="text-orange-600 mt-2">Uploading and processing...</p>}
            {uploadError && <p className="text-red-600 mt-2">{uploadError}</p>}
        </div>
    );
};


// --- Reusable Metric Card Component ---
const MetricCard = ({ title, value }: { title: string, value: string | number }) => (
    <div className="rounded-2xl bg-white shadow-lg ring-1 ring-orange-100 p-5">
        <div className="flex flex-col items-start gap-1">
             <div className="text-slate-600 text-sm font-medium">{title}</div>
             <div className="text-3xl font-bold text-orange-600">{value}</div>
        </div>
    </div>
)


// --- Upload Component Logic ---
const Upload = ({ onProcessingComplete, onProcessingFinished, onProcessingError }: any) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [forecastDays, setForecastDays] = useState<number>(30)

  const getSampleData = () => [
    { Date: "2024-01-01", UnitsSold: 150, Price: 1250.00 },
    { Date: "2024-01-02", UnitsSold: 155, Price: 1250.00 },
    { Date: "2024-01-03", UnitsSold: 148, Price: 1275.00 },
  ]

  const handleDownload = () => {
    const rows = getSampleData()
    const headers = Object.keys(rows[0])
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map((h) => String(r[h])).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "prophet_sample_dataset.csv"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setIsDownloaded(true)
    setTimeout(() => setIsDownloaded(false), 2000)
  }

  const callProphetAPI = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("forecast_days", String(forecastDays))
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000)
      
      const response = await fetch("http://localhost:8000/api/prophet/forecast/", {
        method: "POST", body: formData, signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response.' }))
        throw new Error(`API Error: ${response.status} - ${errorData.error || response.statusText}`)
      }
      
      return await response.json()
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out.')
      }
      throw error
    }
  }

  const startProcessing = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)
    onProcessingComplete()
    
    try {
      const result = await callProphetAPI(file)
      sessionStorage.setItem('prophet_results', JSON.stringify(result))
      setIsUploading(false)
      if (onProcessingFinished) onProcessingFinished()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
      setUploadError(`Processing failed: ${errorMessage}`)
      if (onProcessingError) onProcessingError(errorMessage)
    }
  }

  const handleFileUpload = (file: File) => { 
    if (!file) {
      if (onProcessingError) onProcessingError('No dataset detected. Please upload a valid CSV file.')
      return
    }
    setUploadedFile(file)
    startProcessing(file) 
  }

  const handleFileRemove = () => { 
    setUploadedFile(null)
    setUploadError(null)
  }

  return (
    <>
      <div id="dataset" className="scroll-mt-28 mt-12 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dataset Requirements</h2>
        <p className="text-gray-600">Your CSV file must contain `Date`, `UnitsSold`, and `Price` columns.</p>
      </div>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-[#D96F32]" />Download Sample Dataset</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-slate-100 rounded-lg mb-4">
            <div>
                <p className="font-medium text-gray-900">prophet_sample_dataset.csv</p>
                <p className="text-sm text-gray-600">{getSampleData().length} records • 3 columns</p>
            </div>
            <Button onClick={handleDownload} disabled={isDownloaded} variant="primary">
              {isDownloaded ? <CheckCircle className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              {isDownloaded ? 'Downloaded' : 'Download CSV'}
            </Button>
          </div>
          <div className="mt-6"><DataTable data={getSampleData()} /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Upload Your Sales Data</CardTitle></CardHeader>
        <CardContent>
             <div className="space-y-2 mb-6">
                <label htmlFor="forecast-days" className="block text-sm font-semibold text-slate-700">Forecast Period (Days)</label>
                <input id="forecast-days" type="number" min={1} max={365} value={forecastDays} onChange={e=>setForecastDays(Number(e.target.value))} className="w-40 px-4 py-3 border-2 border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <FileUploadZone onFileUpload={handleFileUpload} onFileRemove={handleFileRemove} uploadedFile={uploadedFile} isUploading={isUploading} uploadError={uploadError} />
        </CardContent>
      </Card>
    </>
  )
}

// --- Results Component Logic ---
const Results = ({ onRunAnotherModel }: any) => {
  const [results, setResults] = useState<ProphetResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [yDomain, setYDomain] = useState<[number, number]>([0, 0])
  const [forecastStats, setForecastStats] = useState({ avgDemand: 0, peakDemand: 0, totalDemand: 0 })

  useEffect(() => {
    const storedResults = sessionStorage.getItem('prophet_results')
    if (storedResults) {
      try {
        const parsedResults: ProphetResultsData = JSON.parse(storedResults)
        setResults(parsedResults)
        
        if (parsedResults.forecast && parsedResults.forecast.length > 0) {
          const forecast = parsedResults.forecast;
          const minY = Math.min(...forecast.map(p => p.yhat_lower))
          const maxY = Math.max(...forecast.map(p => p.yhat_upper))
          const pad = (maxY - minY) * 0.1
          setYDomain([Math.max(0, Math.floor(minY - pad)), Math.ceil(maxY + pad)])

          const total = forecast.reduce((sum, p) => sum + p.yhat, 0);
          setForecastStats({
            totalDemand: total,
            avgDemand: total / forecast.length,
            peakDemand: Math.max(...forecast.map(p => p.yhat)),
          });
        }
      } catch (error) { console.error('Error parsing results:', error) }
    }
    setLoading(false)
  }, [])

  if (loading) return <LoaderSpinner fullscreen message="Loading results..."/>

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold text-slate-800">Prophet Forecast Analytics</h1>
                <p className="text-lg font-medium text-slate-600">{results?.model_info?.description || 'Time-series forecasting.'}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline"><Download className="w-5 h-5" /> Export Results</Button>
              <Button onClick={onRunAnotherModel}><Zap className="w-5 h-5" /> Run Another Forecast</Button>
            </div>
          </div>
        </motion.div>

        {results && results.forecast && results.forecast.length > 0 ? (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                 <CardTitle className="flex items-center gap-3"><TrendingUp className="h-6 w-6 text-orange-600" />Sales Demand Forecast</CardTitle>
                <CardDescription>Predicted sales for the next {results.forecast.length} days.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-3 h-[450px] p-4 bg-slate-50 rounded-2xl border">
                     <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={results.forecast}>
                            <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D96F32" stopOpacity={0.4} /><stop offset="100%" stopColor="#D96F32" stopOpacity={0.05} /></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="ds" tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} angle={-30} textAnchor="end" height={50} />
                            <YAxis domain={yDomain} />
                            <Tooltip /> <Legend />
                            <Area type="monotone" dataKey="yhat" name="Forecast" stroke="#D96F32" strokeWidth={2.5} fill="url(#g)" />
                            <Line type="monotone" dataKey="yhat_upper" name="Upper Bound" stroke="#22c55e" strokeDasharray="5 5" dot={false} />
                            <Line type="monotone" dataKey="yhat_lower" name="Lower Bound" stroke="#ef4444" strokeDasharray="5 5" dot={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                      <MetricCard title="Total Forecasted Sales" value={Math.round(forecastStats.totalDemand).toLocaleString()} />
                      <MetricCard title="Average Daily Sales" value={Math.round(forecastStats.avgDemand).toLocaleString()} />
                      <MetricCard title="Peak Daily Sales" value={Math.round(forecastStats.peakDemand).toLocaleString()} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {results.price_elasticity && results.price_elasticity.length > 0 && (
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-3"><Activity className="h-6 w-6 text-orange-600" />Historical Price Elasticity</CardTitle><CardDescription>How price changes have historically affected sales.</CardDescription></CardHeader>
                    <CardContent><div className="h-[350px] p-4 bg-slate-50 rounded-2xl border"><ResponsiveContainer width="100%" height="100%"><LineChart data={results.price_elasticity}><CartesianGrid /><XAxis dataKey="ds" tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })} /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="elasticity" stroke="#C75D2C" /></LineChart></ResponsiveContainer></div></CardContent>
                </Card>
            )}

            <Card><CardHeader><CardTitle>Forecast Data</CardTitle></CardHeader><CardContent><DataTable data={results.forecast.map(r => ({ Date: new Date(r.ds).toLocaleDateString(), Forecast: r.yhat.toFixed(2), Lower_Bound: r.yhat_lower.toFixed(2), Upper_Bound: r.yhat_upper.toFixed(2) }))} /></CardContent></Card>
          </div>
        ) : (
          <Card><CardContent className="py-20 text-center"><BarChart3 className="h-20 w-20 text-orange-500 mx-auto mb-6" /><h3 className="text-3xl font-bold mb-4">No Forecast Data</h3><p className="mb-8">Something went wrong. Please try uploading your data again.</p><Button onClick={onRunAnotherModel}><Zap className="w-5 h-5" /> Upload Data</Button></CardContent></Card>
        )}
    </div>
  )
}


// --- Main Page Component ---
export default function ProphetModelPage() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "Prophet", current: true },
  ]

  const [processingDone, setProcessingDone] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingError, setProcessingError] = useState<string | null>(null)

  const handleProcessingComplete = () => {
    setIsProcessing(true)
    setProcessingError(null)
  }

  const handleProcessingFinished = () => {
    setIsProcessing(false)
    setProcessingDone(true)
  }

  const handleProcessingError = (message: string) => {
    setIsProcessing(false)
    setProcessingDone(false)
    setProcessingError(message || 'Dataset was not received. Please upload your CSV and try again.')
  }

  const handleRunAnotherModel = () => {
    setProcessingDone(false)
    setProcessingError(null)
    sessionStorage.removeItem('prophet_results');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {isProcessing ? (
        <LoaderSpinner
          fullscreen={true}
          message="Processing your time-series data..."
        />
      ) : processingError ? (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <Card className="max-w-xl w-full text-center">
            <CardContent className="p-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">We couldn’t process your file</h2>
                <p className="text-gray-700 mb-6">{processingError}</p>
                <Button onClick={handleRunAnotherModel}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      ) : !processingDone ? (
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <BreadcrumbNav items={breadcrumbItems} />
          <Upload 
            onProcessingComplete={handleProcessingComplete} 
            onProcessingFinished={handleProcessingFinished} 
            onProcessingError={handleProcessingError} 
          />
        </div>
      ) : (
        <Results onRunAnotherModel={handleRunAnotherModel} />
      )}
    </div>
  )
}

