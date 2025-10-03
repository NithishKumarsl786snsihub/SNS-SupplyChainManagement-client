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
      const response = await axios.post<{ model_info: ModelInfo }>('http://localhost:8000/api/arimax/train/')
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
    ? predictions.dates.map((date, index) => ({
        date,
        prediction: predictions.predictions[index] || 0,
        lower_bound: predictions.confidence_intervals?.lower[index],
        upper_bound: predictions.confidence_intervals?.upper[index],
      }))
    : []

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
                      <div><span className="text-gray-600">Order (p,d,q):</span> ({modelInfo.order.join(', ')})</div>
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
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={predictionChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
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
                              dataKey="upper_bound" 
                              stroke="#ef4444" 
                              strokeWidth={1} 
                              strokeDasharray="3 3"
                              dot={false}
                              name="Upper Bound (95%)"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="lower_bound" 
                              stroke="#10b981" 
                              strokeWidth={1} 
                              strokeDasharray="3 3"
                              dot={false}
                              name="Lower Bound (95%)"
                            />
                          </>
                        )}
                      </LineChart>
                    </ResponsiveContainer>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{predictions.predictions.length}</div>
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
                      {predictions.confidence_intervals && (
                        <div className="bg-orange-50 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-orange-600">95%</div>
                          <div className="text-sm text-orange-700">Confidence Level</div>
                        </div>
                      )}
                    </div>
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