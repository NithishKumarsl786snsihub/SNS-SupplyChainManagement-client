"use client"

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from "@/components/ui/button"
import LoaderSpinner from "@/components/ui/loader"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, BarChart, Bar, Area, AreaChart } from 'recharts'

interface PredictionResult {
  prediction: number
}
interface ForecastPoint { date: string; prediction: number }
interface ForecastResult {
  forecast: ForecastPoint[]
  total_predicted_demand: number
  average_daily_demand: number
}

export default function Results({ onRunAnotherModel }: { onRunAnotherModel: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [category, setCategory] = useState('')
  const [singleResult, setSingleResult] = useState<PredictionResult | null>(null)
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null)
  const [metrics, setMetrics] = useState<any[]>([])
  const [pricing, setPricing] = useState<any | null>(null)
  const [pricingMonth, setPricingMonth] = useState<any | null>(null)
  const [forecastsAll, setForecastsAll] = useState<any[]>([])
  const [actualPlots, setActualPlots] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'forecast' | 'pricing' | 'performance'>('forecast')
  const [showDemandTable, setShowDemandTable] = useState(false)
  const [forecastDays, setForecastDays] = useState(28) // 4 weeks default
  const [selectedCategory, setSelectedCategory] = useState('')
  const [forecastLoading, setForecastLoading] = useState(false)
  const [selectedForecastCategory, setSelectedForecastCategory] = useState('')
  const [categoryForecastResult, setCategoryForecastResult] = useState<any>(null)
  const [forecastType, setForecastType] = useState<'daily'>('daily')
  
  // Pricing prediction states
  const [pricingInput, setPricingInput] = useState({
    category: '',
    price_unit: 20.0,
    units_sold: 30,
    stock_available: 100,
    promotion_flag: 0
  })
  const [pricingPrediction, setPricingPrediction] = useState<any>(null)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [priceComparisonData, setPriceComparisonData] = useState<any[]>([])
  const [categoryPricingStrategies, setCategoryPricingStrategies] = useState<any>({})

  const formatUnits = (v: number) => {
    if (typeof v !== 'number') return v as any
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`
    return String(Math.trunc(v))
  }


  // Generate elasticity timeline data
  const generateElasticityTimeline = () => {
    if (!pricingPrediction) return []
    
    const baseElasticity = pricingPrediction.elasticity || -1.30
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    return months.map((month, index) => {
      // Simulate seasonal variation in elasticity
      const seasonalFactor = 1 + 0.2 * Math.sin((index * Math.PI) / 6)
      const elasticity = baseElasticity * seasonalFactor
      const upperBound = elasticity * 0.8
      const lowerBound = elasticity * 1.2
      
      return {
        month,
        elasticity: elasticity.toFixed(2),
        upperBound: upperBound.toFixed(2),
        lowerBound: lowerBound.toFixed(2),
        elasticityValue: elasticity,
        upperBoundValue: upperBound,
        lowerBoundValue: lowerBound
      }
    })
  }

  // Pricing prediction functions
  const predictOptimalPrice = async () => {
    if (!pricingInput.category) {
      setError('Please select a category for pricing prediction')
      return
    }

    setPricingLoading(true)
    setError('') // Clear any previous errors
    setPriceComparisonData([]) // Clear previous chart data
    setPricingPrediction(null) // Clear previous prediction
    try {
      const response = await axios.post('http://localhost:8000/api/m2/predict-price-simple/', pricingInput)
      const prediction = response.data.prediction
      setPricingPrediction(prediction)
      
      // Generate price comparison data with current input values
      generatePriceComparisonData(pricingInput, prediction)
    } catch (error: any) {
      setError(error.response?.data?.message || 'Pricing prediction failed')
    } finally {
      setPricingLoading(false)
    }
  }

  const generatePriceComparisonData = (inputData: any, prediction: any) => {
    const currentPrice = inputData.price_unit
    const currentUnits = inputData.units_sold
    const category = inputData.category
    
    const comparisonData = []
    let maxProfit = 0
    let optimalPrice = currentPrice
    let optimalDemand = currentUnits
    
    for (let i = 0.6; i <= 1.4; i += 0.02) {
      const testPrice = currentPrice * i
      
      // Calculate demand using price elasticity
      const priceChange = (testPrice - currentPrice) / currentPrice
      const elasticity = getCategoryPricingStrategy(category).elasticity
      const demandChange = elasticity * priceChange
      const demand = currentUnits * (1 + demandChange)
      
      // Calculate profit (assuming 60% cost margin)
      const unitCost = currentPrice * 0.6
      const profit = (testPrice - unitCost) * Math.max(0, demand)
      
      // Track the price that gives maximum profit
      if (profit > maxProfit) {
        maxProfit = profit
        optimalPrice = testPrice
        optimalDemand = demand
      }
      
      comparisonData.push({
        price: testPrice,
        demand: Math.max(0, demand),
        profit: Math.max(0, profit),
        isOptimal: false // Will be updated below
      })
    }
    
    // Mark the optimal point
    comparisonData.forEach(item => {
      item.isOptimal = Math.abs(item.price - optimalPrice) < 0.1
    })
    
    // Update the pricing prediction with the actual optimal values from backend
    if (prediction) {
      setPricingPrediction({
        ...prediction,
        optimal_price: prediction.optimal_price,
        estimated_demand: prediction.estimated_demand,
        estimated_profit: prediction.estimated_profit
      })
    }
    
    setPriceComparisonData(comparisonData)
  }

  const getCategoryPricingStrategy = (category: string) => {
    const strategies: any = {
      'Milk': { elasticity: -1.2, strategy: 'Premium pricing', margin: 0.4 },
      'Yogurt': { elasticity: -1.5, strategy: 'Value pricing', margin: 0.3 },
      'Juice': { elasticity: -1.3, strategy: 'Competitive pricing', margin: 0.35 },
      'ReadyMeal': { elasticity: -0.8, strategy: 'Convenience premium', margin: 0.5 },
      'SnackBar': { elasticity: -1.6, strategy: 'Impulse pricing', margin: 0.25 }
    }
    return strategies[category] || { elasticity: -1.0, strategy: 'Standard pricing', margin: 0.3 }
  }

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/m2/info/')
        const cats = res.data?.info?.available_categories || []
        setAvailableCategories(cats)
        if (cats.length) setCategory(cats[0])
      } catch {
        setError('Failed to load model info')
      }
    }
    fetchInfo()
    // Load analyze result if present
    try {
      const a = sessionStorage.getItem('m2_lightgbm_analyze_result')
      if (a) {
        const parsed = JSON.parse(a)
        setMetrics(parsed.metrics || [])
        setForecastsAll(parsed.forecasts || [])
        setPricing(parsed.pricing || null)
        setPricingMonth(parsed.pricing_month || null)
        setActualPlots(parsed.actual_plots || [])
        if (parsed.available_categories?.length) {
          setAvailableCategories(parsed.available_categories)
          if (!category) setCategory(parsed.available_categories[0])
        }
      }
    } catch {}
  }, [])

  const predictSingle = async () => {
    if (!category) return
    setLoading(true); setError('')
    try {
      const params = {
        category,
        date: new Date().toISOString().slice(0,10),
        price_unit: 10.0,
        stock_available: 100,
        delivery_days: 0,
        delivered_qty: 0,
        promotion_flag: 0,
      }
      const res = await axios.get('http://localhost:8000/api/m2/predict/', { params })
      setSingleResult(res.data.result)
    } catch {
      setError('Prediction failed')
    } finally { setLoading(false) }
  }

  const forecast = async (days = 30) => {
    const targetCategory = selectedCategory || category
    if (!targetCategory) return
    setLoading(true); setError('')
    try {
      const params = {
        category: targetCategory,
        date: new Date().toISOString().slice(0,10),
        price_unit: 10.0,
        stock_available: 100,
        delivery_days: 0,
        delivered_qty: 0,
        promotion_flag: 0,
        forecast_days: days,
      }
      const res = await axios.get('http://localhost:8000/api/m2/forecast/', { params })
      setForecastResult(res.data.result)
    } catch {
      setError('Forecast failed')
    } finally { setLoading(false) }
  }

  const generateCategoryForecast = async (categoryName: string, days = 30) => {
    if (!categoryName) return
    setForecastLoading(true); setError('')
    try {
      const params = {
        category: categoryName,
        date: new Date().toISOString().slice(0,10),
        price_unit: 10.0,
        stock_available: 100,
        delivery_days: 0,
        delivered_qty: 0,
        promotion_flag: 0,
        forecast_days: days,
      }
      const res = await axios.get('http://localhost:8000/api/m2/forecast/', { params })
      setCategoryForecastResult({
        category: categoryName,
        forecast: res.data.result,
        days: days
      })
    } catch {
      setError('Category forecast failed')
    } finally { setForecastLoading(false) }
  }


  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Models', href: '/models' },
    { label: 'LightGBM', current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {loading && <LoaderSpinner fullscreen size="md" message="Processing..." />}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">LightGBM Results</h1>
            <p className="text-gray-600">Demand forecasting and pricing analysis</p>
            </div>
              <Button className="bg-sns-orange hover:bg-sns-orange-dark text-white" onClick={onRunAnotherModel}>
                Run Another Model
              </Button>
            </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 mb-4">{error}</div>}

        <div className="w-full">
          <div className="inline-flex gap-2 mb-4 border rounded-lg p-1 bg-white">
            <button
              className={`px-3 py-1 rounded ${activeTab==='forecast' ? 'bg-sns-orange text-white' : 'text-gray-700'}`}
              onClick={() => setActiveTab('forecast')}
            >
              Demand Forecasting
            </button>
            <button
              className={`px-3 py-1 rounded ${activeTab==='pricing' ? 'bg-sns-orange text-white' : 'text-gray-700'}`}
              onClick={() => setActiveTab('pricing')}
            >
              Price Elasticity & Optimal Price
            </button>
            <button
              className={`px-3 py-1 rounded ${activeTab==='performance' ? 'bg-sns-orange text-white' : 'text-gray-700'}`}
              onClick={() => setActiveTab('performance')}
            >
              Model Performance
            </button>
          </div>

          {activeTab === 'forecast' && (
            <div className="space-y-8">
              {/* Professional Forecast Controls */}
              <Card className="shadow-xl border-0 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30">
                <CardHeader className="pb-6">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900">Demand Forecasting</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Generate professional demand forecasts for specific categories</p>
                    </div>
                  </div>
                </CardHeader>
                      <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Enhanced Category Dropdown */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
                        <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Product Category
                      </label>
                      <select
                        value={selectedForecastCategory}
                        onChange={(e) => setSelectedForecastCategory(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      >
                        <option value="">Choose a category</option>
                        {availableCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Enhanced Forecast Period Input */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
                        <svg className="w-4 h-4 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Forecast Period
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={forecastDays}
                        onChange={(e) => setForecastDays(Number(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                        placeholder="28"
                      />
                      <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">
                        📅 Maximum 180 days (6 months) forecast available
                      </p>
                    </div>
                    
                    {/* Enhanced Forecast Button */}
                    <div className="flex items-end">
                      <Button
                        onClick={() => {
                          if (selectedForecastCategory) {
                            generateCategoryForecast(selectedForecastCategory, forecastDays)
                          }
                        }}
                        disabled={!selectedForecastCategory || forecastLoading}
                        className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 font-semibold py-4 rounded-xl"
                      >
                        {forecastLoading ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating Forecast...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            Generate Forecast
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Forecast Results */}
              {categoryForecastResult && (
                <div className="space-y-6">
                  {/* Simple Chart Heading */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {categoryForecastResult.category} - Daily Demand Forecast
                      </h3>
                      <p className="text-gray-600 mt-1">
                        Professional demand prediction for {categoryForecastResult.days} days
                      </p>
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span>Demand Forecast</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span>Upper Bound</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span>Lower Bound</span>
                      </div>
                    </div>
                  </div>

                  {/* Demand Chart */}
                  {(categoryForecastResult.forecast?.forecast || categoryForecastResult.forecast) && (
                    <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50/30">
                      <CardContent className="p-8">
                        <div className={`w-full ${forecastDays > 90 ? 'h-[600px]' : 'h-[500px]'}`}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={(() => {
                              // Handle different data structures for different forecast types
                              let forecasts = null
                              if (categoryForecastResult.forecast?.forecast) {
                                // Daily forecast structure
                                forecasts = categoryForecastResult.forecast.forecast
                              } else if (categoryForecastResult.forecast) {
                                // Weekly/Monthly forecast structure
                                forecasts = categoryForecastResult.forecast
                              }
                              
                              if (!forecasts || !Array.isArray(forecasts)) {
                                return []
                              }
                              
                              if (false) {
                                // For weekly forecasts, we might have weekly data directly or need to aggregate daily data
                                if (forecasts.length > 0 && forecasts[0].week_number) {
                                  // Direct weekly data
                                  return forecasts.map((f: any) => ({
                                    date: f.week_start,
                                    prediction: f.prediction,
                                    upperBound: f.upper_bound,
                                    lowerBound: f.lower_bound,
                                    weekNumber: f.week_number,
                                    formattedDate: `Week ${f.week_number}`,
                                    weekRange: `${f.week_start} - ${f.week_end}`
                                  }))
                                } else {
                                  // Group daily forecasts into weekly data
                                  const weeklyData: any[] = []
                                  
                                  for (let i = 0; i < forecasts.length; i += 7) {
                                    const weekForecasts = forecasts.slice(i, i + 7)
                                    const weekStart = new Date(weekForecasts[0].date)
                                    const weekEnd = new Date(weekForecasts[weekForecasts.length - 1].date)
                                    const weekNumber = Math.floor(i / 7) + 1
                                    
                                    // Calculate weekly average demand and bounds
                                    const weeklyAvg = weekForecasts.reduce((sum: number, f: any) => sum + f.prediction, 0) / weekForecasts.length
                                    const weeklyUpper = weekForecasts.reduce((sum: number, f: any) => sum + (f.upper_bound || f.prediction * 1.2), 0) / weekForecasts.length
                                    const weeklyLower = weekForecasts.reduce((sum: number, f: any) => sum + (f.lower_bound || f.prediction * 0.8), 0) / weekForecasts.length
                                    
                                    weeklyData.push({
                                      date: weekForecasts[0].date,
                                      prediction: weeklyAvg,
                                      upperBound: weeklyUpper,
                                      lowerBound: weeklyLower,
                                      weekNumber: weekNumber,
                                      formattedDate: `Week ${weekNumber}`,
                                      weekRange: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                    })
                                  }
                                  
                                  return weeklyData
                                }
                              } else if (false) {
                                // For monthly forecasts, we have monthly data directly
                                return forecasts.map((f: any) => ({
                                  date: f.month_start,
                                  prediction: f.prediction,
                                  upperBound: f.upper_bound,
                                  lowerBound: f.lower_bound,
                                  monthNumber: f.month_number,
                                  formattedDate: f.month_name,
                                  quarter: f.quarter
                                }))
                              } else {
                                // Use daily data directly with bounds
                                return forecasts.map((f: any, index: number) => ({
                                  date: f.date,
                                  prediction: f.prediction,
                                  upperBound: f.upper_bound || f.prediction * 1.2,
                                  lowerBound: f.lower_bound || f.prediction * 0.8,
                                  dayNumber: index + 1,
                                  formattedDate: new Date(f.date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                  }),
                                  dayRange: new Date(f.date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                }))
                              }
                            })()}>
                              <defs>
                                <linearGradient id="categoryForecastGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                              <XAxis 
                                dataKey="formattedDate" 
                                tick={{ fontSize: 12, fill: '#6b7280', fontWeight: '500' }}
                                tickLine={{ stroke: '#d1d5db' }}
                                axisLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                                label={{ 
                                  value: 'Day', 
                                  position: 'insideBottom', 
                                  offset: 0, 
                                  style: { 
                                    textAnchor: 'middle', 
                                    fill: '#000000', 
                                    fontSize: '16px', 
                                    fontWeight: '800',
                                    fontFamily: 'Arial, sans-serif'
                                  } 
                                }}
                                interval="preserveStartEnd"
                                minTickGap={30}
                                angle={forecastDays > 60 ? -45 : 0}
                                textAnchor={forecastDays > 60 ? "end" : "middle"}
                                height={forecastDays > 60 ? 60 : 40}
                              />
                              <YAxis 
                                tickFormatter={(value) => value.toFixed(0)} 
                                allowDecimals={false} 
                                width={80} 
                                domain={[0, 'dataMax + 1']}
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
                                interval={1}
                                tickCount={Math.ceil((forecastDays > 90 ? 600 : 500) / 2)}
                                ticks={(() => {
                                  const maxValue = Math.ceil((forecastDays > 90 ? 600 : 500) / 2) * 2
                                  const ticks = []
                                  for (let i = 0; i <= maxValue; i += 2) {
                                    ticks.push(i)
                                  }
                                  return ticks
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
                                formatter={(value: any, name: string, props: any) => {
                                  if (name === 'Demand Forecast') {
                                    return [
                                      `${value.toFixed(1)} units`, 
                                      `Day ${props.payload.dayNumber} (${props.payload.dayRange})`
                                    ]
                                  } else if (name === 'Upper Bound') {
                                    return [`${value.toFixed(1)} units`, 'Upper Bound']
                                  } else if (name === 'Lower Bound') {
                                    return [`${value.toFixed(1)} units`, 'Lower Bound']
                                  }
                                  return [`${value.toFixed(1)} units`, name]
                                }}
                              />
                              <Line 
                                type="linear" 
                                dataKey="prediction" 
                                stroke="#2563eb" 
                                strokeWidth={2.5} 
                                dot={{ fill: '#2563eb', strokeWidth: 1, r: 3, stroke: '#ffffff' }}
                                activeDot={{ r: 5, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' }}
                                name="Demand Forecast"
                                connectNulls={false}
                              />
                              <Line 
                                type="linear" 
                                dataKey="upperBound" 
                                stroke="#059669" 
                                strokeWidth={2} 
                                strokeDasharray="5 5"
                                dot={false}
                                name="Upper Bound"
                                connectNulls={false}
                              />
                              <Line 
                                type="linear" 
                                dataKey="lowerBound" 
                                stroke="#dc2626" 
                                strokeWidth={2} 
                                strokeDasharray="5 5"
                                dot={false}
                                name="Lower Bound"
                                connectNulls={false}
                              />
                              <Legend 
                                verticalAlign="top" 
                                height={36}
                                iconType="line"
                                wrapperStyle={{ 
                                  paddingTop: '20px',
                                  fontSize: '14px',
                                  fontWeight: '500'
                                }}
                              />
                          </LineChart>
                        </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Enhanced Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 bg-blue-500 rounded-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                          <div className="text-sm font-bold text-blue-800">Peak Demand</div>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-blue-900 mb-2">
                        {(() => {
                          // Handle daily forecast data structure
                          const forecasts = categoryForecastResult.forecast?.forecast
                          
                          if (!forecasts || !Array.isArray(forecasts)) {
                            return '0.0'
                          }
                          
                          const dailyData = forecasts.map((f: any) => f.prediction)
                          return dailyData.length > 0 ? Math.max(...dailyData).toFixed(1) : '0.0'
                        })()}
                      </div>
                      <div className="text-sm text-blue-700 font-medium">
                        Highest daily demand
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 bg-green-500 rounded-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                          </div>
                          <div className="text-sm font-bold text-green-800">Lowest Demand</div>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-green-900 mb-2">
                        {(() => {
                          // Handle daily forecast data structure
                          const forecasts = categoryForecastResult.forecast?.forecast
                          
                          if (!forecasts || !Array.isArray(forecasts)) {
                            return '0.0'
                          }
                          
                          const dailyData = forecasts.map((f: any) => f.prediction)
                          return dailyData.length > 0 ? Math.min(...dailyData).toFixed(1) : '0.0'
                        })()}
                      </div>
                      <div className="text-sm text-green-700 font-medium">
                        Lowest daily demand
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 bg-purple-500 rounded-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                            </svg>
                          </div>
                          <div className="text-sm font-bold text-purple-800">Trend</div>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-purple-900 mb-2">
                        {(() => {
                          // Robust Trend Analysis using Multiple Methods
                          let forecasts = null
                          if (categoryForecastResult.forecast?.forecast) {
                            forecasts = categoryForecastResult.forecast.forecast
                          } else if (categoryForecastResult.forecast) {
                            forecasts = categoryForecastResult.forecast
                          }
                          
                          if (!forecasts || !Array.isArray(forecasts) || forecasts.length < 3) {
                            return '📊 Insufficient Data'
                          }
                          
                          // Extract prediction data
                          const values = forecasts.map((f: any) => f.prediction)
                          const n = values.length
                          
                          // Method 1: Simple First vs Last Comparison
                          const firstValue = values[0]
                          const lastValue = values[n - 1]
                          const simpleChange = ((lastValue - firstValue) / firstValue) * 100
                          
                          // Method 2: Moving Average Trend (more robust to noise)
                          const windowSize = Math.max(3, Math.floor(n / 4)) // 25% of data or min 3
                          const firstWindow = values.slice(0, windowSize)
                          const lastWindow = values.slice(-windowSize)
                          const firstAvg = firstWindow.reduce((sum, val) => sum + val, 0) / firstWindow.length
                          const lastAvg = lastWindow.reduce((sum, val) => sum + val, 0) / lastWindow.length
                          const avgChange = ((lastAvg - firstAvg) / firstAvg) * 100
                          
                          // Method 3: Linear Regression (for reference)
                          const data = values.map((val, index) => ({ x: index, y: val }))
                          const sumX = data.reduce((sum, point) => sum + point.x, 0)
                          const sumY = data.reduce((sum, point) => sum + point.y, 0)
                          const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0)
                          const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0)
                          const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
                          const slopeChange = (slope / (sumY / n)) * 100 // Normalized slope
                          
                          // Method 4: Trend Consistency Check
                          let positiveDays = 0
                          let negativeDays = 0
                          for (let i = 1; i < values.length; i++) {
                            if (values[i] > values[i-1]) positiveDays++
                            else if (values[i] < values[i-1]) negativeDays++
                          }
                          const consistency = Math.max(positiveDays, negativeDays) / (n - 1)
                          
                          // Combine methods for robust trend detection
                          const trendScore = (Math.abs(simpleChange) * 0.3) + (Math.abs(avgChange) * 0.4) + (Math.abs(slopeChange) * 0.2) + (consistency * 50 * 0.1)
                          
                          // Determine trend direction and strength
                          const isRising = avgChange > 0 && slope > 0
                          const isDeclining = avgChange < 0 && slope < 0
                          const isStable = Math.abs(avgChange) < 2 && Math.abs(slopeChange) < 2
                          
                          // Calculate confidence based on consistency and magnitude
                          const confidence = Math.min(100, trendScore)
                          const confidencePercent = confidence.toFixed(1)
                          
                          if (isStable || trendScore < 5) {
                            return `➡️ Stable (${confidencePercent}%)`
                          } else if (isRising) {
                            if (trendScore > 20) {
                              return `📈 Strong Rising (${confidencePercent}%)`
                            } else if (trendScore > 10) {
                              return `↗️ Rising (${confidencePercent}%)`
                            } else {
                              return `↗️ Weak Rising (${confidencePercent}%)`
                            }
                          } else if (isDeclining) {
                            if (trendScore > 20) {
                              return `📉 Strong Declining (${confidencePercent}%)`
                            } else if (trendScore > 10) {
                              return `↘️ Declining (${confidencePercent}%)`
                            } else {
                              return `↘️ Weak Declining (${confidencePercent}%)`
                            }
                          } else {
                            return `📊 Mixed Pattern (${confidencePercent}%)`
                          }
                        })()}
                      </div>
                      <div className="text-sm text-purple-700 font-medium">
                        Daily demand trend direction
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 bg-orange-500 rounded-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div className="text-sm font-bold text-orange-800">Confidence Range</div>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-orange-900 mb-2">
                        {(() => {
                          // Handle different data structures for different forecast types
                          let forecasts = null
                          if (categoryForecastResult.forecast?.forecast) {
                            // Daily forecast structure
                            forecasts = categoryForecastResult.forecast.forecast
                          } else if (categoryForecastResult.forecast) {
                            // Weekly/Monthly forecast structure
                            forecasts = categoryForecastResult.forecast
                          }
                          
                          if (!forecasts || !Array.isArray(forecasts)) {
                            return '0%'
                          }
                          
                          const predictions = forecasts.map((f: any) => f.prediction)
                          const upperBounds = forecasts.map((f: any) => f.upper_bound || f.prediction * 1.2)
                          const lowerBounds = forecasts.map((f: any) => f.lower_bound || f.prediction * 0.8)
                          
                          const avgPrediction = predictions.reduce((a: number, b: number) => a + b, 0) / predictions.length
                          const avgUpper = upperBounds.reduce((a: number, b: number) => a + b, 0) / upperBounds.length
                          const avgLower = lowerBounds.reduce((a: number, b: number) => a + b, 0) / lowerBounds.length
                          
                          const range = avgUpper - avgLower
                          const percentage = ((range / avgPrediction) * 100).toFixed(1)
                          
                          return `${percentage}%`
                        })()}
                      </div>
                      <div className="text-sm text-orange-700 font-medium">80% confidence interval</div>
                    </div>
                  </div>

                  {/* Forecast Data Table */}
                  <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl font-bold text-gray-800">Forecast Data Table</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">Complete forecast breakdown with sorting and filtering</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-sm text-gray-500">
                            {(() => {
                              let forecasts = null
                              if (categoryForecastResult.forecast?.forecast) {
                                forecasts = categoryForecastResult.forecast.forecast
                              } else if (categoryForecastResult.forecast) {
                                forecasts = categoryForecastResult.forecast
                              }
                              return forecasts ? forecasts.length : 0
                            })()} records
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Handle different data structures for different forecast types
                              let forecasts = null
                              if (categoryForecastResult.forecast?.forecast) {
                                forecasts = categoryForecastResult.forecast.forecast
                              } else if (categoryForecastResult.forecast) {
                                forecasts = categoryForecastResult.forecast
                              }
                              
                              if (!forecasts || !Array.isArray(forecasts)) {
                                return
                              }
                              
                              const csvData = forecasts.map((f: any, index: number) => ({
                                Date: new Date(f.date).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                }),
                                Category: categoryForecastResult.category,
                                Forecast: f.prediction.toFixed(1),
                                Trend: (() => {
                                  if (index === 0) return '0.0'
                                  
                                  const currentValue = f.prediction
                                  const previousValue = forecasts[index - 1].prediction
                                  const difference = currentValue - previousValue
                                  
                                  // Round to 1 decimal place to avoid floating point precision issues
                                  const roundedDifference = Math.round(difference * 10) / 10
                                  
                                  if (roundedDifference === 0) {
                                    return '0.0'
                                  } else if (roundedDifference > 0) {
                                    return `+${roundedDifference.toFixed(1)}`
                                  } else {
                                    return roundedDifference.toFixed(1)
                                  }
                                })()
                              }))
                              
                              const csvContent = [
                                Object.keys(csvData[0]).join(','),
                                ...csvData.map((row: any) => Object.values(row).join(','))
                              ].join('\n')
                              
                              const blob = new Blob([csvContent], { type: 'text/csv' })
                              const url = window.URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `${categoryForecastResult.category}_forecast_${Math.ceil(categoryForecastResult.days / 7)}weeks.csv`
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
                            {(() => {
                              let forecasts = null
                              if (categoryForecastResult.forecast?.forecast) {
                                forecasts = categoryForecastResult.forecast.forecast
                              } else if (categoryForecastResult.forecast) {
                                forecasts = categoryForecastResult.forecast
                              }
                              
                              if (!forecasts || !Array.isArray(forecasts)) {
                                return null
                              }
                              
                              return forecasts.map((f: any, index: number) => (
                              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50">
                                <td className="py-3 px-4">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                      <span className="text-sm font-semibold text-blue-600">
                                        {categoryForecastResult.category.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <span className="font-medium text-gray-800">{categoryForecastResult.category}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-medium text-gray-800">
                                    {new Date(f.date).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center">
                                    <span className="font-semibold text-blue-600">
                                      {f.prediction.toFixed(1)}
                                    </span>
                                    <span className="text-sm text-gray-500 ml-1">units</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  {(() => {
                                    if (index === 0) {
                                      return <span className="font-semibold text-gray-600">0.0</span>
                                    }
                                    
                                    const currentValue = f.prediction
                                    const previousValue = forecasts[index - 1].prediction
                                    const difference = currentValue - previousValue
                                    
                                    // Round to 1 decimal place to avoid floating point precision issues
                                    const roundedDifference = Math.round(difference * 10) / 10
                                    
                                    if (roundedDifference === 0) {
                                      return <span className="font-semibold text-gray-600">0.0</span>
                                    } else if (roundedDifference > 0) {
                                      return <span className="font-semibold text-green-600">+{roundedDifference.toFixed(1)}</span>
                                    } else {
                                      return <span className="font-semibold text-red-600">{roundedDifference.toFixed(1)}</span>
                                    }
                                  })()}
                                </td>
                              </tr>
                              ))
                            })()}
                        </tbody>
                      </table>
          </div>
                  </CardContent>
                </Card>
                </div>
              )}

        </div>
          )}

          {false && activeTab === 'forecast' && forecastsAll && forecastsAll.length > 0 && (
            <div className="space-y-8">
              {/* Enhanced Forecast Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-700">
                        {forecastsAll.length}
                      </div>
                      <div className="text-sm text-blue-600">Total Forecasts</div>
                    </div>
                  </div>
                  <div className="text-sm text-blue-700">Demand predictions across all categories</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-700">
                        {Array.from(new Set(forecastsAll.map((f: any) => f.category))).length}
                      </div>
                      <div className="text-sm text-green-600">Categories</div>
                    </div>
                  </div>
                  <div className="text-sm text-green-700">Active product categories</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-700">
                        {new Date(forecastsAll[forecastsAll.length - 1]?.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-purple-600">Latest Forecast</div>
                    </div>
                  </div>
                  <div className="text-sm text-purple-700">Most recent prediction date</div>
                </div>
              </div>

              {/* Enhanced Forecast Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {Array.from(new Set(forecastsAll.map((f: any) => f.category)))
                  .slice(0, 4)
                .map((cat: string) => {
                  const data = forecastsAll
                    .filter((f: any) => f.category === cat)
                      .map((f: any) => ({ 
                        date: f.date, 
                        forecast: Number(f.forecast ?? f.units_sold ?? 0),
                        formattedDate: new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }))
                  const vals = data.map(d => d.forecast)
                  const vMin = Math.min(...vals)
                  const vMax = Math.max(...vals)
                    const pad = Math.max(1, Math.round((vMax - vMin) * 0.1))
                    const yDomain: [number, number] = [Math.max(0, vMin - pad), vMax + pad]
                    const totalForecast = vals.reduce((sum, val) => sum + val, 0)
                    const avgForecast = totalForecast / vals.length
                    const trend = vals.length > 1 ? (vals[vals.length - 1] - vals[0]) / vals.length : 0
                    
                  return (
                      <Card key={cat} className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 hover:shadow-xl transition-all duration-300">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-xl font-bold text-gray-800">{cat}</CardTitle>
                              <p className="text-sm text-gray-600 mt-1">Demand Forecast</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                {formatUnits(avgForecast)}
                              </div>
                              <div className="text-xs text-gray-500">Avg Daily</div>
                            </div>
                          </div>
            </CardHeader>
            <CardContent>
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                              <span>Total Forecast: {formatUnits(totalForecast)}</span>
                              <span className={`flex items-center ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {trend >= 0 ? (
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {Math.abs(trend).toFixed(1)}/day
                              </span>
                            </div>
                          </div>
                          <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id={`gradient-${cat}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                              <XAxis 
                                dataKey="formattedDate" 
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                tickLine={{ stroke: '#d1d5db' }}
                                axisLine={{ stroke: '#d1d5db' }}
                              />
                              <YAxis 
                                tickFormatter={formatUnits} 
                                allowDecimals={false} 
                                width={60} 
                                tickCount={6} 
                                domain={yDomain}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                tickLine={{ stroke: '#d1d5db' }}
                                axisLine={{ stroke: '#d1d5db' }}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #e5e7eb', 
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                  fontSize: '14px'
                                }}
                                labelStyle={{ color: '#374151', fontWeight: '600' }}
                                formatter={(value: any, name: string) => [formatUnits(value), 'Forecast']}
                              />
                              <Line 
                                type="linear" 
                                dataKey="forecast" 
                                stroke="#3b82f6" 
                                strokeWidth={3} 
                                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                                name="Forecast"
                              />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
          </div>
          )}


          {activeTab === 'pricing' && (
            <div className="space-y-8">
              {/* Enhanced Pricing Prediction Section */}
              <Card className="mb-8 shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                        <div>
                      <CardTitle className="text-2xl font-bold text-gray-900">Advanced Pricing Analytics</CardTitle>
                      <p className="text-gray-600 mt-1">Data-driven price elasticity analysis and revenue optimization</p>
                    </div>
                  </div>
            </CardHeader>
            <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Enhanced Input Form */}
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          Business Parameters
                        </h3>
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Product Category</label>
                          <select 
                            value={pricingInput.category}
                            onChange={(e) => setPricingInput({...pricingInput, category: e.target.value})}
                              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white"
                          >
                              <option value="">Select a category</option>
                            {availableCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Current Price</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                          <input 
                            type="number" 
                            value={pricingInput.price_unit}
                            onChange={(e) => setPricingInput({...pricingInput, price_unit: parseFloat(e.target.value)})}
                                  className="w-full pl-8 pr-3 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                            step="0.01"
                                  placeholder="0.00"
                          />
                        </div>
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Units Sold</label>
                          <input 
                            type="number" 
                            value={pricingInput.units_sold}
                            onChange={(e) => setPricingInput({...pricingInput, units_sold: parseInt(e.target.value)})}
                                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                placeholder="0"
                          />
                        </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Available</label>
                          <input 
                            type="number" 
                            value={pricingInput.stock_available}
                            onChange={(e) => setPricingInput({...pricingInput, stock_available: parseInt(e.target.value)})}
                              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                              placeholder="0"
                          />
                        </div>
                          
                          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                          <input 
                            type="checkbox" 
                            id="promotion"
                            checked={pricingInput.promotion_flag === 1}
                            onChange={(e) => setPricingInput({...pricingInput, promotion_flag: e.target.checked ? 1 : 0})}
                              className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="promotion" className="text-sm font-medium text-gray-700 flex items-center">
                              <svg className="w-4 h-4 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              Currently on Promotion
                            </label>
                        </div>
                          
                        <Button 
                          onClick={predictOptimalPrice}
                          disabled={pricingLoading || !pricingInput.category}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          >
                            {pricingLoading ? (
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Analyzing...</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>Analyze Pricing</span>
                              </div>
                            )}
                        </Button>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Prediction Results */}
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Pricing Recommendations
                        </h3>
                      {pricingPrediction ? (
                          <div className="space-y-6">
                            {/* Optimal Price Card */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-green-100 rounded-full -translate-y-10 translate-x-10 opacity-20"></div>
                              <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-lg font-bold text-green-800 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    Optimal Price
                                  </h4>
                                  <div className="px-3 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded-full">
                                    Recommended
                                  </div>
                                </div>
                                <div className="text-4xl font-bold text-green-600 mb-2">
                              ${pricingPrediction.optimal_price?.toFixed(2)}
                            </div>
                                <div className="flex items-center space-x-2">
                                  {pricingPrediction.optimal_price > pricingInput.price_unit ? (
                                    <div className="flex items-center text-green-700">
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                      </svg>
                                      <span className="text-sm font-semibold">
                                        +{((pricingPrediction.optimal_price - pricingInput.price_unit) / pricingInput.price_unit * 100).toFixed(1)}% increase
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center text-red-700">
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                      </svg>
                                      <span className="text-sm font-semibold">
                                        {((pricingPrediction.optimal_price - pricingInput.price_unit) / pricingInput.price_unit * 100).toFixed(1)}% decrease
                                      </span>
                            </div>
                                  )}
                          </div>
                            </div>
                          </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-sm font-semibold text-blue-700">Estimated Profit</div>
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                </div>
                                <div className="text-2xl font-bold text-blue-800">
                                ${pricingPrediction.estimated_profit?.toFixed(2)}
                              </div>
                            </div>
                              
                              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-sm font-semibold text-purple-700">Profit Margin</div>
                                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                </div>
                                <div className="text-2xl font-bold text-purple-800">
                                {(pricingPrediction.profit_margin * 100)?.toFixed(1)}%
                              </div>
                            </div>
                          </div>


                            {/* Category Strategy */}
                          {pricingInput.category && (
                              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                <div className="text-sm font-semibold text-yellow-700">Market Strategy</div>
                                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                </div>
                                <div className="text-sm font-medium text-yellow-800 mb-2">
                                {getCategoryPricingStrategy(pricingInput.category).strategy}
                              </div>
                                <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full inline-block">
                                Elasticity: {getCategoryPricingStrategy(pricingInput.category).elasticity}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <h4 className="text-lg font-semibold text-gray-700 mb-2">Ready for Analysis</h4>
                            <p className="text-gray-500">Enter your business parameters and click "Analyze Pricing" to get data-driven recommendations</p>
                        </div>
                      )}
                      </div>
                    </div>
              </div>
            </CardContent>
          </Card>

          {activeTab === 'pricing' && pricingPrediction && (
            <div className="space-y-8">
              {/* Elasticity Timeline Graph */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-indigo-50">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                              <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              Elasticity Coefficients Timeline
                            </CardTitle>
                            <p className="text-sm text-gray-600 mt-1">Seasonal variation in price elasticity with confidence bounds</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              <span className="text-sm text-gray-600">Base Elasticity</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-gray-600">Upper Bound</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <span className="text-sm text-gray-600">Lower Bound</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={generateElasticityTimeline()}>
                              <defs>
                                <linearGradient id="elasticityGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="upperBoundTimelineGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="lowerBoundTimelineGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                              <XAxis 
                                dataKey="month" 
                                tick={{ fontSize: 14, fill: '#6b7280', fontWeight: '500' }}
                                tickLine={{ stroke: '#d1d5db' }}
                                axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
                              />
                              <YAxis 
                                tick={{ fontSize: 14, fill: '#6b7280', fontWeight: '500' }}
                                tickLine={{ stroke: '#d1d5db' }}
                                axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
                                label={{ value: 'Elasticity Coefficient', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151', fontSize: '14px', fontWeight: '600' } }}
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
                                  const labels: { [key: string]: string } = {
                                    'elasticityValue': 'Base Elasticity',
                                    'upperBoundValue': 'Upper Bound',
                                    'lowerBoundValue': 'Lower Bound'
                                  }
                                  return [`${value.toFixed(2)}`, labels[name] || name]
                                }}
                              />
                              <Line 
                                type="linear" 
                                dataKey="lowerBoundValue" 
                                stroke="#ef4444" 
                                strokeWidth={3} 
                                strokeDasharray="10 5"
                                dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5, stroke: '#ef4444', strokeWidth: 2, fill: 'white' }}
                                name="lowerBoundValue"
                              />
                              <Line 
                                type="linear" 
                                dataKey="upperBoundValue" 
                                stroke="#10b981" 
                                strokeWidth={3} 
                                strokeDasharray="10 5"
                                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: 'white' }}
                                name="upperBoundValue"
                              />
                              <Line 
                                type="linear" 
                                dataKey="elasticityValue" 
                                stroke="#8b5cf6" 
                                strokeWidth={3} 
                                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2, fill: 'white' }}
                                name="elasticityValue"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Elasticity Bounds Information */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Current Elasticity Metrics */}
                      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
                        <CardHeader>
                          <CardTitle className="text-xl font-bold text-blue-800 flex items-center">
                            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Current Elasticity Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold text-blue-700">Base Elasticity</div>
                                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                              </div>
                              <div className="text-3xl font-bold text-blue-800 mb-1">
                                {pricingPrediction.elasticity?.toFixed(2)}
                              </div>
                              <div className="text-sm text-blue-600">
                                {Math.abs(pricingPrediction.elasticity) > 1 ? 'Elastic Demand' : 'Inelastic Demand'}
                              </div>
                              <div className="text-xs text-blue-500 mt-1">
                                {Math.abs(pricingPrediction.elasticity) > 1 
                                  ? 'Demand is highly sensitive to price changes' 
                                  : 'Demand is relatively stable to price changes'}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white rounded-lg p-3 border border-green-200">
                                <div className="text-sm font-semibold text-green-700 mb-1">Upper Bound</div>
                                <div className="text-xl font-bold text-green-800">
                                  {(pricingPrediction.elasticity * 0.8).toFixed(2)}
                                </div>
                                <div className="text-xs text-green-600">Less elastic (80%)</div>
                              </div>
                              
                              <div className="bg-white rounded-lg p-3 border border-red-200">
                                <div className="text-sm font-semibold text-red-700 mb-1">Lower Bound</div>
                                <div className="text-xl font-bold text-red-800">
                                  {(pricingPrediction.elasticity * 1.2).toFixed(2)}
                                </div>
                                <div className="text-xs text-red-600">More elastic (120%)</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Seasonal Elasticity Insights */}
                      <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50">
                        <CardHeader>
                          <CardTitle className="text-xl font-bold text-purple-800 flex items-center">
                            <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Seasonal Elasticity Insights
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="bg-white rounded-lg p-4 border border-purple-200">
                              <div className="text-sm font-semibold text-purple-700 mb-2">Peak Elasticity Month</div>
                              <div className="text-2xl font-bold text-purple-800 mb-1">
                                {generateElasticityTimeline().reduce((max, item) => 
                                  Math.abs(item.elasticityValue) > Math.abs(max.elasticityValue) ? item : max
                                ).month}
                              </div>
                              <div className="text-sm text-purple-600">
                                Highest price sensitivity period
                              </div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 border border-green-200">
                              <div className="text-sm font-semibold text-green-700 mb-2">Stable Elasticity Month</div>
                              <div className="text-2xl font-bold text-green-800 mb-1">
                                {generateElasticityTimeline().reduce((min, item) => 
                                  Math.abs(item.elasticityValue) < Math.abs(min.elasticityValue) ? item : min
                                ).month}
                              </div>
                              <div className="text-sm text-green-600">
                                Most predictable demand period
                              </div>
                            </div>
                            
                            <div className="p-3 bg-purple-100 rounded-lg">
                              <div className="text-sm text-purple-800">
                                <strong>Elasticity Range:</strong> ±20% bounds provide confidence intervals showing how demand sensitivity varies within realistic market conditions.
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Enhanced 3-Axis Demand vs Price vs Profit Analysis */}
              {pricingLoading && (
                <Card className="mb-8 shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardContent className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                        <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-t-blue-400 animate-ping"></div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-800">Processing Pricing Analysis</h3>
                        <p className="text-gray-600">Calculating optimal pricing strategy and generating market insights...</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {priceComparisonData.length > 0 && !pricingLoading && (
                <Card className="mb-8 shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                          <svg className="w-6 h-6 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Market Analysis Dashboard
                        </CardTitle>
                        <p className="text-gray-600 mt-2">Comprehensive visualization showing price sensitivity, demand patterns, and revenue optimization</p>
                      </div>
                      <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Analysis Complete
                      </div>
                    </div>
            </CardHeader>
            <CardContent>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <div className="h-[500px] mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={priceComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                          <XAxis 
                            dataKey="price" 
                            type="number" 
                            scale="linear" 
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(v) => `$${v.toFixed(2)}`}
                            stroke="#374151"
                            fontSize={12}
                              fontWeight={500}
                              tickLine={{ stroke: '#6b7280' }}
                          />
                          <YAxis 
                            yAxisId="demand" 
                            orientation="left" 
                            tickFormatter={formatUnits}
                              stroke="#6366f1"
                            fontSize={12}
                              fontWeight={500}
                              label={{ value: 'Demand (Units)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6366f1', fontWeight: 'bold' } }}
                          />
                          <YAxis 
                            yAxisId="profit" 
                            orientation="right" 
                            tickFormatter={(value) => `$${value.toFixed(0)}`}
                              stroke="#10b981"
                            fontSize={12}
                              fontWeight={500}
                              label={{ value: 'Profit ($)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#10b981', fontWeight: 'bold' } }}
                          />
                          <Tooltip 
                            formatter={(value: any, name: string) => [
                              typeof value === 'number' ? value.toFixed(2) : value,
                              name === 'demand' ? 'Demand (Units)' : name === 'profit' ? 'Profit ($)' : name === 'revenue' ? 'Revenue ($)' : name
                            ]}
                            labelFormatter={(label) => `Price: $${label}`}
                            contentStyle={{
                              backgroundColor: 'white',
                                border: '2px solid #e5e7eb',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                padding: '12px'
                              }}
                              cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                            />
                            <Legend 
                              wrapperStyle={{ 
                                paddingTop: '20px',
                                fontSize: '14px',
                                fontWeight: '500'
                              }}
                            />
                          <Line 
                            yAxisId="demand"
                            type="linear" 
                            dataKey="demand" 
                              stroke="#6366f1" 
                              name="Demand (Units)" 
                              strokeWidth={3}
                              dot={{ r: 5, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                              activeDot={{ r: 7, stroke: '#6366f1', strokeWidth: 2, fill: '#ffffff' }}
                              connectNulls={false}
                          />
                          <Line 
                            yAxisId="profit"
                            type="linear" 
                            dataKey="profit" 
                              stroke="#10b981" 
                              name="Profit ($)" 
                              strokeWidth={3}
                              dot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                              activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                              connectNulls={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                      
                      {/* Enhanced Chart Interpretation */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                          <div className="flex items-center mb-4">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                            <h4 className="font-bold text-blue-800 text-lg">Demand Analysis</h4>
                          </div>
                          <div className="space-y-2 text-sm text-blue-700">
                            <p><strong>Market Sensitivity:</strong> Analyzes how demand responds to price adjustments</p>
                            <p><strong>Elasticity Metrics:</strong> Steeper curves indicate higher customer price sensitivity</p>
                            <p><strong>Demand Patterns:</strong> Shows customer behavior and purchasing trends</p>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                          <div className="flex items-center mb-4">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                            <h4 className="font-bold text-green-800 text-lg">Profit Optimization</h4>
                          </div>
                          <div className="space-y-2 text-sm text-green-700">
                            <p><strong>Profit Optimization:</strong> Shows profit levels at different price points</p>
                            <p><strong>Optimal Pricing:</strong> Highest point on the green curve indicates maximum profit</p>
                            <p><strong>Margin Analysis:</strong> Balance between price increases and profit growth</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Key Insights */}
                      <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                        <div className="flex items-center mb-4">
                          <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <h4 className="font-bold text-purple-800 text-lg">Key Insights</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-700">
                          <div className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div>
                              <strong>Demand Analysis (Blue):</strong> Shows how customer demand changes with price adjustments
                            </div>
                          </div>
                          <div className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div>
                              <strong>Profit Analysis (Green):</strong> Displays profit levels and identifies the optimal pricing point
                            </div>
                          </div>
                        </div>
                      </div>
                </div>
                  </CardContent>
                </Card>
              )}
                </div>
          )}

          {activeTab === 'performance' && metrics && metrics.length > 0 && (
              <Card className="mb-6">
                <CardHeader><CardTitle>Accuracy by Category</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-2 text-left">Category</th>
                          <th className="px-4 py-2 text-left">R²</th>
                          <th className="px-4 py-2 text-left">MAPE</th>
                          <th className="px-4 py-2 text-left">RMSE</th>
                          <th className="px-4 py-2 text-left">Features</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((m: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-4 py-2">{m.category}</td>
                            <td className="px-4 py-2">{(m.R2 ?? m.r2)?.toFixed ? (m.R2 ?? m.r2).toFixed(3) : m.R2 ?? m.r2}</td>
                            <td className="px-4 py-2">{(((m.MAPE ?? m.mape) * 100) || 0).toFixed(1)}%</td>
                            <td className="px-4 py-2">{(m.RMSE ?? m.rmse)?.toFixed ? (m.RMSE ?? m.rmse).toFixed(2) : m.RMSE ?? m.rmse}</td>
                            <td className="px-4 py-2">{m.N_features ?? m.n_features}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {actualPlots && actualPlots.length > 0 && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {actualPlots.map((p: any, idx: number) => (
                        <div key={idx} className="p-2 bg-white rounded border">
                          <div className="text-sm font-semibold mb-2">{p.category || `Category ${idx+1}`}</div>
                          <img src={`data:image/png;base64,${p.plot_b64 || p}`} alt="Actual vs Predicted" className="w-full h-auto" />
                  </div>
                      ))}
                </div>
                  )}

            </CardContent>
          </Card>
          )}
        </div>

        {/* Model Controls removed per request; demand table shown via toggle inside Forecast tab */}
      </div>
    </div>
  )
}
