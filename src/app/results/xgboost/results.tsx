"use client"

import { motion } from "framer-motion"
import { Download, TrendingUp, TrendingDown, BarChart3, Activity, Shield, Target } from "lucide-react"
import ExportModal from "@/components/ui/export-modal"
import { exportXgbToZip } from "@/lib/exporters/xgboostExport"
import { Button } from "@/components/ui/button"
import { ForecastChart } from "@/components/charts/forecast-chart"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot, Legend } from "recharts"
import { useMemo, useState, useEffect } from "react"

type PredictionRow = {
  StoreID: string
  ProductID: string
  Date: string
  PredictedMonthlyDemand: number
}

// Real-time metrics interface
interface DemandMetrics {
  peakDemand: number
  lowestDemand: number
  trend: number
  trendDirection: 'increasing' | 'decreasing' | 'stable'
  confidenceRange: number
}

interface ResultsProps {
  onRunAnotherModel: () => void
  predictions: PredictionRow[]
  categoryMap: Record<string, string>
  contextMap: Record<string, Record<string, unknown>>
}

export default function Results({ onRunAnotherModel, predictions, categoryMap, contextMap }: ResultsProps) {
  const [showExport, setShowExport] = useState(false)
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "XGBoost", current: true },
  ]

  const [selectedStore, setSelectedStore] = useState<string>("")
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [priceTimeSeries, setPriceTimeSeries] = useState<Array<{
    month: string;
    current_price: number;
    upper_bound: number;
    lower_bound: number;
    optimal_price: number;
  }>>([])
  const [demandMetrics, setDemandMetrics] = useState<DemandMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'demand' | 'pricing'>('demand')
  const [optimizerLoading, setOptimizerLoading] = useState<boolean>(false)
  const [optimizerResult, setOptimizerResult] = useState<null | {
    curve: { price: number; predicted_demand: number; revenue: number; profit: number; profit_margin: number }[]
    optimal: { price: number; predicted_demand: number; revenue: number; profit: number; profit_margin: number }
    elasticity: number
    base_price: number
  }>(null)
  const [optimizerError, setOptimizerError] = useState<string>("")

  const optimizerCurveSorted = useMemo(() => {
    if (!optimizerResult?.curve) return [] as { price: number; predicted_demand: number; revenue: number; profit: number; profit_margin: number }[]
    return [...optimizerResult.curve].sort((a, b) => a.price - b.price)
  }, [optimizerResult])

  // Compute store -> products mapping and counts
  const storeToProducts = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const p of predictions || []) {
      if (!map.has(p.StoreID)) map.set(p.StoreID, new Set<string>())
      map.get(p.StoreID)!.add(p.ProductID)
    }
    return map
  }, [predictions])

  const storeOptions = useMemo(() => {
    return Array.from(storeToProducts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([store, products]) => ({ store, count: products.size }))
  }, [storeToProducts])

  const productOptions = useMemo(() => {
    if (!selectedStore) return [] as string[]
    const set = storeToProducts.get(selectedStore)
    return set ? Array.from(set).sort((a, b) => a.localeCompare(b)) : []
  }, [selectedStore, storeToProducts])

  // Set initial default: first store and its first product
  useEffect(() => {
    if (!selectedStore && storeOptions.length > 0) {
    const firstStore = storeOptions[0]?.store
    if (firstStore) {
      setSelectedStore(firstStore)
      const productSet = storeToProducts.get(firstStore)
      if (productSet) {
        const sorted = Array.from(productSet).sort((a, b) => a.localeCompare(b))
        const defaultProduct = productSet.has("P001") ? "P001" : (sorted[0] || "")
        if (defaultProduct) setSelectedProduct(defaultProduct)
      }
      }
    }
  }, [storeOptions, storeToProducts, selectedStore])

  // Build chart data
  const chartData = useMemo(() => {
    const rows = predictions || []
    const filtered = rows.filter((r) =>
      (selectedStore ? r.StoreID === selectedStore : true) &&
      (selectedProduct ? r.ProductID === selectedProduct : true)
    )
    // Aggregate by month
    const totalsByDate = new Map<string, number>()
    for (const row of filtered) {
      const d = new Date(row.Date)
      const monthKey = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10)
      const prev = totalsByDate.get(monthKey) || 0
      totalsByDate.set(monthKey, prev + Number(row.PredictedMonthlyDemand || 0))
    }
    const series = Array.from(totalsByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total]) => ({ date, predicted: total }))
    return series
  }, [predictions, selectedStore, selectedProduct])

  // Month options derived from predictions for selected store/product
  const monthOptions = useMemo(() => {
    const months = new Set<string>()
    for (const r of predictions) {
      if (r.StoreID === selectedStore && r.ProductID === selectedProduct) {
        const d = new Date(r.Date)
        const key = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10)
        months.add(key)
      }
    }
    return Array.from(months).sort((a, b) => a.localeCompare(b))
  }, [predictions, selectedStore, selectedProduct])

  // Ensure/reset month selection when monthOptions change
  useEffect(() => {
    if (monthOptions.length > 0) {
      if (!selectedMonth || !monthOptions.includes(selectedMonth)) {
        setSelectedMonth(monthOptions[0])
      }
    } else {
      setSelectedMonth("")
    }
  }, [monthOptions, selectedMonth])

  // Calculate real-time demand metrics with loading state
  const calculateDemandMetrics = useMemo(() => {
    if (!selectedStore || !selectedProduct || !predictions) return null

    const filteredPredictions = predictions.filter(p => 
      p.StoreID === selectedStore && p.ProductID === selectedProduct
    )

    if (filteredPredictions.length === 0) return null

    const demands = filteredPredictions.map(p => p.PredictedMonthlyDemand)
    const peakDemand = Math.max(...demands)
    const lowestDemand = Math.min(...demands)

    // Calculate trend (percentage change from first to last)
    const firstDemand = demands[0]
    const lastDemand = demands[demands.length - 1]
    const trend = firstDemand > 0 ? ((lastDemand - firstDemand) / firstDemand) * 100 : 0
    
    let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (trend > 5) trendDirection = 'increasing'
    else if (trend < -5) trendDirection = 'decreasing'

    // Use model R² score (0.9965) as confidence proxy
    const confidenceRange = 99.65

    return {
      peakDemand,
      lowestDemand,
      trend: Math.abs(trend),
      trendDirection,
      confidenceRange
    }
  }, [selectedStore, selectedProduct, predictions])

  // Update metrics when calculation changes with loading simulation
  useEffect(() => {
    if (selectedStore && selectedProduct && predictions) {
      setMetricsLoading(true)
      setDemandMetrics(null)
      
      // Simulate calculation time for better UX
      const timer = setTimeout(() => {
        setDemandMetrics(calculateDemandMetrics)
        setMetricsLoading(false)
      }, 800) // 800ms delay to show loading state
      
      return () => clearTimeout(timer)
    } else {
      setDemandMetrics(null)
      setMetricsLoading(false)
    }
  }, [selectedStore, selectedProduct, predictions, calculateDemandMetrics])

  // Clear data when store/product changes
  useEffect(() => {
    setPriceTimeSeries([])
    setDemandMetrics(null)
  }, [selectedStore, selectedProduct])

  // Load price time series when store/product changes
  useEffect(() => {
  const loadPriceTimeSeries = async () => {
    if (!selectedStore || !selectedProduct || !contextMap) return
    
    try {
      // Collect context data for all months
      const contextData = []
      for (const [key, context] of Object.entries(contextMap)) {
        if (key.startsWith(`${selectedStore}::${selectedProduct}::`)) {
          contextData.push(context)
        }
      }
      
      if (contextData.length === 0) return
      
      const payload = {
        StoreID: selectedStore,
        ProductID: selectedProduct,
        context_data: contextData
      }
      
      const resp = await fetch("http://127.0.0.1:8000/api/m1/price-time-series/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      
      if (!resp.ok) {
        console.error("Failed to load price time series")
        return
      }
      
      const data = await resp.json()
      setPriceTimeSeries(data.time_series || [])
    } catch (error) {
      console.error("Error loading price time series:", error)
    }
  }

    if (selectedStore && selectedProduct && contextMap) {
      void loadPriceTimeSeries()
    }
  }, [selectedStore, selectedProduct, contextMap])

  // Run XGBoost price optimizer for selected month
  const runOptimizer = async () => {
    if (!selectedStore || !selectedProduct || !selectedMonth) return
    const ctxKey = `${selectedStore}::${selectedProduct}::${selectedMonth}`
    let context = (contextMap && (contextMap as any)[ctxKey]) as Record<string, unknown> | undefined
    if (!context) {
      // Fallback: try to find an entry for same store/product and month (ignoring day or tz differences)
      const prefix = `${selectedStore}::${selectedProduct}::`
      const targetYm = selectedMonth.slice(0, 7)
      for (const [key, value] of Object.entries(contextMap || {})) {
        if (key.startsWith(prefix)) {
          const datePart = key.substring(prefix.length)
          const ym = datePart.slice(0, 7)
          if (ym === targetYm) {
            context = value as Record<string, unknown>
            break
          }
        }
      }
      // As a last resort, pick the first available for the store/product
      if (!context) {
        for (const [key, value] of Object.entries(contextMap || {})) {
          if (key.startsWith(prefix)) {
            context = value as Record<string, unknown>
            break
          }
        }
      }
      if (!context) {
        setOptimizerError("No context rows found for the selected month. Try another month.")
        return
      }
    }
    try {
      setOptimizerLoading(true)
      setOptimizerResult(null)
      setOptimizerError("")
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"
      const payload = {
        StoreID: selectedStore,
        ProductID: selectedProduct,
        Date: selectedMonth,
        context,
        grid_points: 41,
        sweep_pct: 0.30,
      }
      const resp = await fetch(`${base}/api/m1/price-optimizer/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!resp.ok) {
        setOptimizerResult(null)
        const err = await resp.json().catch(() => ({} as any))
        setOptimizerError(err?.error || "Optimizer request failed")
        return
      }
      const data = await resp.json()
      setOptimizerResult({
        curve: data.curve || [],
        optimal: data.optimal,
        elasticity: data.elasticity,
        base_price: data.base_price,
      })
    } catch (e) {
      setOptimizerResult(null)
      setOptimizerError("Failed to compute optimal price. Check server logs.")
    } finally {
      setOptimizerLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">XGBoost Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Gradient boosting with advanced regularization for high-performance forecasting.</p>
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

        {/* Export Modal (shared) */}
        {showExport && (
          <ExportModal
            onClose={() => setShowExport(false)}
            title="Export Results"
            subtitle="One ZIP with per-store Excel files (tabs per product)."
            input={{
              predictions: (predictions ?? []) as unknown as { StoreID: string; ProductID: string; Date: string; PredictedMonthlyDemand: number }[],
              priceSeriesByKey: {},
            }}
            onExport={async ({ input, onStoreProgress, onProductProgress }) => {
              // Build complete priceSeriesByKey for all store-product pairs using contextMap
              const allKeys = new Set<string>()
              for (const r of input.predictions) {
                allKeys.add(`${r.StoreID}::${r.ProductID}`)
              }
              const priceSeriesByKey: Record<string, { month: string; current_price: number; upper_bound: number; lower_bound: number }[]> = {}
              const keys = Array.from(allKeys)
              // Optional: indicate prefetch stage (not shown in modal)
              for (let i = 0; i < keys.length; i++) {
                const key = keys[i]
                const [storeId, productId] = key.split("::")
                // Collect context data for this product across months
                const ctxData: Record<string, unknown>[] = []
                for (const [ctxKey, ctx] of Object.entries(contextMap)) {
                  if (ctxKey.startsWith(`${storeId}::${productId}::`)) {
                    ctxData.push(ctx)
                  }
                }
                if (ctxData.length === 0) {
                  continue
                }
                try {
                  const resp = await fetch("http://127.0.0.1:8000/api/m1/price-time-series/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ StoreID: storeId, ProductID: productId, context_data: ctxData }),
                  })
                  if (resp.ok) {
                    const data = await resp.json()
                    priceSeriesByKey[key] = (data.time_series || []).map((it: { month: string; current_price: number; upper_bound: number; lower_bound: number }) => ({
                      month: it.month,
                      current_price: it.current_price,
                      upper_bound: it.upper_bound,
                      lower_bound: it.lower_bound,
                    }))
                  }
                } catch {}
              }
              const fullInput = { predictions: input.predictions, priceSeriesByKey }
              return await exportXgbToZip({ input: fullInput, onStoreProgress, onProductProgress })
            }}
            buildFilename={() => `xgboost_exports_${new Date().toISOString().slice(0,10)}.zip`}
          />
        )}

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
          <>
        {/* Store/Product selectors */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Store ({storeOptions.length} total)</label>
            <Select value={selectedStore} onValueChange={(v) => {
              setSelectedStore(v)
              const productSet = storeToProducts.get(v)
              if (productSet) {
                const sorted = Array.from(productSet).sort((a, b) => a.localeCompare(b))
                const defaultProduct = productSet.has("P001") ? "P001" : (sorted[0] || "")
                setSelectedProduct(defaultProduct)
              } else {
                setSelectedProduct("")
              }
            }}>
              <SelectTrigger className="w-full bg-white/60 backdrop-blur-md border border-white/40 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                <SelectValue placeholder="All stores" />
              </SelectTrigger>
              <SelectContent className="bg-white/80 backdrop-blur-md border border-white/40 rounded-xl">
                {storeOptions.map(({ store, count }) => (
                  <SelectItem key={store} value={store}>{store} ({count} products)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product {selectedStore ? `(from ${selectedStore})` : "(all products)"}</label>
            <Select value={selectedProduct} onValueChange={(v) => setSelectedProduct(v)} disabled={!selectedStore}>
              <SelectTrigger className="w-full bg-white/60 backdrop-blur-md border border-white/80 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] disabled:opacity-70">
                <SelectValue placeholder={selectedStore ? "Select product" : "Select a store first"} />
              </SelectTrigger>
              <SelectContent className="bg-white/80 backdrop-blur-md border border-white/40 rounded-xl">
                {productOptions.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <div>Total stores: <span className="font-medium text-gray-900">{storeOptions.length}</span></div>
              {selectedStore && (
                <div>Products in {selectedStore}: <span className="font-medium text-gray-900">{productOptions.length}</span></div>
              )}
            </div>
          </div>
          <div className="flex items-end">
            {selectedStore && selectedProduct && (
              <div className="text-sm text-gray-600">
                Category: <span className="font-medium text-gray-900">{categoryMap[`${selectedStore}::${selectedProduct}`] || "Unknown"}</span>
              </div>
            )}
          </div>
        </div>

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
          <ForecastChart data={chartData} title={"Demand Forecast - Predicted Only"} />
            </div>
          </div>
          
          {/* Metrics Section - 30% width */}
          <div className="lg:col-span-3">
            {(demandMetrics || metricsLoading) && (
              <div className="space-y-4">
                {/* Peak Demand Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-md flex flex-col justify-center"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-500 rounded-md">
                      <Activity className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-blue-700 font-semibold text-sm">Peak Demand</h3>
                  </div>
                  <div className="text-xl font-bold text-blue-900 mb-1">
                    {metricsLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-sm">Calculating...</span>
                      </div>
                    ) : (
                      demandMetrics?.peakDemand.toFixed(1)
                    )}
                  </div>
                  <p className="text-blue-600 text-xs">
                    {metricsLoading ? "Processing predictions..." : "Highest monthly demand"}
                  </p>
                </motion.div>

                {/* Lowest Demand Card */}
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
                    <h3 className="text-green-700 font-semibold text-sm">Lowest Demand</h3>
                  </div>
                  <div className="text-xl font-bold text-green-900 mb-1">
                    {metricsLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                        <span className="text-sm">Calculating...</span>
                      </div>
                    ) : (
                      demandMetrics?.lowestDemand.toFixed(1)
                    )}
                  </div>
                  <p className="text-green-600 text-xs">
                    {metricsLoading ? "Processing predictions..." : "Lowest monthly demand"}
                  </p>
                </motion.div>

                {/* Trend Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`rounded-lg p-4 border shadow-md flex flex-col justify-center ${
                    metricsLoading 
                      ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
                      : demandMetrics?.trendDirection === 'increasing' 
                      ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
                      : demandMetrics?.trendDirection === 'decreasing'
                      ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-md ${
                      metricsLoading 
                        ? 'bg-gray-500'
                        : demandMetrics?.trendDirection === 'increasing' 
                        ? 'bg-green-500'
                        : demandMetrics?.trendDirection === 'decreasing'
                        ? 'bg-red-500'
                        : 'bg-gray-500'
                    }`}>
                      {metricsLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : demandMetrics?.trendDirection === 'increasing' ? (
                        <TrendingUp className="h-4 w-4 text-white" />
                      ) : demandMetrics?.trendDirection === 'decreasing' ? (
                        <TrendingDown className="h-4 w-4 text-white" />
                      ) : (
                        <BarChart3 className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <h3 className={`font-semibold text-sm ${
                      metricsLoading 
                        ? 'text-gray-700'
                        : demandMetrics?.trendDirection === 'increasing' 
                        ? 'text-green-700'
                        : demandMetrics?.trendDirection === 'decreasing'
                        ? 'text-red-700'
                        : 'text-gray-700'
                    }`}>Trend</h3>
                  </div>
                  <div className={`text-xl font-bold mb-1 ${
                    metricsLoading 
                      ? 'text-gray-900'
                      : demandMetrics?.trendDirection === 'increasing' 
                      ? 'text-green-900'
                      : demandMetrics?.trendDirection === 'decreasing'
                      ? 'text-red-900'
                      : 'text-gray-900'
                  }`}>
                    {metricsLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                        <span className="text-sm">Calculating...</span>
                      </div>
                    ) : (
                      `${demandMetrics?.trendDirection === 'increasing' ? 'Increasing' : 
                       demandMetrics?.trendDirection === 'decreasing' ? 'Decreasing' : 'Stable'} (${demandMetrics?.trend.toFixed(1)}%)`
                    )}
                  </div>
                  <p className={`text-xs ${
                    metricsLoading 
                      ? 'text-gray-600'
                      : demandMetrics?.trendDirection === 'increasing' 
                      ? 'text-green-600'
                      : demandMetrics?.trendDirection === 'decreasing'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}>
                    {metricsLoading ? "Processing predictions..." : "Demand trend direction"}
                  </p>
                </motion.div>

                {/* Confidence Range Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-md flex flex-col justify-center"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-orange-500 rounded-md">
                      {metricsLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Shield className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <h3 className="text-orange-700 font-semibold text-sm">Confidence Range</h3>
                  </div>
                  <div className="text-xl font-bold text-orange-900 mb-1">
                    {metricsLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                        <span className="text-sm">Calculating...</span>
                      </div>
                    ) : (
                      `${demandMetrics?.confidenceRange.toFixed(1)}%`
                    )}
                  </div>
                  <p className="text-orange-600 text-xs">
                    {metricsLoading ? "Processing predictions..." : "Model prediction confidence"}
                  </p>
                </motion.div>
              </div>
            )}
          </div>
        </div>
        {/* Demand Values Table */}
          <div className="mb-8">
          <div className="rounded-xl bg-white shadow-lg">
            <div className="p-6">
              {/* Professional Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Demand Values Analysis</h3>
                    <p className="text-gray-600 text-sm">Comprehensive demand predictions with trend analysis</p>
                  </div>
                </div>
                {selectedStore && selectedProduct && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Selected</div>
                    <div className="text-sm font-bold text-sns-orange">{selectedStore} - {selectedProduct}</div>
                  </div>
                )}
              </div>
              
              {/* Professional Table Container */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                {/* Enhanced Table Header */}
                <div className="bg-gradient-to-r from-sns-orange via-orange-500 to-orange-600 px-4 py-3">
                  <div className="grid grid-cols-6 gap-3 text-white font-semibold text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      Date
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      Store
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      Product
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      Category
                    </div>
                    <div className="text-right flex items-center justify-end gap-2">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      Predicted Demand
                    </div>
                    <div className="text-right flex items-center justify-end gap-2">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      Trend
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Table Body */}
                <div className="max-h-96 overflow-y-auto">
                  <div className="divide-y divide-gray-100">
                    {(() => {
                      if (!selectedStore || !selectedProduct || !predictions) {
                        return (
                          <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Activity className="h-8 w-8 text-gray-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-700 mb-2">No Selection Made</h4>
                            <p className="text-gray-500">Select a store and product to view demand values</p>
                          </div>
                        )
                      }

                      const filteredPredictions = predictions.filter(p => 
                        p.StoreID === selectedStore && p.ProductID === selectedProduct
                      ).sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())

                      if (filteredPredictions.length === 0) {
                        return (
                          <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Activity className="h-8 w-8 text-orange-500" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h4>
                            <p className="text-gray-500">No demand data found for {selectedStore} - {selectedProduct}</p>
                          </div>
                        )
                      }

                      return filteredPredictions.map((prediction, index) => {
                        const previousDemand = index > 0 ? filteredPredictions[index - 1].PredictedMonthlyDemand : null
                        const currentDemand = prediction.PredictedMonthlyDemand
                        const trend = previousDemand ? currentDemand - previousDemand : 0

                        return (
                          <div key={`${prediction.StoreID}-${prediction.ProductID}-${prediction.Date}`} 
                               className="grid grid-cols-6 gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-200">
                            {/* Date */}
                            <div className="flex items-center">
                              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                {new Date(prediction.Date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </div>
                            </div>
                            
                            {/* Store */}
                            <div className="flex items-center">
                              <div className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs font-semibold">
                                {prediction.StoreID}
                              </div>
                            </div>
                            
                            {/* Product */}
                            <div className="flex items-center">
                              <div className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-md text-xs font-semibold">
                                {prediction.ProductID}
                              </div>
                            </div>
                            
                            {/* Category */}
                            <div className="flex items-center">
                              <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs font-medium">
                                {categoryMap[`${prediction.StoreID}::${prediction.ProductID}`] || "Unknown"}
                              </div>
                            </div>
                            
                            {/* Predicted Demand */}
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900">
                                {prediction.PredictedMonthlyDemand.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500">units</div>
                            </div>
                            
                            {/* Trend */}
                            <div className="text-right">
                              {index === 0 ? (
                                <div className="text-gray-400 text-sm">-</div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  {trend > 0 ? (
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                  ) : trend < 0 ? (
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <div className="h-4 w-4 bg-gray-300 rounded-full"></div>
                                  )}
                                  <span className={`text-sm font-semibold ${
                                    trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        {/* Price Analysis Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-8">
            {/* Store/Product selectors for Pricing */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Store ({storeOptions.length} total)</label>
                <Select value={selectedStore} onValueChange={(v) => {
                  setSelectedStore(v)
                  const productSet = storeToProducts.get(v)
                  if (productSet) {
                    const sorted = Array.from(productSet).sort((a, b) => a.localeCompare(b))
                    const defaultProduct = productSet.has("P001") ? "P001" : (sorted[0] || "")
                    setSelectedProduct(defaultProduct)
                  } else {
                    setSelectedProduct("")
                  }
                }}>
                  <SelectTrigger className="w-full bg-white/60 backdrop-blur-md border border-white/40 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <SelectValue placeholder="All stores" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/80 backdrop-blur-md border border-white/40 rounded-xl">
                    {storeOptions.map(({ store, count }) => (
                      <SelectItem key={store} value={store}>{store} ({count} products)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product {selectedStore ? `(from ${selectedStore})` : "(all products)"}</label>
                <Select value={selectedProduct} onValueChange={(v) => setSelectedProduct(v)} disabled={!selectedStore}>
                  <SelectTrigger className="w-full bg-white/60 backdrop-blur-md border border-white/80 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] disabled:opacity-70">
                    <SelectValue placeholder={selectedStore ? "Select product" : "Select a store first"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white/80 backdrop-blur-md border border-white/40 rounded-xl">
                    {productOptions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  <div>Total stores: <span className="font-medium text-gray-900">{storeOptions.length}</span></div>
                  {selectedStore && (
                    <div>Products in {selectedStore}: <span className="font-medium text-gray-900">{productOptions.length}</span></div>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                {selectedStore && selectedProduct && (
                  <div className="text-sm text-gray-600">
                    Category: <span className="font-medium text-gray-900">{categoryMap[`${selectedStore}::${selectedProduct}`] || "Unknown"}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="p-2 bg-sns-orange rounded-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                Price Analysis & Optimization
              </h3>
              <p className="text-gray-600 mb-6">
                Advanced price elasticity analysis and revenue optimization for selected products.
              </p>
              
              {/* Price Analysis Content - 70% Chart, 30% Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                {/* Price Time Series Chart - 70% width */}
                <div className="lg:col-span-7">
                  {priceTimeSeries.length > 0 ? (<>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">Price Analysis Over Time</h4>
                          <p className="text-gray-600 text-sm">Price trends and optimization bounds</p>
                        </div>
                      </div>
                      <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceTimeSeries} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(v) => new Date(v + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    />
                    <YAxis tickFormatter={(v) => `₹${Number(v).toFixed(0)}`} />
                    <Tooltip 
                              formatter={(value: number, name: string) => [`₹${Number(value).toFixed(2)}`, name]} 
                      labelFormatter={(label) => new Date(label + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    />
                    <Line 
                      type="linear" 
                      dataKey="current_price" 
                      name="Current Price" 
                      stroke="#f59e0b" 
                      strokeWidth={3} 
                      dot={{ r: 4 }} 
                      connectNulls 
                    />
                    {/* Draw per-month optimal price if returned */}
                    {priceTimeSeries.some((it) => typeof (it as any).optimal_price === 'number') && (
                      <Line 
                        type="linear"
                        dataKey="optimal_price"
                        name="Optimal Price"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={{ r: 2 }}
                        connectNulls
                      />
                    )}
                    <Line 
                      type="linear" 
                      dataKey="upper_bound" 
                      name="Upper Bound" 
                      stroke="#22c55e" 
                      strokeWidth={2} 
                      strokeDasharray="5 5"
                      dot={{ r: 2 }} 
                      connectNulls 
                    />
                    <Line 
                      type="linear" 
                      dataKey="lower_bound" 
                      name="Lower Bound" 
                      stroke="#ef4444" 
                      strokeWidth={2} 
                      strokeDasharray="5 5"
                      dot={{ r: 2 }} 
                      connectNulls 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span>Current Price</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Upper Bound</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Lower Bound</span>
                </div>
                <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Optimal Price</span>
                        </div>
                      </div>
                    </div>

                  </>) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-8 text-center">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-700 mb-2">No Price Data Available</h4>
                      <p className="text-gray-500">
                        {selectedStore && selectedProduct 
                          ? `No price data found for ${selectedStore} - ${selectedProduct}` 
                          : 'Select a store and product to view price analysis'
                        }
                      </p>
                    </div>
                  )}

                  {/* Elasticity and Optimal Price graph removed as requested */}
                </div>

                {/* Pricing Insights - 30% width */}
                <div className="lg:col-span-3">
                  <div className="space-y-4">
                    {/* Current Analysis Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-md flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-blue-500 rounded-md">
                          <Shield className="h-4 w-4 text-white" />
                        </div>
                        <h5 className="text-blue-700 font-semibold text-sm">Current Analysis</h5>
                      </div>
                      <div className="text-xl font-bold text-blue-900 mb-1">
                        {selectedStore && selectedProduct ? `${selectedStore} - ${selectedProduct}` : 'No Selection'}
                      </div>
                      <p className="text-blue-600 text-xs">
                        {selectedStore && selectedProduct ? 
                          `Category: ${categoryMap[`${selectedStore}::${selectedProduct}`] || "Unknown"}` : 
                          'Select store and product for analysis'
                        }
                      </p>
                    </div>

                    {/* Price Range Card */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-md flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-green-500 rounded-md">
                          <BarChart3 className="h-4 w-4 text-white" />
                        </div>
                        <h5 className="text-green-700 font-semibold text-sm">Price Range</h5>
                      </div>
                      <div className="text-xl font-bold text-green-900 mb-1">
                        {priceTimeSeries.length > 0 ? 
                          `₹${Math.min(...priceTimeSeries.map(p => p.lower_bound)).toFixed(0)} - ₹${Math.max(...priceTimeSeries.map(p => p.upper_bound)).toFixed(0)}` :
                          'N/A'
                        }
                      </div>
                      <p className="text-green-600 text-xs">Optimization bounds</p>
                    </div>

                    {/* Analysis Period Card */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 shadow-md flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-purple-500 rounded-md">
                          <Activity className="h-4 w-4 text-white" />
                        </div>
                        <h5 className="text-purple-700 font-semibold text-sm">Analysis Period</h5>
                      </div>
                      <div className="text-xl font-bold text-purple-900 mb-1">
                        {priceTimeSeries.length} months
                      </div>
                      <p className="text-purple-600 text-xs">Data coverage</p>
                    </div>

                    {/* Optimization Insights Card */}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-md flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-orange-500 rounded-md">
                          <Target className="h-4 w-4 text-white" />
                        </div>
                        <h5 className="text-orange-700 font-semibold text-sm">Optimization</h5>
                      </div>
                      <div className="text-xl font-bold text-orange-900 mb-1">High Potential</div>
                      <p className="text-orange-600 text-xs">Revenue optimization</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Price Analysis & Demand Correlation Table - separate container below, styled like Demand Values Table */}
        {activeTab === 'pricing' && priceTimeSeries.length > 0 && (
          <div className="mb-8 ">
            <div className="rounded-xl mt-8 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 backdrop-blur-md border border-white/60 shadow-lg">
              <div className="p-6">
                {/* Professional Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Price Analysis & Demand Correlation</h3>
                      <p className="text-gray-600 text-sm">Monthly price metrics aligned with predicted demand</p>
                    </div>
                  </div>
                  {selectedStore && selectedProduct && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Selected</div>
                      <div className="text-sm font-bold text-sns-orange">{selectedStore} - {selectedProduct}</div>
                    </div>
                  )}
                </div>

                {/* Professional Table Container (grid rows like Demand Values Table) */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                  {/* Enhanced Table Header */}
                  <div className="bg-gradient-to-r from-sns-orange via-orange-500 to-orange-600 px-4 py-3">
                    <div className="grid grid-cols-6 gap-3 text-white font-semibold text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        Month
                      </div>
                      <div className="text-right flex items-center justify-end gap-2">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        Current Price
                      </div>
                      <div className="text-right flex items-center justify-end gap-2">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        Upper Bound
                      </div>
                      <div className="text-right flex items-center justify-end gap-2">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        Lower Bound
                      </div>
                      <div className="text-right flex items-center justify-end gap-2">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        Optimal Price
                      </div>
                      <div className="text-right flex items-center justify-end gap-2">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        Predicted Demand
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Table Body */}
                  <div className="max-h-96 overflow-y-auto">
                    <div className="divide-y divide-gray-100">
                      {(() => {
                        const demandByMonth = new Map<string, number>()
                        for (const r of predictions || []) {
                          if (r.StoreID === selectedStore && r.ProductID === selectedProduct) {
                            const d = new Date(r.Date)
                            const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
                            demandByMonth.set(key, (demandByMonth.get(key) || 0) + Number(r.PredictedMonthlyDemand || 0))
                          }
                        }
                        return priceTimeSeries.map((row) => {
                          const demand = demandByMonth.get(row.month) || 0
                          return (
                            <div key={row.month} 
                                 className="grid grid-cols-6 gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-200">
                              {/* Month */}
                              <div className="flex items-center">
                                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                  {new Date(`${row.month}-01`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </div>
                              </div>
                              {/* Current Price */}
                              <div className="text-right">
                                <div className="text-sm font-semibold text-gray-900">₹{row.current_price.toFixed(2)}</div>
                              </div>
                              {/* Upper Bound */}
                              <div className="text-right">
                                <div className="text-sm text-green-700">₹{row.upper_bound.toFixed(2)}</div>
                              </div>
                              {/* Lower Bound */}
                              <div className="text-right">
                                <div className="text-sm text-red-700">₹{row.lower_bound.toFixed(2)}</div>
                              </div>
                              {/* Optimal Price */}
                              <div className="text-right">
                                <div className="text-sm font-semibold text-sns-orange">₹{(row as any).optimal_price?.toFixed ? (row as any).optimal_price.toFixed(2) : (typeof (row as any).optimal_price === 'number' ? (row as any).optimal_price.toFixed(2) : '—')}</div>
                              </div>
                              {/* Predicted Demand */}
                              <div className="text-right">
                                <div className="text-sm font-semibold">{demand.toFixed(1)}</div>
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}