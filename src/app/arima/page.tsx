'use client'
import { useState } from 'react'
import { UploadResponse, ModelInfo, PredictionResponse, ApiError, DatasetInfo } from '../../types/api'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ChartData {
  date: string;
  prediction: number;
  lower?: number;
  upper?: number;
}

export default function ARIMAPage() {
  const [uploading, setUploading] = useState<boolean>(false)
  const [training, setTraining] = useState<boolean>(false)
  const [predicting, setPredicting] = useState<boolean>(false)
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [datasetPreview, setDatasetPreview] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState<boolean>(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('date_column', 'date')
    formData.append('demand_column', 'demand')

    setUploading(true)
    setError('')

    try {
      const response = await axios.post<UploadResponse>(
        'http://localhost:8000/api/arima/upload-dataset/', 
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
        'http://localhost:8000/api/arima/train/'
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

  const getPredictions = async (periods: number = 30): Promise<void> => {
    setPredicting(true)
    setError('')

    try {
      const response = await axios.post<PredictionResponse>(
        'http://localhost:8000/api/arima/predict/', 
        { periods }
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

  const togglePreview = () => {
    setShowPreview(!showPreview)
  }
const chartData: ChartData[] = predictions ? predictions.dates.map((date, index) => ({
  date,
  prediction: predictions.predictions[index] || 0,
  lower: predictions.confidence_intervals?.lower?.[index],
  upper: predictions.confidence_intervals?.upper?.[index]
})) : []

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ARIMA Analytics</h1>
          <p className="text-gray-600">Time series forecasting without external variables</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Upload Dataset</h2>
              
              <div className="upload-area border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors mb-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload-arima"
                />
                <label htmlFor="csv-upload-arima" className="cursor-pointer block">
                  <div className="text-gray-600">
                    {uploading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-2">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mt-2">Click to upload CSV file</p>
                        <p className="text-sm text-gray-500 mt-1">Supports files with date and demand columns</p>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {datasetInfo && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-900 mb-2">Dataset Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-green-700">Rows:</span> {datasetInfo.rows}
                      </div>
                      <div>
                        <span className="text-green-700">Columns:</span> {datasetInfo.columns.length}
                      </div>
                    <div>
                      <span className="text-green-700">Avg Demand:</span> {datasetInfo.demand_stats?.mean?.toFixed(1) || 'N/A'}
                    </div>
                    <div>
                      <span className="text-green-700">Std Demand:</span> {datasetInfo.demand_stats?.std?.toFixed(1) || 'N/A'}
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
          </div>

          {/* Analytics Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">ARIMA Model</h2>
              
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={trainModel}
                  disabled={training || !datasetInfo}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center"
                >
                  {training ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Training...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Train ARIMA Model
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => getPredictions(30)}
                  disabled={predicting || !modelInfo}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-300 transition-colors flex items-center"
                >
                  {predicting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Predicting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Get 30-Day Forecast
                    </>
                  )}
                </button>
              </div>

              {modelInfo && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="font-semibold text-gray-900 mb-2">Model Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-600">Order (p,d,q):</span> ({modelInfo.order.join(', ')})</div>
                   <div><span className="text-gray-600">AIC Score:</span> {modelInfo.aic?.toFixed(2) || 'N/A'}</div>
                      {modelInfo.bic && (
                        <div><span className="text-gray-600">BIC Score:</span> {modelInfo.bic?.toFixed(2) || 'N/A'}</div>
                      )}
                      {modelInfo.hqic && (
                        <div><span className="text-gray-600">HQIC Score:</span> {modelInfo.hqic?.toFixed(2) || 'N/A'}</div>
                      )}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-700 font-medium">{error}</span>
                  </div>
                </div>
              )}

              {predictions && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      ARIMA Forecast Results
                    </h3>
                    <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                      {predictions.dates.length} periods forecast
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
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
                      {predictions.confidence_intervals && (
                        <>
                          <Line 
                            type="monotone" 
                            dataKey="upper" 
                            stroke="#ef4444" 
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            name="Upper Confidence Bound"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="lower" 
                            stroke="#10b981" 
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            name="Lower Confidence Bound"
                          />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                  
                  {/* Forecast Summary */}
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {predictions.predictions.length}
                      </div>
                      <div className="text-sm text-blue-700">Forecast Periods</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {predictions.predictions.length > 0 ? Math.max(...predictions.predictions).toFixed(0) : '0'}
                      </div>
                      <div className="text-sm text-green-700">Peak Demand</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {predictions.predictions.reduce((a, b) => a + b, 0)?.toFixed(0) || '0'}
                      </div>
                      <div className="text-sm text-purple-700">Total Forecast</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}