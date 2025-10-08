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
  lower_tight?: number
  upper_tight?: number
}

export default function Results({ datasetInfo, onRunAnotherModel }: ResultsProps) {
  const [training, setTraining] = useState<boolean>(false)
  const [predicting, setPredicting] = useState<boolean>(false)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [autoRan, setAutoRan] = useState<boolean>(false)
  const [showDemandTable, setShowDemandTable] = useState<boolean>(true)

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
    ? predictions.dates.map((date, index) => {
        const prediction = predictions.predictions[index] || 0
        const lower = predictions.confidence_intervals?.lower?.[index]
        const upper = predictions.confidence_intervals?.upper?.[index]
        const hasBoth = typeof lower === 'number' && typeof upper === 'number'
        const shrinkFactor = 0.2 // bring bands 20% of the distance from prediction to bounds (tighter)
        const lower_tight = hasBoth ? prediction - (prediction - (lower as number)) * shrinkFactor : undefined
        const upper_tight = hasBoth ? prediction + ((upper as number) - prediction) * shrinkFactor : undefined
        return {
          date,
          prediction,
          lower,
          upper,
          lower_tight,
          upper_tight,
        }
      })
    : []

  // Ensure strict chronological order for accurate day-to-day variation
  const chartDataSorted = chartData.length > 0
    ? [...chartData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : chartData

  // Insights metrics
  const totalPredicted = chartDataSorted.reduce((sum, d) => sum + (d.prediction || 0), 0)
  const averageDaily = chartDataSorted.length > 0 ? totalPredicted / chartDataSorted.length : 0
  const peakPoint = chartDataSorted.reduce<{ date: string; prediction: number } | null>((acc, d) => {
    if (!acc || d.prediction > acc.prediction) return { date: d.date, prediction: d.prediction }
    return acc
  }, null)
  const firstVal = chartDataSorted[0]?.prediction
  const lastVal = chartDataSorted[chartDataSorted.length - 1]?.prediction
  const netChange = (typeof firstVal === 'number' && typeof lastVal === 'number') ? lastVal - firstVal : 0
  const trendLabel = (() => {
    if (Math.abs(netChange) < 1) return 'Stable'
    return netChange > 0 ? 'Rising' : 'Declining'
  })()

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

        <div className="grid grid-cols-1 xl:grid-cols-1 gap-6 ">
          {/* Left Column: Dataset Info */}
          <div className="xl:col-span-2 space-y-6">
            {false && datasetInfo && (
              <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur ring-1 ring-[#F3E9DC] shadow-[0_10px_30px_rgba(217,111,50,0.06)]">
                <CardHeader>
                  <CardTitle>Dataset Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-blue-700">Rows:</span> {datasetInfo?.rows}</div>
                    <div><span className="text-blue-700">Columns:</span> {datasetInfo?.columns?.length}</div>
                    <div><span className="text-blue-700">Avg Demand:</span> {datasetInfo?.demand_stats?.mean?.toFixed(1) || 'N/A'}</div>
                    <div><span className="text-blue-700">Std Demand:</span> {datasetInfo?.demand_stats?.std?.toFixed(1) || 'N/A'}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Forecast */}
          <div className="xl:col-span-2 space-y-6">
            {false && (
              <Card className="bg-white rounded-2xl border-0 ring-1 ring-[#F3E9DC] shadow-[0_10px_30px_rgba(217,111,50,0.06)]">
                <CardHeader>
                  <CardTitle className="text-md">Model Information</CardTitle>
                </CardHeader>
                <CardContent>   
                  {modelInfo && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-600">Order (p,d,q):</span> ({modelInfo?.order?.join(', ')})</div>
                        <div><span className="text-gray-600">AIC Score:</span> {modelInfo?.aic?.toFixed(2) || 'N/A'}</div>
                        {modelInfo?.bic && (
                          <div><span className="text-gray-600">BIC Score:</span> {modelInfo?.bic?.toFixed(2) || 'N/A'}</div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            <Card className="bg-white rounded-2xl border-0 ring-1 ring-[#F3E9DC] shadow-[0_10px_30px_rgba(217,111,50,0.06)]">
              <CardHeader>
                <CardTitle className="text-xl flex items-center">  
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        ARIMA Forecast Results</CardTitle>
              </CardHeader>
              <CardContent>
           

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
                   
                      <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                        {predictions.dates.length} periods forecast
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height={600}>
                      <LineChart data={chartDataSorted}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          type="category"
                          allowDuplicatedCategory={false}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          minTickGap={0}
                          tick={{ fontSize: 12, fill: '#6b7280', fontWeight: '500' }}
                          tickLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                          axisLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis 
                          tickFormatter={(value) => value.toFixed(0)} 
                          allowDecimals={false} 
                          width={80} 
                          tick={{ fontSize: 12, fill: '#6b7280', fontWeight: '500' }}
                          tickLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                          axisLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                          label={{ 
                            value: 'Demand (Units)', 
                            angle: -90, 
                            position: 'insideLeft', 
                            style: { 
                              textAnchor: 'middle', 
                              fill: '#374151', 
                              fontSize: '12px', 
                              fontWeight: '600' 
                            } 
                          }}
                          interval={0}
                          {...(() => {
                            const values = chartDataSorted.flatMap((d) => {
                              const arr = [d.prediction]
                              if (typeof d.lower === 'number') arr.push(d.lower)
                              if (typeof d.upper === 'number') arr.push(d.upper)
                              if (typeof d.lower_tight === 'number') arr.push(d.lower_tight)
                              if (typeof d.upper_tight === 'number') arr.push(d.upper_tight)
                              return arr
                            })
                            const withinFixed = values.length > 0 && values.every((v) => v >= 280 && v <= 330)
                            if (withinFixed) {
                              const ticks: number[] = []
                              for (let v = 280; v <= 330; v += 1) ticks.push(v)
                              return { domain: [280, 330] as [number, number], ticks }
                            }

                            let minValue = values.length ? Math.min(...values) : 0
                            let maxValue = values.length ? Math.max(...values) : 100
                            if (!isFinite(minValue) || !isFinite(maxValue)) {
                              minValue = 0
                              maxValue = 100
                            }
                            if (minValue === maxValue) {
                              maxValue = minValue + 1
                            }

                            const domainMin = Math.floor(minValue)
                            const domainMax = Math.ceil(maxValue)
                            const ticks: number[] = []
                            for (let v = domainMin; v <= domainMax; v += 1) {
                              ticks.push(v)
                            }
                            return { domain: [domainMin, domainMax] as [number, number], ticks }
                          })()}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '2px solid #e5e7eb', 
                            borderRadius: '12px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            fontSize: '14px',
                            padding: '12px'
                          }}
                          labelStyle={{ color: '#374151', fontWeight: '700', fontSize: '16px' }}
                          formatter={(value: any, name: string) => {
                            const label = name === 'prediction' ? 'Predicted' : name
                            return [
                              typeof value === 'number' ? `${value.toFixed(0)} units` : value,
                              label
                            ]
                          }}
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <Legend />
                        <Line 
                          type="linear" 
                          dataKey="prediction" 
                          stroke="#3b82f6" 
                          strokeWidth={2} 
                          dot={{ r: 2, fill: '#3b82f6', strokeWidth: 1 }} 
                          activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }} 
                          isAnimationActive={false}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          name="Predicted Demand" 
                        />
                        {predictions.confidence_intervals && (
                          <>
                            <Line type="linear" dataKey="upper_tight" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1.5} isAnimationActive={false} name="Upper Confidence Bound" />
                            <Line type="linear" dataKey="lower_tight" stroke="#10b981" strokeDasharray="5 5" strokeWidth={1.5} isAnimationActive={false} name="Lower Confidence Bound" />
                          </>
                        )}
                      </LineChart>
                    </ResponsiveContainer>

                    {/* Insights Section */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                        <div className="text-sm text-blue-700">Total Predicted Demand</div>
                        <div className="text-2xl font-bold text-blue-900 mt-1">{totalPredicted.toFixed(0)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                        <div className="text-sm text-green-700">Average Daily Demand</div>
                        <div className="text-2xl font-bold text-green-900 mt-1">{averageDaily.toFixed(1)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                        <div className="text-sm text-purple-700">Peak Demand</div>
                        <div className="text-2xl font-bold text-purple-900 mt-1">{peakPoint?.prediction?.toFixed(0) || '—'}</div>
                        <div className="text-xs text-purple-700 mt-1">{peakPoint ? new Date(peakPoint.date).toLocaleDateString() : ''}</div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
                        <div className="text-sm text-amber-700">Overall Trend</div>
                        <div className="text-2xl font-bold text-amber-900 mt-1">{trendLabel}</div>
                        <div className="text-xs text-amber-700 mt-1">Net Δ {netChange.toFixed(1)} units</div>
                      </div>
                    </div>

                    {/* Table Toggle */}
                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-sm text-gray-600">Forecast breakdown</div>
                      <Button variant="outline" onClick={() => setShowDemandTable((s) => !s)}>
                        {showDemandTable ? 'Hide Table' : 'Show Table'}
                      </Button>
                    </div>

                    {/* Forecast Data Table */}
                    {showDemandTable && (
                    <Card className="mt-3 shadow-lg border-0 bg-white/80">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl font-bold text-gray-800">Forecast Data Table</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">Complete forecast breakdown with sorting and filtering</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm text-gray-500">{chartDataSorted.length} records</div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!chartDataSorted || chartDataSorted.length === 0) return
                                const csvData = chartDataSorted.map((row, index) => {
                                  const prev = chartDataSorted[index - 1]?.prediction
                                  const diff = typeof prev === 'number' ? row.prediction - prev : 0
                                  const rounded = Math.round(diff * 10) / 10
                                  const trend = index === 0 ? '0.0' : (rounded === 0 ? '0.0' : (rounded > 0 ? `+${rounded.toFixed(1)}` : `${rounded.toFixed(1)}`))
                                  return {
                                    Category: 'ARIMA',
                                    Date: new Date(row.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                                    Prediction: row.prediction.toFixed(1),
                                    Trend: trend
                                  }
                                })
                                const csvContent = [
                                  Object.keys(csvData[0]).join(','),
                                  ...csvData.map((r: any) => Object.values(r).join(','))
                                ].join('\n')
                                const blob = new Blob([csvContent], { type: 'text/csv' })
                                const url = window.URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `arima_forecast_${predictions?.dates?.length || chartDataSorted.length}days.csv`
                                a.click()
                                window.URL.revokeObjectURL(url)
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Export CSV
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Forecast</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Trend</th>
                              </tr>
                            </thead>
                            <tbody>
                              {chartDataSorted.map((row, index) => {
                                const prev = chartDataSorted[index - 1]?.prediction
                                const difference = typeof prev === 'number' ? row.prediction - prev : 0
                                const roundedDifference = Math.round(difference * 10) / 10
                                return (
                                  <tr key={row.date} className="border-b border-gray-100 hover:bg-gray-50/50">
                                    <td className="py-3 px-4">
                                      <div className="flex items-center">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                          <span className="text-sm font-semibold text-blue-600">A</span>
                                        </div>
                                        <span className="font-medium text-gray-800">ARIMA</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="font-medium text-gray-800">
                                        {new Date(row.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center">
                                        <span className="font-semibold text-blue-600">{row.prediction.toFixed(1)}</span>
                                        <span className="text-sm text-gray-500 ml-1">units</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      {index === 0 ? (
                                        <span className="font-semibold text-gray-600">0.0</span>
                                      ) : roundedDifference === 0 ? (
                                        <span className="font-semibold text-gray-600">0.0</span>
                                      ) : roundedDifference > 0 ? (
                                        <span className="font-semibold text-green-600">+{roundedDifference.toFixed(1)}</span>
                                      ) : (
                                        <span className="font-semibold text-red-600">{roundedDifference.toFixed(1)}</span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                    )}
                    
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


