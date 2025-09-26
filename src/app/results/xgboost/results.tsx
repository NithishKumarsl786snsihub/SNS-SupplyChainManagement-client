"use client"

import { motion } from "framer-motion"
import { Download, Target, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/metric-card"
import { ForecastChart } from "@/components/charts/forecast-chart"
import { FeatureImportanceChart } from "@/components/charts/feature-importance-chart"
import { ModelParameters } from "@/components/model-parameters"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot } from "recharts"
import { useMemo, useState, useEffect } from "react"

type PredictionRow = {
  StoreID: string
  ProductID: string
  Date: string
  PredictedMonthlyDemand: number
}

const mockFeatureImportance = [
  { feature: "Price", importance: 0.38 },
  { feature: "Seasonal Factor", importance: 0.28 },
  { feature: "Inventory Level", importance: 0.18 },
  { feature: "Promotional", importance: 0.16 },
]

const mockParameters = [
  { name: "n_estimators", value: 300, description: "Number of boosting rounds" },
  { name: "max_depth", value: 6, description: "Maximum tree depth" },
  { name: "learning_rate", value: 0.1, description: "Boosting learning rate" },
  { name: "subsample", value: 0.8, description: "Subsample ratio" },
  { name: "colsample_bytree", value: 0.8, description: "Column sampling ratio" },
]

interface ResultsProps {
  onRunAnotherModel: () => void
  predictions: PredictionRow[]
  categoryMap: Record<string, string>
  contextMap: Record<string, Record<string, unknown>>
}

export default function Results({ onRunAnotherModel, predictions, categoryMap, contextMap }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "XGBoost", current: true },
  ]

  const [selectedStore, setSelectedStore] = useState<string>("")
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [gridPoints, setGridPoints] = useState<number>(41)
  const [sweepPct, setSweepPct] = useState<number>(0.30)
  const [priceCurve, setPriceCurve] = useState<Array<{ price: number; predicted_demand: number; revenue: number }>>([])
  const [optimalPoint, setOptimalPoint] = useState<{ price: number; predicted_demand: number; revenue: number } | null>(null)
  const [priceLoading, setPriceLoading] = useState<boolean>(false)
  const [priceError, setPriceError] = useState<string>("")

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
  const initializedDefaults = useMemo(() => {
    if (selectedStore) return true
    const firstStore = storeOptions[0]?.store
    if (firstStore) {
      setSelectedStore(firstStore)
      const firstProduct = (storeToProducts.get(firstStore) && Array.from(storeToProducts.get(firstStore)!).sort((a, b) => a.localeCompare(b))[0]) || ""
      if (firstProduct) setSelectedProduct(firstProduct)
      return true
    }
    return false
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
  }, [monthOptions])

  // Clear curve when store/product changes
  useEffect(() => {
    setPriceCurve([])
    setOptimalPoint(null)
    setPriceError("")
  }, [selectedStore, selectedProduct])

  // Auto-run optimizer when all selections ready and no curve loaded
  useEffect(() => {
    if (selectedStore && selectedProduct && selectedMonth && priceCurve.length === 0 && !priceLoading) {
      void handleRunPriceOptimizer()
    }
  }, [selectedStore, selectedProduct, selectedMonth])

  const handleRunPriceOptimizer = async () => {
    if (!selectedStore || !selectedProduct || !selectedMonth) return
    setPriceError("")
    setPriceLoading(true)
    try {
      const ctxKey = `${selectedStore}::${selectedProduct}::${selectedMonth}`
      let context = contextMap[ctxKey]
      if (!context) {
        const ym = selectedMonth.slice(0, 7)
        const found = Object.entries(contextMap).find(([k]) => k.startsWith(`${selectedStore}::${selectedProduct}::`) && k.includes(ym))
        if (found) context = found[1]
      }
      if (!context) throw new Error("Context not found in uploaded CSV for selected month")

      const payload = {
        StoreID: selectedStore,
        ProductID: selectedProduct,
        Date: selectedMonth,
        grid_points: gridPoints,
        sweep_pct: sweepPct,
        context: context,
      }

      const resp = await fetch("http://127.0.0.1:8000/api/m1/price-optimizer/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "")
        throw new Error(txt || `Optimizer failed with status ${resp.status}`)
      }
      const data = await resp.json()
      setPriceCurve(Array.isArray(data.curve) ? data.curve : [])
      setOptimalPoint(data.optimal || null)
    } catch (e: unknown) {
      setPriceError(e instanceof Error ? e.message : "Failed to run price optimizer")
      setPriceCurve([])
      setOptimalPoint(null)
    } finally {
      setPriceLoading(false)
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
              <Button variant="outline" className="border-sns-orange text-sns-orange hover:bg-sns-orange hover:text-white bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
              <Button className="bg-sns-orange hover:bg-sns-orange-dark text-white" onClick={onRunAnotherModel}>
                Run Another Model
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Metrics section removed per request */}

        {/* Store/Product selectors */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Store ({storeOptions.length} total)</label>
            <Select value={selectedStore} onValueChange={(v) => { setSelectedStore(v); setSelectedProduct("") }}>
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

        {/* Full width forecast chart */}
        <div className="mb-2">
          <ForecastChart data={chartData} title={"Demand Forecast - Predicted Only"} />
        </div>

        {/* Price Analysis */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Price Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v)} disabled={!selectedStore || !selectedProduct || monthOptions.length === 0}>
                <SelectTrigger className="w-full bg-white/60 backdrop-blur-md border border-white/40 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                  <SelectValue placeholder={monthOptions.length ? "Select month" : "No months available"} />
                </SelectTrigger>
                <SelectContent className="bg-white/80 backdrop-blur-md border border-white/40 rounded-xl max-h-64">
                  {monthOptions.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grid Points</label>
              <input type="number" min={5} max={201} step={1} value={gridPoints} onChange={(e) => setGridPoints(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border bg-white/60 backdrop-blur-md border-white/40 shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sweep %</label>
              <input type="number" min={0.05} max={0.9} step={0.01} value={sweepPct} onChange={(e) => setSweepPct(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border bg-white/60 backdrop-blur-md border-white/40 shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus:outline-none" />
            </div>
            <div className="flex items-end">
              <Button className="bg-sns-orange hover:bg-sns-orange-dark text-white w-full" disabled={!selectedStore || !selectedProduct || !selectedMonth || priceLoading} onClick={handleRunPriceOptimizer}>
                {priceLoading ? "Optimizing..." : "Run Price Optimizer"}
              </Button>
            </div>
          </div>

          {priceError && (
            <div className="text-sm text-red-600 mb-3">{priceError}</div>
          )}

          {priceCurve.length > 0 && (
            <div className="rounded-xl p-4 bg-white/60 backdrop-blur-md border border-white/40 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-medium text-gray-800 mb-3">Revenue vs Price</h3>
              {
                /* Compute dynamic domains for revenue and demand with padding */
              }
              {(() => {
                const revVals = priceCurve.map((p) => p.revenue)
                const demVals = priceCurve.map((p) => p.predicted_demand)
                const revMin = Math.min(...revVals)
                const revMax = Math.max(...revVals)
                const demMin = Math.min(...demVals)
                const demMax = Math.max(...demVals)
                const revRange = Math.max(1, revMax - revMin)
                const demRange = Math.max(1, demMax - demMin)
                const revPad = Math.max(10, Math.round(revRange * 0.1))
                const demPad = Math.max(1, Math.round(demRange * 0.1))
                const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)
                return (
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceCurve} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="price" tickFormatter={(v) => `${Number(v).toFixed(0)}`} />
                    <YAxis yAxisId="left" domain={[revMin - revPad, revMax + revPad]} tickFormatter={(v) => compact(Number(v))} />
                    <YAxis yAxisId="right" domain={[demMin - demPad, demMax + demPad]} orientation="right" tickFormatter={(v) => compact(Number(v))} />
                    <Tooltip formatter={(value: any, name: any) => [compact(Number(value)), name]} labelFormatter={(label) => `Price: ${Number(label).toFixed(2)}`} />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#D96F32" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    <Line yAxisId="right" type="monotone" dataKey="predicted_demand" name="Predicted Demand" stroke="#2563eb" strokeWidth={2} dot={{ r: 0 }} connectNulls />
                    {optimalPoint && (
                      <ReferenceDot x={optimalPoint.price} y={optimalPoint.revenue} yAxisId="left" r={5} fill="#10b981" stroke="#065f46" label={{ value: "Optimal", position: "top", fill: "#065f46" }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
                )
              })()}
              {optimalPoint && (
                <div className="mt-3 text-sm">
                  <span className="font-medium">Optimal Price:</span> {optimalPoint.price.toFixed(2)} • 
                  <span className="ml-2 font-medium">Demand:</span> {optimalPoint.predicted_demand.toFixed(2)} • 
                  <span className="ml-2 font-medium">Revenue:</span> {optimalPoint.revenue.toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
