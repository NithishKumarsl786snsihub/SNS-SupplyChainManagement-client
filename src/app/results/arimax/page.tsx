'use client'
import { useState } from 'react'
import { UploadResponse, ModelInfo, PredictionResponse, PriceOptimizationResponse, ApiError, DatasetInfo } from '@/types/api'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface ChartData {
  date: string;
  prediction: number;
}

interface OptimizationChartData {
  price: number;
  predicted_demand: number;
  profit: number;
}

interface PredictionRequest {
  prediction_type: 'auto' | 'upload';
  periods: number;
  future_file?: File;
}

interface OptimizationParams {
  base_price: number;
  cost_per_unit: number;
  price_range: number;
  steps: number;
}

export default function ARIMAXPage() {
  const [uploading, setUploading] = useState<boolean>(false)
  const [training, setTraining] = useState<boolean>(false)
  const [predicting, setPredicting] = useState<boolean>(false)
  const [optimizing, setOptimizing] = useState<boolean>(false)
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null)
  const [optimizationResults, setOptimizationResults] = useState<PriceOptimizationResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [predictionType, setPredictionType] = useState<'auto' | 'upload'>('auto')
  const [futureFile, setFutureFile] = useState<File | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [datasetPreview, setDatasetPreview] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState<boolean>(false)
  
  // Optimization parameters with default values
  const [optimizationParams, setOptimizationParams] = useState<OptimizationParams>({
    base_price: 10,
    cost_per_unit: 0.6,
    price_range: 0.3,
    steps: 15
  })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('date_column', 'date')
    formData.append('demand_column', 'demand')

    setUploading(true)
    setError('')

    try {
      const response = await axios.post<UploadResponse>(
        'http://localhost:8000/api/arimax/upload-dataset/', 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      setDatasetInfo(response.data.dataset_info)
      
      // Read file for preview
      const text = await file.text()
      const lines = text.split('\n').slice(0, 6) // First 5 rows + header
      const previewData = lines.map(line => {
        const values = line.split(',')
        return {
          row: values
        }
      })
      setDatasetPreview(previewData)
      setShowPreview(true)
      
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError((err.response.data as ApiError).error || 'Upload failed')
      } else {
        setError('Upload failed')
      }
    } finally {
      setUploading(false)
    }
  }

  const trainModel = async (): Promise<void> => {
    setTraining(true)
    setError('')

    try {
      const response = await axios.post<{ model_info: ModelInfo }>(
        'http://localhost:8000/api/arimax/train/'
      )
      setModelInfo(response.data.model_info)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError((err.response.data as ApiError).error || 'Training failed')
      } else {
        setError('Training failed')
      }
    } finally {
      setTraining(false)
    }
  }

  const downloadTemplate = async (): Promise<void> => {
    try {
      const response = await axios.get(
        'http://localhost:8000/api/arimax/download-future-template/',
        { responseType: 'blob' }
      )
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'future_exog_template.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Error downloading template')
    }
  }

  const getPredictions = async (periods: number = 30): Promise<void> => {
    setPredicting(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('prediction_type', predictionType)
      formData.append('periods', periods.toString())
      
      if (predictionType === 'upload' && futureFile) {
        formData.append('future_file', futureFile)
      }

      const response = await axios.post<PredictionResponse>(
        'http://localhost:8000/api/arimax/predict/', 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      setPredictions(response.data)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError((err.response.data as ApiError).error || 'Prediction failed')
      } else {
        setError('Prediction failed')
      }
    } finally {
      setPredicting(false)
    }
  }

  const optimizePrice = async (): Promise<void> => {
    setOptimizing(true)
    setError('')

    try {
      const response = await axios.post<PriceOptimizationResponse>(
        'http://localhost:8000/api/arimax/optimize-price/', 
        {
          base_price: optimizationParams.base_price,
          price_range: optimizationParams.price_range,
          steps: optimizationParams.steps,
          cost_per_unit: optimizationParams.cost_per_unit
        }
      )
      setOptimizationResults(response.data)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError((err.response.data as ApiError).error || 'Optimization failed')
      } else {
        setError('Optimization failed')
      }
    } finally {
      setOptimizing(false)
    }
  }

  const handleOptimizationParamChange = (param: keyof OptimizationParams, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      setOptimizationParams(prev => ({
        ...prev,
        [param]: numValue
      }))
    }
  }

  const togglePreview = () => {
    setShowPreview(!showPreview)
  }

  const predictionChartData: ChartData[] = predictions ? predictions.dates.map((date, index) => ({
    date,
    prediction: predictions.predictions[index]
  })) : []

  const optimizationChartData: OptimizationChartData[] = optimizationResults?.optimization_results || []

  return (
    <div className="min-h-screen  bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ARIMAX Analytics Platform</h1>
          <p className="text-gray-600">Advanced forecasting with external variables and price optimization</p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Left Sidebar - Controls and Info */}
          <div className="xl:col-span-3 space-y-6 w-full">
                  <div className="bg-white rounded-lg shadow p-6 flex-1">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Dataset Upload
                </h2>
                
                <div className="upload-area border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors mb-4">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload-arimax"
                  />
                  <label htmlFor="csv-upload-arimax" className="cursor-pointer block">
                    <div className="text-gray-600">
                      {uploading ? (
                        <div className="flex flex-col items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                          <span>Uploading Dataset...</span>
                        </div>
                      ) : (
                        <>
                          <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="font-medium">Click to upload CSV file</p>
                          <p className="text-sm text-gray-500 mt-1">Supports date, demand, and exogenous variables</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                {datasetInfo && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-blue-900 mb-2">Dataset Information</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-blue-700">Rows:</span> {datasetInfo.rows}
                        </div>
                        <div>
                          <span className="text-blue-700">Columns:</span> {datasetInfo.columns.length}
                        </div>
                        <div>
                          <span className="text-blue-700">Avg Demand:</span> {datasetInfo.demand_stats.mean.toFixed(1)}
                        </div>
                        <div>
                          <span className="text-blue-700">Exogenous Vars:</span> {
                            datasetInfo.columns.filter(col => 
                              ['price', 'ads', 'holidays', 'promotions', 'competitor_price', 'weather_index'].includes(col)
                            ).length || 'None'
                          }
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={togglePreview}
                      className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {showPreview ? 'Hide Dataset Preview' : 'Show Dataset Preview'}
                    </button>

                    {showPreview && datasetPreview.length > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
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
              </div>
            {/* Upload Section */}
            <div className='flex flex-col lg:flex-row gap-6 w-full'>
        

              {/* Model Controls */}
              <div className="bg-white rounded-lg shadow p-6 flex-1">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Model Controls
                </h2>
                
                <div className="space-y-3">
                  <button
                    onClick={trainModel}
                    disabled={training || !datasetInfo}
                    className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {training ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Training Model...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Train ARIMAX Model
                      </>
                    )}
                  </button>
                </div>

                {modelInfo && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <h3 className="font-semibold text-gray-900 mb-2">Model Information</h3>
                    <div className="space-y-1 text-sm">
                      <div><span className="text-gray-600">Features:</span> {modelInfo.exog_features?.join(', ') || 'None'}</div>
                      <div><span className="text-gray-600">Order:</span> ({modelInfo.order.join(', ')})</div>
                      <div><span className="text-gray-600">AIC Score:</span> {modelInfo.aic?.toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Prediction and Optimization Controls */}
              <div className="bg-white rounded-lg shadow p-6 flex-1">
                <h2 className="text-xl font-semibold mb-4">Prediction & Optimization</h2>
                
                <div className="space-y-4">
                  {/* Prediction Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prediction Method
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="predictionType"
                          value="auto"
                          checked={predictionType === 'auto'}
                          onChange={(e) => setPredictionType(e.target.value as 'auto')}
                          className="mr-2"
                        />
                        Auto-generated Future Data
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="predictionType"
                          value="upload"
                          checked={predictionType === 'upload'}
                          onChange={(e) => setPredictionType(e.target.value as 'upload')}
                          className="mr-2"
                        />
                        Upload Future Data
                      </label>
                    </div>
                  </div>

                  {/* File Upload for Future Data */}
                  {predictionType === 'upload' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Future Exogenous Variables
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="file"
                          accept=".csv,.json"
                          onChange={(e) => setFutureFile(e.target.files?.[0] || null)}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                        />
                        <button
                          onClick={downloadTemplate}
                          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                          type="button"
                        >
                          Download Template
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Upload CSV or JSON file with future values for {modelInfo?.exog_features?.join(', ') || 'exogenous variables'}
                      </p>
                    </div>
                  )}

                  {/* Prediction Button */}
                  <button
                    onClick={() => getPredictions(30)}
                    disabled={predicting || !modelInfo || (predictionType === 'upload' && !futureFile)}
                    className="w-full bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {predicting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating Forecast...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Generate Forecast (30 days)
                      </>
                    )}
                  </button>

                  {/* Optimization Parameters */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Price Optimization Parameters</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Base Price ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={optimizationParams.base_price}
                          onChange={(e) => handleOptimizationParamChange('base_price', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cost Per Unit ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={optimizationParams.cost_per_unit}
                          onChange={(e) => handleOptimizationParamChange('cost_per_unit', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price Range (±)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={optimizationParams.price_range}
                          onChange={(e) => handleOptimizationParamChange('price_range', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Steps
                        </label>
                        <input
                          type="number"
                          value={optimizationParams.steps}
                          onChange={(e) => handleOptimizationParamChange('steps', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Optimization Button */}
                  <button
                    onClick={optimizePrice}
                    disabled={optimizing || !modelInfo}
                    className="w-full bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {optimizing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Optimizing Prices...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Optimize Pricing Strategy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Content - Results and Visualizations */}
          <div className="xl:col-span-3 space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Forecast Results */}
            {predictions && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    ARIMAX Demand Forecast
                  </h3>
                  <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                    {predictions.dates.length} periods
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={predictionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="prediction" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                      name="Predicted Demand"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Optimization Results */}
            {optimizationResults && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-semibold mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Price Optimization Analysis
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Demand & Profit vs Price</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={optimizationChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="price" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="predicted_demand" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            name="Demand"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="profit" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            name="Profit"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Profit Distribution</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={optimizationChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="price" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {optimizationResults.best_price && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Optimal Pricing Recommendation
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <div className="text-2xl font-bold text-green-600">${optimizationResults.best_price.price.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">Optimal Price</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <div className="text-2xl font-bold text-blue-600">${optimizationResults.best_price.profit.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">Expected Profit</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <div className="text-2xl font-bold text-purple-600">{optimizationResults.best_price.predicted_demand.toFixed(0)}</div>
                          <div className="text-sm text-gray-600">Expected Demand</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}