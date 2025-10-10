"use client"

import { motion } from "framer-motion"
import { Download, TrendingUp, TrendingDown, BarChart3, Activity, Shield, Target } from "lucide-react"
import { useEffect, useState } from 'react'
import axios from 'axios'
import type { ApiError, DatasetInfo, ModelInfo, PredictionResponse, PriceOptimizationResponse } from '@/types/api'
// removed unused Card imports
import { Button } from '@/components/ui/button'
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, BarChart, Bar } from 'recharts'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import LoaderSpinner from '@/components/ui/loader'
import ExportModal from '@/components/ui/export-modal'
import type { ArimaxExportInput } from '@/lib/exporters/arimaxExport'
import { exportArimaxToXlsx } from '@/lib/exporters/arimaxExport'

interface ResultsProps {
  datasetInfo: DatasetInfo | null
  onRunAnotherModel: () => void
}

interface ChartData {
  date: string
  prediction: number
  lower_bound?: number
  upper_bound?: number
  lower_tight?: number
  upper_tight?: number
}

interface OptimizationChartData {
  price: number
  predicted_demand: number
  profit: number
  demand_lower?: number
  demand_upper?: number
  profit_lower?: number
  profit_upper?: number
}

interface OptimizationParams {
  base_price: number
  cost_per_unit: number
  price_range: number
  steps: number
  include_confidence: boolean
}

interface ApiModelInfo {
  aic: number
  bic?: number
  llf?: number
}

// interface OptimizationResult {
//   price: number
//   elasticity: number
//   month_1: MonthlyAnalysis
//   month_2: MonthlyAnalysis
//   month_3: MonthlyAnalysis
// }

// interface ElasticityThresholds {
//   high_elasticity: number | null
//   low_elasticity: number | null
//   optimal_range: {
//     min: number | null
//     max: number | null
//   }
// }
export default function Results({ datasetInfo, onRunAnotherModel }: ResultsProps) {
  const [predicting, setPredicting] = useState<boolean>(false)
  const [optimizing, setOptimizing] = useState<boolean>(false)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null)
  const [optimizationResults, setOptimizationResults] = useState<PriceOptimizationResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [autoRan, setAutoRan] = useState<boolean>(false)
  const [predictionType, setPredictionType] = useState<'auto' | 'upload'>('auto')
  const [futureFile, setFutureFile] = useState<File | null>(null)
  const [predictionPeriod, setPredictionPeriod] = useState<number>(30) // Default to 30 days
  const [activeTab, setActiveTab] = useState<'demand' | 'pricing'>('demand')
  // removed unused metrics loading state
  const [exportOpen, setExportOpen] = useState<boolean>(false)

  const [optimizationParams, setOptimizationParams] = useState<OptimizationParams>({
    base_price: 10,
    cost_per_unit: 0.6,
    price_range: 0.3,
    steps: 15,
    include_confidence: true
  })

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Models', href: '/models' },
    { label: 'ARIMAX', current: true },
  ]

  const trainModel = async (): Promise<void> => {
    setError('')

    try {
      const response = await axios.post<{ model_info: ApiModelInfo }>('http://localhost:8000/api/arimax/train/')
      // Transform the API response to match our ModelInfo interface
      const apiModelInfo = response.data.model_info
      const transformedModelInfo: ModelInfo = {
        order: [1, 1, 1], // Default ARIMAX order
        seasonal_order: [0, 0, 0, 0], // Default seasonal order
        exog_features: ['price', 'ads', 'holidays', 'promotions'], // Default features
        aic: apiModelInfo.aic,
        bic: apiModelInfo.bic,
        llf: apiModelInfo.llf
      }
      setModelInfo(transformedModelInfo)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError((err.response.data as ApiError).error || 'Training failed')
      } else {
        setError('Training failed')
      }
    } finally {
      // no-op
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
    } catch {
      setError('Error downloading template')
    }
  }

  const getPredictions = async (periods: number = predictionPeriod): Promise<void> => {
    setPredicting(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('prediction_type', predictionType)
      formData.append('periods', periods.toString())
      formData.append('include_confidence', 'true')
      
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
          cost_per_unit: optimizationParams.cost_per_unit,
          include_confidence: optimizationParams.include_confidence
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

  const handleOptimizationParamChange = (param: keyof OptimizationParams, value: string | boolean) => {
    if (typeof value === 'boolean') {
      setOptimizationParams(prev => ({
        ...prev,
        [param]: value
      }))
    } else {
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        setOptimizationParams(prev => ({
          ...prev,
          [param]: numValue
        }))
      }
    }
  }

  // Auto-run training and then predictions once the results page loads after upload
  useEffect(() => {
    const run = async () => {
      if (autoRan) return
      if (!datasetInfo) return
      setAutoRan(true)
      try {
        await trainModel()
        await getPredictions(predictionPeriod)
      } catch {
        // errors are handled inside functions
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetInfo])

  const predictionChartData: ChartData[] = predictions
    ? predictions.dates.map((date, index) => {
        const prediction = predictions.predictions[index] || 0
        const lower = predictions.confidence_intervals?.lower?.[index]
        const upper = predictions.confidence_intervals?.upper?.[index]
        const hasBoth = typeof lower === 'number' && typeof upper === 'number'
        const shrinkFactor = 0.2 // bring bands 20% of the distance from prediction to bounds (tighter bounds)
        const lower_tight = hasBoth ? prediction - (prediction - (lower as number)) * shrinkFactor : undefined
        const upper_tight = hasBoth ? prediction + ((upper as number) - prediction) * shrinkFactor : undefined
        return {
        date,
          prediction,
          lower_bound: lower,
          upper_bound: upper,
          lower_tight,
          upper_tight,
        }
      })
    : []

  // Ensure strict chronological order for accurate day-to-day variation
  const chartDataSorted = predictionChartData.length > 0
    ? [...predictionChartData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : predictionChartData

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

  const optimizationChartData: OptimizationChartData[] = optimizationResults?.optimization_results || []

  const isPageLoading = !predictions

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {exportOpen && predictions && (
        <ExportModal<ArimaxExportInput>
          onClose={() => setExportOpen(false)}
          title="Export ARIMAX Results"
          subtitle="Download an Excel file with forecast and pricing analysis."
          input={{
            forecast: chartDataSorted.map(d => ({
              date: d.date,
              prediction: d.prediction,
              lower_bound: d.lower_bound ?? null,
              upper_bound: d.upper_bound ?? null,
              lower_tight: d.lower_tight ?? null,
              upper_tight: d.upper_tight ?? null,
            })),
            pricing: (optimizationResults?.optimization_results || []).map(r => ({
              price: r.price,
              predicted_demand: r.predicted_demand,
              profit: r.profit,
              demand_lower: r.confidence_intervals?.demand_lower ?? null,
              demand_upper: r.confidence_intervals?.demand_upper ?? null,
              profit_lower: r.confidence_intervals?.profit_lower ?? null,
              profit_upper: r.confidence_intervals?.profit_upper ?? null,
            })),
          }}
          onExport={exportArimaxToXlsx}
          buildFilename={() => `arimax_export_${new Date().toISOString().slice(0,10)}.xlsx`}
        />
      )}
      {isPageLoading && (
        <LoaderSpinner fullscreen size="md" message={'Processing your data...'} />
      )}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">ARIMAX Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Advanced forecasting with external variables and price optimization for high-performance demand prediction.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-sns-orange text-sns-orange hover:bg-sns-orange hover:text-white bg-transparent"
                onClick={() => setExportOpen(true)}
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

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="inline-flex gap-2 border rounded-lg p-1 bg-white shadow-sm">
            <button
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'demand' 
                  ? 'bg-sns-orange text-white shadow-md' 
                  : 'text-gray-700 hover:text-sns-orange hover:bg-sns-orange/10'
              }`}
              onClick={() => setActiveTab('demand')}
            >
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Demand Forecasting
              </div>
            </button>
            <button
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'pricing' 
                  ? 'bg-sns-orange text-white shadow-md' 
                  : 'text-gray-700 hover:text-sns-orange hover:bg-sns-orange/10'
              }`}
              onClick={() => setActiveTab('pricing')}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Price Analysis
              </div>
            </button>
          </div>
        </div>

        {/* Demand Forecasting Tab */}
        {activeTab === 'demand' && (
          <div>
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
                      <h3 className="text-xl font-bold text-gray-900">Demand Forecast</h3>
                      <p className="text-gray-600 text-sm">Interactive demand forecasting with confidence intervals</p>
                    </div>
                  </div>
                  
                  {/* Prediction Controls */}
                  <div className="mb-6 p-4 rounded-lg shadow-sm border bg-white/80 backdrop-blur-sm">
                    <h3 className="font-semibold text-blue-900 mb-3">Prediction Controls</h3>
                  
                  <div className="space-y-4">
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prediction Period
                        </label>
                        <select
                          value={predictionPeriod}
                          onChange={(e) => setPredictionPeriod(Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                          <option value={30}>1 Month (30 days)</option>
                          <option value={60}>2 Months (60 days)</option>
                          <option value={90}>3 Months (90 days)</option>
                        </select>
                      </div>

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
                            <Button
                              onClick={downloadTemplate}
                              variant="outline"
                              className="border-sns-orange text-sns-orange hover:bg-sns-orange hover:text-white"
                            >
                              Download Template
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => getPredictions(predictionPeriod)}
                      disabled={predicting || !modelInfo || (predictionType === 'upload' && !futureFile)}
                      className="bg-sns-orange hover:bg-sns-orange-dark text-white "
                    >
                      {predicting ? `Generating ${predictionPeriod}-day Forecast...` : `Generate ${predictionPeriod}-day Forecast`}
                    </Button>
                  </div>
                </div>

                  {/* Forecast Results */}
                  {predictions && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">ARIMAX Forecast Results</h3>
                        <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                          {predictions.dates.length} periods forecast
                        </span>
                      </div>
                      <div className="h-[420px] md:h-[520px] bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartDataSorted} margin={{ top: 30, right: 40, left: 30, bottom: 30 }}>
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke="#e2e8f0" 
                          strokeOpacity={0.6}
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="date" 
                          type="category"
                          allowDuplicatedCategory={false}
                          interval="preserveStartEnd"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          minTickGap={20}
                          tick={{ 
                            fontSize: 11, 
                            fill: '#64748b', 
                            fontWeight: '500',
                            fontFamily: 'Inter, system-ui, sans-serif'
                          }}
                          tickLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                          axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return date.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })
                          }}
                        />
                        <YAxis 
                          tickFormatter={(value) => {
                            // Professional number formatting
                            if (value >= 1000000) {
                              return `${(value / 1000000).toFixed(1)}M`
                            } else if (value >= 1000) {
                              return `${(value / 1000).toFixed(1)}k`
                            } else if (value >= 100) {
                              return value.toFixed(0)
                            } else if (value >= 10) {
                              return value.toFixed(1)
                            } else {
                              return value.toFixed(2)
                            }
                          }} 
                          allowDecimals={true} 
                          width={100} 
                          tick={{ 
                            fontSize: 12, 
                            fill: '#475569', 
                            fontWeight: '600',
                            fontFamily: 'Inter, system-ui, sans-serif'
                          }}
                          tickLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
                          axisLine={{ stroke: '#94a3b8', strokeWidth: 2 }}
                          label={{ 
                            value: 'Demand (Units)', 
                            angle: -90, 
                            position: 'insideLeft', 
                            style: { 
                              textAnchor: 'middle', 
                              fill: '#1e293b', 
                              fontSize: '14px', 
                              fontWeight: '700',
                              fontFamily: 'Inter, system-ui, sans-serif'
                            } 
                          }}
                          {...(() => {
                            const values = chartDataSorted.flatMap((d) => {
                              const arr = [d.prediction]
                              if (typeof d.lower_bound === 'number') arr.push(d.lower_bound)
                              if (typeof d.upper_bound === 'number') arr.push(d.upper_bound)
                              if (typeof d.lower_tight === 'number') arr.push(d.lower_tight)
                              if (typeof d.upper_tight === 'number') arr.push(d.upper_tight)
                              return arr
                            }).filter(v => isFinite(v) && v > 0)
                            
                            if (values.length === 0) {
                              return { domain: [0, 100] as [number, number] }
                            }

                            const minValue = Math.min(...values)
                            const maxValue = Math.max(...values)
                            const range = maxValue - minValue
                            
                            // Professional Y-axis scaling with intelligent padding
                            let padding = range * 0.15  // 15% padding for better visualization
                            
                            // Ensure minimum padding for small ranges
                            if (range < 50) {
                              padding = Math.max(padding, 10)
                            }
                            
                            const domainMin = Math.max(0, Math.floor(minValue - padding))
                            const domainMax = Math.ceil(maxValue + padding)
                            
                            // Generate professional tick marks with smart intervals
                            const totalRange = domainMax - domainMin
                            let tickStep: number
                            
                            // Smart tick step calculation based on range
                            if (totalRange < 100) {
                              tickStep = Math.ceil(totalRange / 8 / 5) * 5  // Round to nearest 5
                            } else if (totalRange < 1000) {
                              tickStep = Math.ceil(totalRange / 8 / 10) * 10  // Round to nearest 10
                            } else if (totalRange < 10000) {
                              tickStep = Math.ceil(totalRange / 8 / 100) * 100  // Round to nearest 100
                            } else {
                              tickStep = Math.ceil(totalRange / 8 / 1000) * 1000  // Round to nearest 1000
                            }
                            
                            // Ensure minimum tick step
                            tickStep = Math.max(tickStep, 1)
                            
                            // Generate clean tick marks
                            const ticks: number[] = []
                            const startTick = Math.ceil(domainMin / tickStep) * tickStep
                            
                            for (let tick = startTick; tick <= domainMax; tick += tickStep) {
                              if (tick >= domainMin && tick <= domainMax) {
                                ticks.push(tick)
                              }
                            }
                            
                            // Ensure we have at least 3 ticks
                            if (ticks.length < 3) {
                              const midPoint = (domainMin + domainMax) / 2
                              ticks.length = 0
                              ticks.push(domainMin, Math.round(midPoint), domainMax)
                            }
                            
                            return { 
                              domain: [domainMin, domainMax] as [number, number], 
                              ticks: ticks
                            }
                          })()}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '12px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            fontSize: '13px',
                            padding: '16px',
                            fontFamily: 'Inter, system-ui, sans-serif'
                          }}
                          labelStyle={{ 
                            color: '#1e293b', 
                            fontWeight: '600', 
                            fontSize: '14px',
                            fontFamily: 'Inter, system-ui, sans-serif',
                            marginBottom: '8px'
                          }}
                          formatter={(value: number | string, name: string): [string, string] => {
                            const formattedValue = typeof value === 'number' ? value.toLocaleString() : String(value)
                            const labels: { [key: string]: string } = {
                              'prediction': 'Predicted Demand',
                              'upper_tight': 'Upper Confidence',
                              'lower_tight': 'Lower Confidence',
                              'upper_bound': 'Upper Bound',
                              'lower_bound': 'Lower Bound'
                            }
                            return [
                              `${formattedValue} units`,
                              labels[name] || name
                            ]
                          }}
                          labelFormatter={(value) => {
                            const date = new Date(value)
                            return date.toLocaleDateString('en-US', { 
                              weekday: 'short',
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '13px', fontFamily: 'Inter, system-ui, sans-serif' }} />
                        <Line 
                          type="linear" 
                          dataKey="prediction" 
                          stroke="#3b82f6" 
                          strokeWidth={3} 
                          dot={{ 
                            r: 3, 
                            fill: '#3b82f6', 
                            strokeWidth: 2,
                            stroke: '#ffffff'
                          }} 
                          activeDot={{ 
                            r: 6, 
                            stroke: '#3b82f6', 
                            strokeWidth: 3,
                            fill: '#ffffff',
                            filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.3))'
                          }} 
                          isAnimationActive={true}
                          animationDuration={1500}
                          animationEasing="ease-out"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          name="Predicted Demand" 
                        />
                        {predictions.confidence_intervals && (
                          <>
                            <Line 
                              type="linear" 
                              dataKey="upper_tight" 
                              stroke="#ef4444" 
                              strokeDasharray="8 4" 
                              strokeWidth={2} 
                              dot={false}
                              isAnimationActive={true}
                              animationDuration={2000}
                              animationEasing="ease-out"
                              name="Upper Confidence" 
                            />
                            <Line 
                              type="linear" 
                              dataKey="lower_tight" 
                              stroke="#10b981" 
                              strokeDasharray="8 4" 
                              strokeWidth={2} 
                              dot={false}
                              isAnimationActive={true}
                              animationDuration={2000}
                              animationEasing="ease-out"
                              name="Lower Confidence" 
                            />
                          </>
                        )}
                        
                        {/* Average Reference Line */}
                        <Line 
                          type="monotone" 
                          dataKey={() => averageDaily} 
                          stroke="#f59e0b" 
                          strokeDasharray="4 8" 
                          strokeWidth={2} 
                          dot={false}
                          isAnimationActive={true}
                          animationDuration={2500}
                          animationEasing="ease-out"
                          name={`Average (${averageDaily.toFixed(1)})`}
                          strokeOpacity={0.8}
                        />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Metrics Section - 30% width */}
              <div className="lg:col-span-3">
                        <div className="space-y-4">
                          {/* Total Forecast Card */}
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-md flex flex-col justify-center"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 bg-blue-500 rounded-md">
                                <Activity className="h-4 w-4 text-white" />
                              </div>
                              <h3 className="text-blue-700 font-semibold text-sm">Total Forecast</h3>
                            </div>
                            <div className="text-xl font-bold text-blue-900 mb-1">
                              {totalPredicted.toLocaleString()}
                            </div>
                            <p className="text-blue-600 text-xs">units over {(predictions?.dates.length ?? chartDataSorted.length)} days</p>
                          </motion.div>

                          {/* Daily Average Card */}
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
                            <p className="text-green-600 text-xs">units per day</p>
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
                              {peakPoint?.prediction?.toLocaleString() || '—'}
                            </div>
                            <p className="text-purple-600 text-xs">
                              {peakPoint ? new Date(peakPoint.date).toLocaleDateString() : 'No peak data'}
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
                      </div>
                    </div>

                    {/* Table banner removed */}

                    {/* Professional Forecast Data Table */}
                    <div className="mb-8">
                      <div className="rounded-xl bg-white shadow-lg">
                        <div className="p-6">
                          {/* Professional Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">Forecast Analysis</h3>
                                <p className="text-gray-600 text-sm">Daily forecast breakdown with confidence intervals</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Professional Table Container */}
                          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                            {/* Enhanced Table Header */}
                            <div className="bg-gradient-to-r from-sns-orange via-orange-500 to-orange-600 px-4 py-3">
                              <div className="grid grid-cols-5 gap-4 text-white font-semibold text-xs">
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
                                  Lower Bound
                                </div>
                                <div className="text-right flex items-center justify-end gap-2">
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                  Upper Bound
                                </div>
                              </div>
                            </div>

                            {/* Enhanced Table Body */}
                            <div className="max-h-96 overflow-y-auto">
                              <div className="divide-y divide-gray-100">
                                {chartDataSorted.map((row, index) => {
                                  const prev = chartDataSorted[index - 1]?.prediction
                                  const diff = typeof prev === 'number' ? row.prediction - prev : 0
                                  const delta = Math.round(diff * 10) / 10
                                  const lowerVal = (typeof row.lower_tight === 'number' ? row.lower_tight : row.lower_bound)
                                  const upperVal = (typeof row.upper_tight === 'number' ? row.upper_tight : row.upper_bound)
                                  const hasLower = typeof lowerVal === 'number'
                                  const hasUpper = typeof upperVal === 'number'
                                  return (
                                    <div
                                      key={row.date}
                                      className="grid grid-cols-5 gap-4 px-4 py-3 items-center hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-200"
                                    >
                                      {/* Date */}
                                      <div className="flex items-center">
                                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                          {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </div>
                                      </div>
                                      
                                      {/* Predicted Demand */}
                                      <div className="text-right tabular-nums">
                                        <div className="text-sm font-bold text-gray-900">{row.prediction.toFixed(1)}</div>
                                        <div className="text-xs text-gray-500">units</div>
                                      </div>
                                      
                                      {/* Daily Change */}
                                      <div className="text-right tabular-nums">
                                        {index === 0 ? (
                                          <div className="text-gray-400 text-sm">-</div>
                                        ) : (
                                          <div className="flex items-center justify-end gap-1">
                                            {delta > 0 ? (
                                              <TrendingUp className="h-4 w-4 text-green-500" />
                                            ) : delta < 0 ? (
                                              <TrendingDown className="h-4 w-4 text-red-500" />
                                            ) : (
                                              <div className="h-4 w-4 bg-gray-300 rounded-full"></div>
                                            )}
                                            <span className={`text-sm font-semibold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Lower Bound */}
                                      <div className="text-right tabular-nums">
                                        {hasLower ? (
                                          <div className="text-sm font-semibold text-gray-900">{(lowerVal as number).toFixed(1)}</div>
                                        ) : (
                                          <div className="text-gray-400 text-sm">N/A</div>
                                        )}
                                        <div className="text-xs text-gray-500">units</div>
                                      </div>
                                      
                                      {/* Upper Bound */}
                                      <div className="text-right tabular-nums">
                                        {hasUpper ? (
                                          <div className="text-sm font-semibold text-gray-900">{(upperVal as number).toFixed(1)}</div>
                                        ) : (
                                          <div className="text-gray-400 text-sm">N/A</div>
                                        )}
                                        <div className="text-xs text-gray-500">units</div>
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
                  </div>
                )}
              </div>
      

        {/* Price Analysis Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-8">
            <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="p-2 bg-sns-orange rounded-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                Price Optimization & Analysis
              </h3>
              <p className="text-gray-600 mb-6">
                Advanced price elasticity analysis and revenue optimization for demand forecasting.
              </p>
              {/* Price Optimization Controls */}
              <div className="mb-6 p-4 shadow-md rounded-lg border bg-white/80 backdrop-blur-sm">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Price Optimization Controls
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Price ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={optimizationParams.base_price} 
                      onChange={(e) => handleOptimizationParamChange('base_price', e.target.value)} 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sns-orange focus:border-transparent" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Unit ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={optimizationParams.cost_per_unit} 
                      onChange={(e) => handleOptimizationParamChange('cost_per_unit', e.target.value)} 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sns-orange focus:border-transparent" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Range (±)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={optimizationParams.price_range} 
                      onChange={(e) => handleOptimizationParamChange('price_range', e.target.value)} 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sns-orange focus:border-transparent" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Steps</label>
                    <input 
                      type="number" 
                      value={optimizationParams.steps} 
                      onChange={(e) => handleOptimizationParamChange('steps', e.target.value)} 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sns-orange focus:border-transparent" 
                    />
                  </div>
                </div>
                <Button 
                  onClick={optimizePrice} 
                  disabled={optimizing || !modelInfo} 
                  className="bg-sns-orange hover:bg-sns-orange-dark text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {optimizing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Optimizing Prices...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Optimize Pricing Strategy
                    </div>
                  )}
                </Button>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6"
                >
                  <div className="text-red-700 font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {error}
                  </div>
                </motion.div>
              )}

              {optimizationResults && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  {optimizationResults.best_price && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 shadow-lg mb-8"
                    >
                      <h4 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Optimal Pricing Recommendation
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                        >
                          <div className="text-2xl font-bold text-green-600">${optimizationResults.best_price.price.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">Optimal Price</div>
                        </motion.div>
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                        >
                          <div className="text-2xl font-bold text-blue-600">${optimizationResults.best_price.profit.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">Expected Profit</div>
                        </motion.div>
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                        >
                          <div className="text-2xl font-bold text-purple-600">{optimizationResults.best_price.predicted_demand.toFixed(0)}</div>
                          <div className="text-sm text-gray-600">Expected Demand</div>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                      className="bg-white rounded-xl border border-gray-200 shadow-lg p-6"
                    >
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Demand & Profit vs Price
                      </h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={optimizationChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="price" />
                          <YAxis />
                          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                          <Legend />
                          <Line type="monotone" dataKey="predicted_demand" stroke="#3b82f6" strokeWidth={2} name="Demand" />
                          <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
                        </LineChart>
                      </ResponsiveContainer>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                      className="bg-white rounded-xl border border-gray-200 shadow-lg p-6"
                    >
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Profit Distribution
                      </h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={optimizationChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="price" />
                          <YAxis />
                          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                          <Legend />
                          <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
  )
}