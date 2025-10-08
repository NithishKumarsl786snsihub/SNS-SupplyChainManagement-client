"use client"

import { motion } from "framer-motion"
import { Download, BarChart3, Shield, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
// Removed historical chart import for a forecast-only experience
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, Area, ComposedChart } from 'recharts'
import ProductSelector from "@/components/product-selector"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import LoaderSpinner from "@/components/ui/loader"


interface ResultsProps {
  onRunAnotherModel: () => void
}

interface PredictionResult {
  StoreID: string
  ProductID: string
  Date: string
  PredictedDailySales: number
  Confidence: number
  Error?: string
}

interface CatBoostResults {
  count: number
  predictions: PredictionResult[]
  model: string
  status: string
  data_info?: {
    total_rows_processed: number
    predictions_generated: number
    processing_time_seconds: number
    target_variable_handled: boolean
  }
  future_forecast?: {
    start_date: string
    days: number
    result: {
      forecast: { date: string; prediction: number; confidence: number }[]
      total_predicted_demand: number
      average_daily_demand: number
    }
    assumptions: {
      carried_forward_features: string[]
      note: string
    }
  }
  elasticity?: {
    success: boolean
    elasticity?: number
    r2_score?: number
    regression_type?: string
    error?: string
  }
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const [results, setResults] = useState<CatBoostResults | null>(null)
  const [filteredPredictions, setFilteredPredictions] = useState<PredictionResult[] | null>(null)
  const [selected, setSelected] = useState<{ store?: string; product?: string }>({})
  const [forecastDays, setForecastDays] = useState<number>(30)
  const [generating, setGenerating] = useState<boolean>(false)
  const [forecastSeries, setForecastSeries] = useState<Array<{date: string; prediction: number; upperBound: number; lowerBound: number; confidence?: number}>>([])
  const [forecastStart, setForecastStart] = useState<string>("")
  const [yDomain, setYDomain] = useState<[number, number]>([0, 0])

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "CatBoost", current: true },
  ]

  useEffect(() => {
    // Load results from session storage
    const storedResults = sessionStorage.getItem('catboost_results')
    if (storedResults) {
      try {
        const parsedResults = JSON.parse(storedResults)
        setResults(parsedResults)
        setFilteredPredictions(parsedResults?.predictions || [])
        
        // Results loaded successfully
        
      } catch (error) {
        console.error('Error parsing stored results:', error)
      }
    }
  }, [])

  const handleSelectionChange = (store: string, product: string, filteredData: PredictionResult[]) => {
    // Guard to avoid unnecessary state updates that could cause render loops
    const sameSelection = selected.store === store && selected.product === product
    const sameLength = (filteredPredictions?.length || 0) === (filteredData?.length || 0)
    if (sameSelection && sameLength) return
    setSelected({ store, product })
    setFilteredPredictions(filteredData)
    // Clear any previous forecast when user changes selection
    setForecastSeries([])
    setForecastStart("")
    setYDomain([0, 0])
  }

  const generateForecastForSelection = async () => {
    if (!selected.store || !selected.product) return
    try {
      setGenerating(true)
      const body = {
        input_data: {
          store_id: selected.store,
          product_id: selected.product,
          // Other fields will fall back to server defaults via preprocessor
        },
        forecast_days: forecastDays
      }
      const res = await fetch('http://localhost:8000/api/m3/forecast/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const series = (data.result?.forecast || []).map((f: any) => ({
        date: f.date,
        prediction: Number(f.prediction),
        upperBound: typeof f.upper_bound === 'number' ? Number(f.upper_bound) : Number(f.prediction) * 1.2,
        lowerBound: typeof f.lower_bound === 'number' ? Number(f.lower_bound) : Math.max(0, Number(f.prediction) * 0.8),
        confidence: typeof f.confidence === 'number' ? Number(f.confidence) : undefined
      }))
      setForecastSeries(series)
      setForecastStart(series[0]?.date || new Date().toISOString().slice(0,10))
      // Compute dynamic y-axis domain with 10% padding
      if (series.length > 0) {
        const minY = Math.min(...series.map(s => s.lowerBound))
        const maxY = Math.max(...series.map(s => s.upperBound))
        const pad = Math.max(1, (maxY - minY) * 0.1)
        setYDomain([Math.max(0, Math.floor(minY - pad)), Math.ceil(maxY + pad)])
      } else {
        setYDomain([0, 0])
      }
    } catch (e) {
      console.error('Generate forecast failed', e)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">CatBoost Results</h1>
              <p className="text-gray-600">Advanced gradient boosting with automatic categorical feature handling</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-sns-orange text-sns-orange hover:bg-sns-orange hover:text-white bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
              <Button className="bg-sns-orange hover:bg-sns-orange-dark text-white" onClick={onRunAnotherModel}>
                Run Another Model
              </Button>
            </div>
          </div>
        </motion.div>


        {/* Interactive CatBoost Visualization */}
        {results && results.predictions && results.predictions.length > 0 ? (
          <>
            {/* Product Selection */}
            <div className="mb-8">
              <ProductSelector 
                data={results.predictions} 
                onSelectionChange={handleSelectionChange}
              />
            </div>

            {/* Forecast controls */}
            <div className="mb-6 flex items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Days</label>
                <input type="number" min={1} max={180} value={forecastDays} onChange={e=>setForecastDays(Number(e.target.value))} className="w-32 px-3 py-2 border rounded" />
              </div>
              <Button className="bg-sns-orange hover:bg-sns-orange-dark text-white" onClick={generateForecastForSelection} disabled={generating || !selected.store || !selected.product}>
                {generating ? 'Generating...' : 'Generate Forecast'}
              </Button>
            </div>

            {/* Future Forecast (from selection) */}
            {forecastSeries.length > 0 && (
              <div className="mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Future Forecast (starting {forecastStart}) {selected.store && selected.product ? `• ${selected.store} / ${selected.product}` : ''}
                    </CardTitle>
                    <CardDescription>
                      {forecastDays} days • Generated from current selection
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Professional Forecast Visualization with bounds */}
                    <div className="mb-6">
                      <div className="relative h-[420px] w-full">
                        {generating && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg">
                            <div className="w-[260px]">
                              <LoaderSpinner size="sm" message="Generating forecast..." />
                            </div>
                          </div>
                        )}
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={forecastSeries}>
                            <defs>
                              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                            <XAxis dataKey="date" interval={0} angle={-45} textAnchor="end" height={70} tick={{ fontSize: 11, fill: '#6b7280' }} label={{ value: 'Date', position: 'insideBottom', offset: -5, style: { fill: '#111827', fontWeight: 700 } }} />
                            <YAxis domain={yDomain[1] > yDomain[0] ? yDomain : ['dataMin', 'dataMax']} allowDecimals={false} allowDataOverflow width={70} tick={{ fontSize: 12, fill: '#6b7280' }} label={{ value: 'Demand (Units)', angle: -90, position: 'insideLeft', style: { fill: '#111827', fontWeight: 700 } }} />
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Area type="monotone" dataKey="prediction" name="Demand Forecast" stroke="#2563eb" strokeWidth={2} fill="url(#forecastGradient)" fillOpacity={1} dot={false} />
                            <Line type="monotone" dataKey="upperBound" stroke="#059669" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Upper Bound" />
                            <Line type="monotone" dataKey="lowerBound" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Lower Bound" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="max-h-60 overflow-y-auto rounded-md border border-gray-100">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-gray-600">
                            <th className="py-2 pr-4">Date</th>
                            <th className="py-2 pr-4">Predicted Sales</th>
                            <th className="py-2 pr-4">Confidence</th>
                            <th className="py-2 pr-4">Lower Bound</th>
                            <th className="py-2 pr-4">Upper Bound</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forecastSeries.map((f: any) => {
                            const lower = f.lowerBound
                            const upper = f.upperBound
                            return (
                              <tr key={f.date} className="border-t">
                                <td className="py-2 pr-4">{f.date}</td>
                                <td className="py-2 pr-4">{f.prediction.toFixed(2)}</td>
                                <td className="py-2 pr-4">{f.confidence ? (f.confidence * 100).toFixed(1)+'%' : '-'}</td>
                                <td className="py-2 pr-4">{lower.toFixed(2)}</td>
                                <td className="py-2 pr-4">{upper.toFixed(2)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Elasticity summary */}
            {results.elasticity && (
              <div className="mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Price Elasticity (Log-Log)</CardTitle>
                    <CardDescription>
                      {results.elasticity.success ? 'Estimated from uploaded history' : 'Not available'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {results.elasticity.success ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                          <div className="text-gray-600 text-sm">Elasticity</div>
                          <div className="text-xl font-semibold">{results.elasticity.elasticity?.toFixed(3)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600 text-sm">R²</div>
                          <div className="text-xl font-semibold">{results.elasticity.r2_score?.toFixed(3)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600 text-sm">Model</div>
                          <div className="text-xl font-semibold">{results.elasticity.regression_type || 'log-log'}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-600">Elasticity could not be computed from this file.</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          /* No Data State */
          <div className="mb-8">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
                  <p className="text-gray-600 mb-6">
                    Upload your data to see interactive demand forecasting and detailed analytics.
                  </p>
                  <Button 
                    onClick={onRunAnotherModel}
                    className="bg-sns-orange hover:bg-sns-orange-dark text-white"
                  >
                    Upload Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Real-time Data Summary - Only show when we have data */}
        {results && results.predictions && results.predictions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-sns-orange" />
                  Data Processing Summary
                </CardTitle>
                <CardDescription>Real-time processing information from your uploaded data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Removed Data Points row as requested */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Unique Stores</span>
                    <span className="font-bold text-green-600">
                      {results.predictions ? [...new Set(results.predictions.map(p => p.StoreID))].length : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Unique Products</span>
                    <span className="font-bold text-purple-600">
                      {results.predictions ? [...new Set(results.predictions.map(p => p.ProductID))].length : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Processing Time</span>
                    <span className="font-bold text-orange-600">
                      {results.data_info?.processing_time_seconds 
                        ? `${results.data_info.processing_time_seconds.toFixed(1)}s`
                        : '< 1s'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-sns-orange" />
                  Model Performance
                </CardTitle>
                <CardDescription>CatBoost model performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Model Status</span>
                    <span className="font-bold text-green-600">Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Confidence</span>
                    <span className="font-bold text-blue-600">
                      {results.predictions && results.predictions.length > 0 
                        ? `${(results.predictions.reduce((sum, p) => sum + p.Confidence, 0) / results.predictions.length * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Target Variable</span>
                    <span className="font-bold text-purple-600">DailySalesQty</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>CatBoost model successfully processed your data with high confidence predictions.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}
