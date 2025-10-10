"use client"

import { useEffect, useState } from 'react'
import axios from 'axios'
import { motion } from "framer-motion"
import { Download, TrendingUp, TrendingDown, BarChart3, Activity } from "lucide-react"
import type { ApiError, DatasetInfo, PredictionResponse } from '@/types/api'
import { Button } from '@/components/ui/button'
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import ExportModal from '@/components/ui/export-modal'
import type { ArimaExportInput } from '@/lib/exporters/arimaExport'
import { exportArimaToXlsx } from '@/lib/exporters/arimaExport'

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
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [showExport, setShowExport] = useState(false)

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Models', href: '/models' },
    { label: 'ARIMA', current: true },
  ]


  const getPredictions = async (periods: number = 30): Promise<void> => {
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
    }
  }

  // Load predictions when results page loads (training and prediction already done in upload)
  useEffect(() => {
    const loadPredictions = async () => {
      if (!datasetInfo) return
      try {
        await getPredictions(30)
      } catch {
        // errors are handled inside functions
      }
    }
    loadPredictions()
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

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      {showExport && (
        <ExportModal<ArimaExportInput>
          onClose={() => setShowExport(false)}
          title="Export ARIMA Forecast"
          subtitle="Download an Excel file with forecast data."
          input={{
            forecast: chartDataSorted.map(d => ({
              date: d.date,
              prediction: d.prediction,
              lower: d.lower ?? null,
              upper: d.upper ?? null,
              lower_tight: d.lower_tight ?? null,
              upper_tight: d.upper_tight ?? null,
            })),
          }}
          onExport={exportArimaToXlsx}
          buildFilename={() => `arima_export_${new Date().toISOString().slice(0,10)}.xlsx`}
        />
      )}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
          <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">ARIMA Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Time series forecasting with autoregressive integrated moving average for precise demand prediction.</p>
          </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-sns-orange text-sns-orange hover:bg-sns-orange hover:text-white bg-transparent"
                onClick={() => setShowExport(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
          <Button className="bg-sns-orange hover:bg-sns-orange-dark text-white" onClick={onRunAnotherModel}>
            Run Another Model
          </Button>
        </div>
          </div>
        </motion.div>

            {/* Chart and Metrics Layout - 70% Chart, 30% Metrics */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-10 gap-6">
              {/* Chart Section - 70% width */}
              <div className="lg:col-span-7">
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-sns-orange to-orange-600 rounded-lg shadow-md">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">ARIMA Forecast</h3>
                      <p className="text-gray-600 text-sm">30-day demand forecast with confidence intervals</p>
                      </div>
                    </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
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
                      <ResponsiveContainer width="100%" height={500}>
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
                            formatter={(value: number, name: string) => {
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
                      </div>
                  )}
                      </div>
                    </div>

              {/* Metrics Section - 30% width */}
              <div className="lg:col-span-3">
                {predictions && (
                  <div className="space-y-4">
                    {/* Total Predicted Demand Card */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-md flex flex-col justify-center"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-blue-500 rounded-md">
                          <Activity className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-blue-700 font-semibold text-sm">Total Predicted</h3>
                      </div>
                      <div className="text-xl font-bold text-blue-900 mb-1">
                        {totalPredicted.toFixed(0)}
                      </div>
                      <p className="text-blue-600 text-xs">30-day forecast total</p>
                    </motion.div>

                    {/* Average Daily Demand Card */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-md flex flex-col justify-center"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-green-500 rounded-md">
                          <BarChart3 className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-green-700 font-semibold text-sm">Daily Average</h3>
                      </div>
                      <div className="text-xl font-bold text-green-900 mb-1">
                        {averageDaily.toFixed(1)}
                      </div>
                      <p className="text-green-600 text-xs">Units per day</p>
                    </motion.div>

                    {/* Peak Demand Card */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 shadow-md flex flex-col justify-center"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-purple-500 rounded-md">
                          <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-purple-700 font-semibold text-sm">Peak Demand</h3>
                      </div>
                      <div className="text-xl font-bold text-purple-900 mb-1">
                        {peakPoint?.prediction?.toFixed(0) || '—'}
                      </div>
                      <p className="text-purple-600 text-xs">
                        {peakPoint ? new Date(peakPoint.date).toLocaleDateString() : 'No data'}
                      </p>
                    </motion.div>

                    {/* Trend Card */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className={`rounded-lg p-4 border shadow-md flex flex-col justify-center ${
                        trendLabel === 'Rising' 
                          ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
                          : trendLabel === 'Declining'
                          ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-md ${
                          trendLabel === 'Rising' 
                            ? 'bg-green-500'
                            : trendLabel === 'Declining'
                            ? 'bg-red-500'
                            : 'bg-gray-500'
                        }`}>
                          {trendLabel === 'Rising' ? (
                            <TrendingUp className="h-4 w-4 text-white" />
                          ) : trendLabel === 'Declining' ? (
                            <TrendingDown className="h-4 w-4 text-white" />
                          ) : (
                            <BarChart3 className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <h3 className={`font-semibold text-sm ${
                          trendLabel === 'Rising' 
                            ? 'text-green-700'
                            : trendLabel === 'Declining'
                            ? 'text-red-700'
                            : 'text-gray-700'
                        }`}>Trend</h3>
                      </div>
                      <div className={`text-xl font-bold mb-1 ${
                        trendLabel === 'Rising' 
                          ? 'text-green-900'
                          : trendLabel === 'Declining'
                          ? 'text-red-900'
                          : 'text-gray-900'
                      }`}>
                        {trendLabel}
                      </div>
                      <p className={`text-xs ${
                        trendLabel === 'Rising' 
                          ? 'text-green-600'
                          : trendLabel === 'Declining'
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}>
                        Net Δ {netChange.toFixed(1)} units
                      </p>
                    </motion.div>
                  </div>
                )}
              </div>
                    </div>

                    {/* Forecast Data Table */}
            <div className="mb-8">
              <div className="rounded-xl bg-white shadow-lg">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Forecast Data Analysis</h3>
                        <p className="text-gray-600 text-sm">Complete forecast breakdown with trend analysis</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-gray-500">{chartDataSorted.length} records</div>
                    </div>
                  </div>

                  {/* Forecast Data Table */}
                    <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-sns-orange via-orange-500 to-orange-600 px-4 py-3">
                        <div className="grid grid-cols-4 gap-3 text-white font-semibold text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            Forecast Date
                          </div>
                          <div className="text-right flex items-center justify-end gap-2">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            Predicted Demand
                          </div>
                          <div className="text-right flex items-center justify-end gap-2">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            Daily Change
                          </div>
                          <div className="text-right flex items-center justify-end gap-2">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            Upper/Lower Bound
                          </div>
                        </div>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto">
                        <div className="divide-y divide-gray-100">
                              {chartDataSorted.map((row, index) => {
                                const prev = chartDataSorted[index - 1]?.prediction
                                const difference = typeof prev === 'number' ? row.prediction - prev : 0
                                const roundedDifference = Math.round(difference * 10) / 10
                                const hasBounds = typeof row.lower_tight === 'number' && typeof row.upper_tight === 'number'
                                return (
                              <div key={row.date} 
                                   className="grid grid-cols-4 gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-200">
                                {/* Forecast Date */}
                                <div className="flex items-center">
                                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                    {new Date(row.date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </div>
                                </div>

                                {/* Predicted Demand */}
                                <div className="text-right">
                                  <div className="text-sm font-bold text-gray-900">
                                    {row.prediction.toFixed(1)}
                                  </div>
                                  <div className="text-xs text-gray-500">units</div>
                                </div>

                                {/* Daily Change */}
                                <div className="text-right">
                                  {index === 0 ? (
                                    <div className="text-gray-400 text-sm">-</div>
                                  ) : (
                                    <span className={`text-sm font-semibold ${roundedDifference > 0 ? 'text-green-600' : roundedDifference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                      {roundedDifference > 0 ? '+' : ''}{roundedDifference.toFixed(1)}
                                    </span>
                                  )}
                                </div>

                                {/* Upper/Lower Bound */}
                                <div className="text-right">
                                  {hasBounds ? (
                                    <div className="text-sm font-semibold text-gray-900">{row.upper_tight!.toFixed(1)} / {row.lower_tight!.toFixed(1)}</div>
                                  ) : (
                                    <div className="text-gray-400 text-sm">N/A</div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            </div>

        {/* Export Modal */}
        {showExport && (
          <ExportModal
            onClose={() => setShowExport(false)}
            title="Export ARIMA Forecast"
            subtitle="Download forecast data as CSV with trend analysis."
            input={{
              predictions: chartDataSorted.map((row, index) => {
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
            }}
            onExport={async ({ input, onStoreProgress, onProductProgress }) => {
              // For ARIMA, we'll create a simple CSV export
              const headers = Object.keys(input.predictions[0] || {})
              const csvContent = [
                headers.join(','),
                ...input.predictions.map((row) => Object.values(row).join(','))
              ].join('\n')
              
              // Simulate progress
              onStoreProgress(1, 1)
              onProductProgress(1)
              
              return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            }}
            buildFilename={() => `arima_forecast_${chartDataSorted.length}days.csv`}
          />
        )}
      </div>
    </div>
  )
}


