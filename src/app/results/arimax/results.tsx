"use client"

import { useEffect, useState } from 'react'
import axios from 'axios'
import type { ApiError, DatasetInfo, ModelInfo, PredictionResponse, PriceOptimizationResponse } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import LoaderSpinner from '@/components/ui/loader'
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, BarChart, Bar } from 'recharts'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'

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
interface MonthlyAnalysis {
  month: number
  price: number
  predicted_demand: number
  revenue: number
  profit: number
  margin: number
  elasticity: number
  confidence_intervals?: {
    demand_lower: number
    demand_upper: number
    profit_lower: number
    profit_upper: number
  }
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
  const [training, setTraining] = useState<boolean>(false)
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
  const [showDemandTable, setShowDemandTable] = useState<boolean>(true)

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
    setTraining(true)
    setError('')

    try {
      const response = await axios.post<{ model_info: any }>('http://localhost:8000/api/arimax/train/')
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

  // Auto-run training once the results page loads after upload
  useEffect(() => {
    const run = async () => {
      if (autoRan) return
      if (!datasetInfo) return
      setAutoRan(true)
      try {
        await trainModel()
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

  const isPageLoading = training || predicting || optimizing || (autoRan && !modelInfo)

  return (
    <div className="min-h-screen bg-sns-cream/20 ">
      {isPageLoading && (
        <LoaderSpinner 
          fullscreen 
          size="md" 
          message={
            training ? 'Training ARIMAX model...' : 
            predicting ? `Generating ${predictionPeriod}-day forecast...` :
            optimizing ? 'Optimizing pricing strategy...' :
            'Loading results...'
          } 
        />
      )}
      
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ARIMAX Results</h1>
            <p className="text-gray-600">Advanced forecasting with external variables and price optimization</p>
          </div>
          <Button className="bg-sns-orange hover:bg-sns-orange-dark text-white" onClick={onRunAnotherModel}>
            Run Another Model
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-1 gap-6 ">
          {/* Dataset Info Card */}
          <div className="xl:col-span-2 space-y-6">
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
                    <div><span className="text-blue-700">Exogenous Vars:</span> {
                      datasetInfo.columns.filter(col => 
                        ['price', 'ads', 'holidays', 'promotions', 'competitor_price', 'weather_index'].includes(col)
                      ).length || 'None'
                    }</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Model Controls and Results */}
          <div className="xl:col-span-2 space-y-6">
            <Card className="bg-white rounded-2xl border-0 ring-1 ring-[#F3E9DC] shadow-[0_10px_30px_rgba(217,111,50,0.06)]">
              <CardHeader>
                <CardTitle className="text-md">Model Information</CardTitle>
              </CardHeader>
              <CardContent>
                {modelInfo && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-600">Features:</span> {modelInfo.exog_features?.join(', ') || 'None'}</div>
                      <div><span className="text-gray-600">Order (p,d,q):</span> ({modelInfo.order?.join(', ') || '1,1,1'})</div>
                      <div><span className="text-gray-600">AIC Score:</span> {modelInfo.aic?.toFixed(2) || 'N/A'}</div>
                      {modelInfo.bic && (
                        <div><span className="text-gray-600">BIC Score:</span> {modelInfo.bic?.toFixed(2) || 'N/A'}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white rounded-2xl border-0 ring-1 ring-[#F3E9DC] shadow-[0_10px_30px_rgba(217,111,50,0.06)]">
              <CardHeader>
                <CardTitle className="text-xl">Demand Prediction</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Prediction Controls */}
                <div className="mb-6 p-4 rounded-lg shadow-sm border ">
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
                  <div className="mt-6 mb-10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        ARIMAX Forecast Results
                      </h3>
                      <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                        {predictions.dates.length} periods forecast
                      </span>
                    </div>
                    <div className="h-[500px] md:h-[700px] bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200 shadow-lg">
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
                          formatter={(value: any, name: string) => {
                            const formattedValue = typeof value === 'number' ? value.toLocaleString() : value
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
                        <Legend 
                          wrapperStyle={{
                            paddingTop: '20px',
                            fontSize: '13px',
                            fontFamily: 'Inter, system-ui, sans-serif'
                          }}
                        />
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

                    {/* Professional Insights Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                      <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 rounded-2xl p-6 border border-blue-300 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-semibold text-blue-800 uppercase tracking-wide">Total Forecast</div>
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                      </div>
                        </div>
                        <div className="text-3xl font-bold text-blue-900 mb-1">{totalPredicted.toLocaleString()}</div>
                        <div className="text-sm text-blue-700">units over {predictions.dates.length} days</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200 rounded-2xl p-6 border border-emerald-300 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-semibold text-emerald-800 uppercase tracking-wide">Daily Average</div>
                          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                      </div>
                        <div className="text-3xl font-bold text-emerald-900 mb-1">{averageDaily.toFixed(1)}</div>
                        <div className="text-sm text-emerald-700">units per day</div>
                        </div>
                      
                      <div className="bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 rounded-2xl p-6 border border-purple-300 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-semibold text-purple-800 uppercase tracking-wide">Peak Demand</div>
                          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0v-6a1.5 1.5 0 013 0v6a1.5 1.5 0 01-3 0V14m0 0H4a2 2 0 00-2 2v1a2 2 0 002 2h3m0-4h10a2 2 0 002-2v-1a2 2 0 00-2-2H7m0 0V9a2 2 0 012-2h2a2 2 0 012 2v2.5" />
                            </svg>
                          </div>
                        </div>
                        <div className="text-3xl font-bold text-purple-900 mb-1">{peakPoint?.prediction?.toLocaleString() || '—'}</div>
                        <div className="text-sm text-purple-700">{peakPoint ? new Date(peakPoint.date).toLocaleDateString() : 'No peak data'}</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 rounded-2xl p-6 border border-amber-300 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-semibold text-amber-800 uppercase tracking-wide">Trend Analysis</div>
                          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0v-6a1.5 1.5 0 013 0v6a1.5 1.5 0 01-3 0V14m0 0H4a2 2 0 00-2 2v1a2 2 0 002 2h3m0-4h10a2 2 0 002-2v-1a2 2 0 00-2-2H7m0 0V9a2 2 0 012-2h2a2 2 0 012 2v2.5" />
                            </svg>
                          </div>
                        </div>
                        <div className="text-3xl font-bold text-amber-900 mb-1">{trendLabel}</div>
                        <div className="text-sm text-amber-700 font-medium">Net Δ {netChange.toFixed(1)} units</div>
                      </div>
                    </div>

                    {/* Professional Table Toggle */}
                    <div className="mt-8 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Detailed Forecast Analysis</div>
                          <div className="text-xs text-slate-600">Complete breakdown with trend analysis</div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowDemandTable((s) => !s)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                      >
                        {showDemandTable ? 'Hide Table' : 'Show Table'}
                      </Button>
                    </div>

                    {/* Professional Forecast Data Table */}
                    {showDemandTable && (
                    <Card className="mt-6 shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-2xl font-bold text-slate-800 flex items-center">
                              <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                              </svg>
                              Professional Forecast Analysis
                            </CardTitle>
                            <p className="text-sm text-slate-600 mt-2">Complete forecast breakdown with professional trend analysis and confidence intervals</p>
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
                                    Category: 'ARIMAX',
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
                                a.download = `arimax_forecast_${predictions?.dates?.length || chartDataSorted.length}days.csv`
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
                        <div className="overflow-x-auto -mx-4 md:mx-0">
                          <table className="w-full min-w-[700px]">
                            <thead>
                              <tr className="bg-gradient-to-r from-slate-100 to-blue-100 border-b-2 border-slate-300">
                                <th className="text-left py-4 px-6 font-bold text-slate-800 uppercase tracking-wide text-sm">Model</th>
                                <th className="text-left py-4 px-6 font-bold text-slate-800 uppercase tracking-wide text-sm">Forecast Date</th>
                                <th className="text-left py-4 px-6 font-bold text-slate-800 uppercase tracking-wide text-sm">Predicted Demand</th>
                                <th className="text-left py-4 px-6 font-bold text-slate-800 uppercase tracking-wide text-sm">Daily Change</th>
                                <th className="text-left py-4 px-6 font-bold text-slate-800 uppercase tracking-wide text-sm">Confidence</th>
                              </tr>
                            </thead>
                            <tbody>
                              {chartDataSorted.map((row, index) => {
                                const prev = chartDataSorted[index - 1]?.prediction
                                const difference = typeof prev === 'number' ? row.prediction - prev : 0
                                const roundedDifference = Math.round(difference * 10) / 10
                                const hasConfidence = row.lower_tight && row.upper_tight
                                const confidenceRange = hasConfidence ? (row.upper_tight! - row.lower_tight!).toFixed(1) : 'N/A'
                                
                                return (
                                  <tr key={row.date} className="border-b border-slate-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-slate-50/50 transition-all duration-200">
                                    <td className="py-4 px-6">
                                      <div className="flex items-center">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                                          <span className="text-sm font-bold text-white">AX</span>
                                        </div>
                                        <div>
                                          <span className="font-bold text-slate-800">ARIMAX</span>
                                          <div className="text-xs text-slate-600">Professional Forecast</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-slate-800">
                                          {new Date(row.date).toLocaleDateString('en-US', { 
                                            weekday: 'short',
                                            year: 'numeric', 
                                            month: 'short', 
                                            day: 'numeric' 
                                          })}
                                        </span>
                                        <span className="text-xs text-slate-500">Day {index + 1}</span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-2xl font-bold text-blue-600">{row.prediction.toLocaleString()}</span>
                                        <span className="text-sm text-slate-500 font-medium">units</span>
                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      {index === 0 ? (
                                        <div className="flex items-center">
                                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-2">
                                            <span className="text-sm font-bold text-slate-600">—</span>
                                          </div>
                                          <span className="font-semibold text-slate-600">Baseline</span>
                                        </div>
                                      ) : roundedDifference === 0 ? (
                                        <div className="flex items-center">
                                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-2">
                                            <span className="text-sm font-bold text-slate-600">0</span>
                                          </div>
                                          <span className="font-semibold text-slate-600">No Change</span>
                                        </div>
                                      ) : roundedDifference > 0 ? (
                                        <div className="flex items-center">
                                          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-2">
                                            <span className="text-sm font-bold text-emerald-600">↗</span>
                                          </div>
                                          <span className="font-bold text-emerald-600">+{roundedDifference.toFixed(1)}</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center">
                                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-2">
                                            <span className="text-sm font-bold text-red-600">↘</span>
                                          </div>
                                          <span className="font-bold text-red-600">{roundedDifference.toFixed(1)}</span>
                        </div>
                      )}
                                    </td>
                                    <td className="py-4 px-6">
                                      {hasConfidence ? (
                                        <div className="flex flex-col">
                                          <span className="font-semibold text-slate-800">±{confidenceRange}</span>
                                          <span className="text-xs text-slate-500">Range: {row.lower_tight!.toFixed(0)} - {row.upper_tight!.toFixed(0)}</span>
                    </div>
                                      ) : (
                                        <span className="text-slate-400 font-medium">N/A</span>
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

            <Card className="bg-white rounded-2xl border-0 ring-1 ring-[#F3E9DC] shadow-[0_10px_30px_rgba(217,111,50,0.06)]">
              <CardHeader>
                <CardTitle className="text-xl">Price Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Optimization Controls */}
                <div className="mb-6 p-4 shadow-md rounded-lg border ">
                  <h3 className="font-semibold text-purple-900 mb-3">Price Optimization Controls</h3>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
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

                  {/* <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={optimizationParams.include_confidence}
                        onChange={(e) => handleOptimizationParamChange('include_confidence', e.target.checked)}
                        className="mr-2"
                      />
                      Include Confidence Intervals in Optimization
                    </label>
                  </div> */}

                  <Button
                    onClick={optimizePrice}
                    disabled={optimizing || !modelInfo}
                    className="bg-sns-orange hover:bg-sns-orange-dark text-white"
                  >
                    {optimizing ? 'Optimizing Prices...' : 'Optimize Pricing Strategy'}
                  </Button>
                </div>

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

                {/* Optimization Results */}
            {optimizationResults && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Price Optimization Analysis
                    </h3>
                        {optimizationResults.best_price && (
                      <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border mb-10 border-green-200">
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Demand & Profit vs Price</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={optimizationChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="price" />
                            <YAxis />
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
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
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                            <Legend />
                            <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
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