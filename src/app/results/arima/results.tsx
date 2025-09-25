"use client"

import { useEffect, useState } from 'react'
import axios from 'axios'
import type { ApiError, DatasetInfo, ModelInfo, PredictionResponse } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import LoaderSpinner from '@/components/ui/loader'
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'

interface ResultsProps {
  datasetInfo: DatasetInfo | null
  onRunAnotherModel: () => void
}

interface ChartData {
  date: string
  prediction: number
  lower?: number
  upper?: number
}

export default function Results({ datasetInfo, onRunAnotherModel }: ResultsProps) {
  const [training, setTraining] = useState<boolean>(false)
  const [predicting, setPredicting] = useState<boolean>(false)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [autoRan, setAutoRan] = useState<boolean>(false)

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Models', href: '/models' },
    { label: 'ARIMA', current: true },
  ]

  const trainModel = async (): Promise<void> => {
    setTraining(true)
    setError('')

    try {
      const response = await axios.post<{ model_info: ModelInfo }>('http://localhost:8000/api/arima/train/')
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
      const response = await axios.post<PredictionResponse>('http://localhost:8000/api/arima/predict/', { periods })
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

  // Auto-run training and prediction once the results page loads after upload
  useEffect(() => {
    const run = async () => {
      if (autoRan) return
      if (!datasetInfo) return
      setAutoRan(true)
      try {
        await trainModel()
        await getPredictions(30)
      } catch {
        // errors are handled inside functions
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetInfo])

  const chartData: ChartData[] = predictions
    ? predictions.dates.map((date, index) => ({
        date,
        prediction: predictions.predictions[index] || 0,
        lower: predictions.confidence_intervals?.lower?.[index],
        upper: predictions.confidence_intervals?.upper?.[index],
      }))
    : []

  const isPageLoading = training || predicting || (autoRan && !predictions)

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {isPageLoading && <LoaderSpinner fullscreen size="md" message={training ? 'Training ARIMA model...' : 'Generating 30-day forecast...'} />}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ARIMA Results</h1>
            <p className="text-gray-600">Time series forecasting without external variables</p>
          </div>
          <Button className="bg-sns-orange hover:bg-sns-orange-dark text-white" onClick={onRunAnotherModel}>
            Run Another Model
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column: Dataset Info */}
          <div className="xl:col-span-1 space-y-6">
            {datasetInfo && (
              <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur ring-1 ring-[#F3E9DC] shadow-[0_10px_30px_rgba(217,111,50,0.06)]">
                <CardHeader>
                  <CardTitle>Dataset Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-blue-700">Rows:</span> {datasetInfo.rows}</div>
                    <div><span className="text-blue-700">Columns:</span> {datasetInfo.columns.length}</div>
                    <div><span className="text-blue-700">Avg Demand:</span> {datasetInfo.demand_stats?.mean?.toFixed(1) || 'N/A'}</div>
                    <div><span className="text-blue-700">Std Demand:</span> {datasetInfo.demand_stats?.std?.toFixed(1) || 'N/A'}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Forecast */}
          <div className="xl:col-span-2 space-y-6">
            <Card className="bg-white rounded-2xl border-0 ring-1 ring-[#F3E9DC] shadow-[0_10px_30px_rgba(217,111,50,0.06)]">
              <CardHeader>
                <CardTitle className="text-xl">ARIMA Model</CardTitle>
              </CardHeader>
              <CardContent>
                {modelInfo && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                    <h3 className="font-semibold text-gray-900 mb-2">Model Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-600">Order (p,d,q):</span> ({modelInfo.order.join(', ')})</div>
                      <div><span className="text-gray-600">AIC Score:</span> {modelInfo.aic?.toFixed(2) || 'N/A'}</div>
                      {modelInfo.bic && (
                        <div><span className="text-gray-600">BIC Score:</span> {modelInfo.bic?.toFixed(2) || 'N/A'}</div>
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
                        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                        <Legend />
                        <Line type="monotone" dataKey="prediction" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }} name="Predicted Demand" />
                        {predictions.confidence_intervals && (
                          <>
                            <Line type="monotone" dataKey="upper" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} name="Upper Confidence Bound" />
                            <Line type="monotone" dataKey="lower" stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} name="Lower Confidence Bound" />
                          </>
                        )}
                      </LineChart>
                    </ResponsiveContainer>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{predictions.predictions.length}</div>
                        <div className="text-sm text-blue-700">Forecast Periods</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">{predictions.predictions.length > 0 ? Math.max(...predictions.predictions).toFixed(0) : '0'}</div>
                        <div className="text-sm text-green-700">Peak Demand</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-600">{predictions.predictions.reduce((a, b) => a + b, 0)?.toFixed(0) || '0'}</div>
                        <div className="text-sm text-purple-700">Total Forecast</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}


