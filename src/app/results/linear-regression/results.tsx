"use client"

import React from "react"
import { motion } from "framer-motion"
import { Download, Target, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/metric-card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, ScatterChart, Scatter, Area, ComposedChart, ReferenceArea, ReferenceLine } from "recharts"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { TrainingResponse, PredictionResponse, predictFromFutureFile, FuturePredictResponse, optimizePricingLinear, optimizePricingLogLog, PricingResponse } from "@/config/api"

const mockForecastData = [
  { date: "2024-01-01", actual: 1250, predicted: 1235, confidence_upper: 1285, confidence_lower: 1185 },
  { date: "2024-01-02", actual: 1180, predicted: 1170, confidence_upper: 1220, confidence_lower: 1120 },
  { date: "2024-01-03", actual: 1320, predicted: 1305, confidence_upper: 1355, confidence_lower: 1255 },
  { date: "2024-01-04", actual: 1450, predicted: 1420, confidence_upper: 1470, confidence_lower: 1370 },
  { date: "2024-01-05", actual: 1380, predicted: 1355, confidence_upper: 1405, confidence_lower: 1305 },
  { date: "2024-01-06", predicted: 1280, confidence_upper: 1330, confidence_lower: 1230 },
  { date: "2024-01-07", predicted: 1150, confidence_upper: 1200, confidence_lower: 1100 },
  { date: "2024-01-08", predicted: 1210, confidence_upper: 1260, confidence_lower: 1160 },
  { date: "2024-01-09", predicted: 1320, confidence_upper: 1370, confidence_lower: 1270 },
  { date: "2024-01-10", predicted: 1450, confidence_upper: 1500, confidence_lower: 1400 },
]

// removed feature-importance/model-parameters mock data

interface ResultsProps {
  onRunAnotherModel: () => void
  trainingResult?: TrainingResponse | null
  predictionResult?: PredictionResponse | null
  datasetId?: number
  datasetIdM6?: number
}

export default function Results({ onRunAnotherModel, trainingResult, predictionResult, datasetId, datasetIdM6 }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "Linear Regression", current: true },
  ]

  // Prepare Actual vs Predicted series from training result (old backend style)
  const actualVsPredictedData = (() => {
    const avp = trainingResult?.actual_vs_predicted
    if (!avp || !Array.isArray(avp.actual) || !Array.isArray(avp.predicted)) {
      // fallback: build from mock
      return mockForecastData.map((d, idx) => ({ index: idx + 1, actual: d.actual ?? undefined, predicted: d.predicted }))
    }
    const length = Math.min(avp.actual.length, avp.predicted.length)
    return Array.from({ length }, (_, i) => ({ index: i + 1, actual: avp.actual[i], predicted: avp.predicted[i] }))
  })()

  // removed feature importance normalization (container removed)
  
  const metrics = trainingResult?.metrics
  const r2Score = metrics?.r2_score ? (metrics.r2_score * 100).toFixed(1) : "84.7"
  const mape = metrics?.mae ? ((metrics.mae / 1000) * 100).toFixed(1) : "8.3"
  const rmse = metrics?.rmse ? metrics.rmse.toFixed(1) : "89.5"

  // Future prediction UI state
  const [futureFile, setFutureFile] = React.useState<File | null>(null)
  const [futureDateColumn, setFutureDateColumn] = React.useState<string>('date')
  const [futureColumns, setFutureColumns] = React.useState<string[]>([])
  const [futureResults, setFutureResults] = React.useState<FuturePredictResponse | null>(null)
  const [isPredicting, setIsPredicting] = React.useState(false)
  const [activePriceTab, setActivePriceTab] = React.useState<'linear' | 'loglog'>('linear')
  const [pricingLinear, setPricingLinear] = React.useState<PricingResponse | null>(null)
  const [pricingLogLog, setPricingLogLog] = React.useState<PricingResponse | null>(null)
  const [pricingLoading, setPricingLoading] = React.useState(false)
  
  // Toggle states for explanations
  const [linearChartExplanationExpanded, setLinearChartExplanationExpanded] = React.useState(true)
  const [linearTimeSeriesExpanded, setLinearTimeSeriesExpanded] = React.useState(true)
  const [logLogChartExplanationExpanded, setLogLogChartExplanationExpanded] = React.useState(true)
  const [logLogTimeSeriesExpanded, setLogLogTimeSeriesExpanded] = React.useState(true)

  // Build future-features sample data (dates after 2023-01-20, no demand column)
  const buildFutureSampleRows = React.useCallback(() => {
    // Base off the sample dataset window which ends at 2023-01-20
    const startDate = new Date('2023-01-21T00:00:00Z')
    const numDays = 10
    const rows: Array<Record<string, unknown>> = []
    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate)
      d.setUTCDate(startDate.getUTCDate() + i)
      const iso = d.toISOString().slice(0, 10)
      // Generate values related to prior ranges
      const price = 24.5 + ((i % 5) - 2) * 0.3 // ~24-26 range
      const competitor_price = price + (Math.random() * 0.8 - 0.4)
      const marketing_spend = 1100 + (i % 4) * 150 // 1100..1550
      const temperature = 22 + (i % 7) * 0.9 // ~22..28
      const seasonality = 1
      const holiday_flag = i === 5 ? 1 : 0
      const weather_condition = ['sunny', 'cloudy', 'rainy'][i % 3]
      const inventory_level = 480 - i * 5 // trending down
      const sales_volume = 150 + (Math.round((155 - price) + (marketing_spend - 1100) / 50))
      rows.push({
        date: iso,
        price: Number(price.toFixed(2)),
        sales_volume: Math.max(100, sales_volume),
        inventory_level: Math.max(300, inventory_level),
        marketing_spend,
        temperature: Number(temperature.toFixed(1)),
        seasonality,
        competitor_price: Number(competitor_price.toFixed(1)),
        holiday_flag,
        weather_condition,
      })
    }
    return rows
  }, [])

  const buildFutureSampleCsv = React.useCallback(() => {
    const rows = buildFutureSampleRows()
    const headers = Object.keys(rows[0])
    const csvLines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => String((r as Record<string, unknown>)[h])).join(',')),
    ]
    return csvLines.join('\n')
  }, [buildFutureSampleRows])

  const handleDownloadFutureSample = React.useCallback(() => {
    try {
      const csv = buildFutureSampleCsv()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'future_features_sample.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Download future sample failed', e)
      alert('Failed to download sample')
    }
  }, [buildFutureSampleCsv])

  const handleUseFutureSample = React.useCallback(async () => {
    try {
      const csv = buildFutureSampleCsv()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const file = new File([blob], 'future_features_sample.csv', { type: 'text/csv' })
      setFutureFile(file)
      // Set columns/date column for UI
      const headers = Object.keys(buildFutureSampleRows()[0])
      setFutureColumns(headers)
      if (headers.includes('date')) setFutureDateColumn('date')
      // Immediately run prediction
      setIsPredicting(true)
      const dsId = datasetId ?? (trainingResult as any)?.dataset_id ?? (trainingResult as any)?.id
      if (!dsId) throw new Error('Missing dataset id. Please re-upload and train again.')
      const resp = await predictFromFutureFile(Number(dsId), file, 'demand', 'date')
      setFutureResults(resp)
    } catch (e) {
      console.error('Use future sample failed', e)
      alert(e instanceof Error ? e.message : 'Prediction failed')
    } finally {
      setIsPredicting(false)
    }
  }, [buildFutureSampleCsv, buildFutureSampleRows, datasetId, trainingResult])

  const handleFutureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setFutureFile(f)
    setFutureColumns([])
    if (f && f.name.toLowerCase().endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const text = String(ev.target?.result || '')
          const firstLine = text.split(/\r?\n/)[0] || ''
          const cols = firstLine.split(',').map(c => c.trim()).filter(Boolean)
          setFutureColumns(cols)
          if (cols.includes('date')) setFutureDateColumn('date')
          else if (cols.length > 0) setFutureDateColumn(cols[0])
        } catch {}
      }
      reader.readAsText(f)
    }
  }

  const prepareFutureData = () => {
    if (!futureResults?.future_predictions) return []
    return futureResults.future_predictions.map((pred) => ({
      label: pred.date ? pred.date : (pred.month ? `Month ${pred.month}` : String(pred.index)),
      predicted: pred.predicted_demand,
      upper: pred.confidence_upper || pred.predicted_demand * 1.2,  // 20% higher
      lower: pred.confidence_lower || pred.predicted_demand * 0.7   // 30% lower
    }))
  }

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Linear Regression Forecasting Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Simple, interpretable baseline model for understanding linear relationships in your supply chain data.</p>
            </div>
            <div className="flex items-center gap-3">
              {/* <Button variant="outline" className="border-sns-orange text-sns-orange hover:bg-sns-orange hover:text-white bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button> */}
              <Button className="bg-sns-orange hover:bg-sns-orange-dark text-white" onClick={onRunAnotherModel}>
                Run Another Model
              </Button>
            </div>
          </div>
        </motion.div>

        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard 
            title="R² Score" 
            value={r2Score} 
            change={0.05} 
            changeType="increase" 
            icon={<Target className="h-4 w-4" />} 
            description="Coefficient of determination" 
          />
          <MetricCard 
            title="MAPE" 
            value={`${mape}%`} 
            change={1.2} 
            changeType="decrease" 
            icon={<TrendingUp className="h-4 w-4" />} 
            description="Mean Absolute Percentage Error" 
          />
          <MetricCard 
            title="RMSE" 
            value={rmse} 
            change={5.2} 
            changeType="decrease" 
            icon={<AlertCircle className="h-4 w-4" />} 
            description="Root Mean Square Error" 
          />
          <MetricCard 
            title="Interpretability" 
            value="High" 
            icon={<TrendingUp className="h-4 w-4" />} 
            description="Linear relationship clarity" 
          />
        </div> */}

        {/* Actual vs Predicted Demand (old backend style), themed to new UI */}
        <div className="mb-8">
          <div className="mb-4">
            <h4 className="text-lg font-medium text-gray-900">Actual vs Predicted Demand</h4>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={actualVsPredictedData}
                margin={{ top: 20, right: 30, left: 60, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="index" 
                  tick={{ fill: '#374151' }} 
                  label={{ value: 'Data Point Index', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#374151' } }}
                />
                <YAxis 
                  tick={{ fill: '#374151' }} 
                  tickFormatter={(value: number) => Number(value).toFixed(0)}
                  label={{ value: 'Demand', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151' } }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb' }}
                  formatter={(value: number | string, name: string) => [
                    typeof value === 'number' ? value.toFixed(0) : String(value),
                    name
                  ]}
                />
                <Line type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={2} name="Actual Demand" connectNulls />
                <Line type="monotone" dataKey="predicted" stroke="#10B981" strokeWidth={2} name="Predicted Demand" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature Importance and Model Configuration removed as requested */}

        {/* Future Demand Prediction */}
        <div className="bg-white/70 backdrop-blur ring-1 ring-[#F3E9DC] rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">Future Demand Prediction</h4>
          </div>
          <div className="mt-2 bg-white rounded-md p-4 border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Upload Future Features (no demand)</label>
                <input
                  id="future-file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFutureUpload}
                  className="hidden"
                />
                <label
                  htmlFor="future-file-upload"
                  className="cursor-pointer bg-sns-orange text-white px-3 py-2 rounded-md hover:bg-sns-orange-dark text-sm"
                >
                  Choose File
                </label>
                <span className="text-sm text-gray-600">
                  {futureFile ? futureFile.name : 'No file selected'}
                </span>
                <button
                  type="button"
                  onClick={handleDownloadFutureSample}
                  className="px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 border"
                  title="Download sample future-features CSV"
                >
                  Download Sample
                </button>
                <button
                  type="button"
                  onClick={handleUseFutureSample}
                  className="px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
                  disabled={isPredicting || !datasetId}
                  title="Use sample future-features and run prediction"
                >
                  Use Sample
                </button>
                <select
                  value={futureDateColumn}
                  onChange={(e) => setFutureDateColumn(e.target.value)}
                  className="w-48 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sns-orange text-gray-900 bg-white text-sm"
                  title="Select the date column from the uploaded CSV"
                  disabled={futureColumns.length === 0}
                >
                  {futureColumns.length === 0 ? (
                    <option value="">Select date column</option>
                  ) : (
                    futureColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))
                  )}
                </select>
              </div>
              <Button
                onClick={async () => {
                  if (!futureFile) return
                  // Use datasetId threaded from upload/page; fallback to any id on trainingResult
                  try {
                    setIsPredicting(true)
                    const dsId = datasetId ?? (trainingResult as any)?.dataset_id ?? (trainingResult as any)?.id
                    if (!dsId) throw new Error('Missing dataset id. Please re-upload and train again.')
                    const resp = await predictFromFutureFile(Number(dsId), futureFile, 'demand', futureDateColumn)
                    setFutureResults(resp)
                  } catch (e) {
                    console.error('Future predict failed', e)
                    alert(e instanceof Error ? e.message : 'Prediction failed')
                  } finally {
                    setIsPredicting(false)
                  }
                }}
                disabled={isPredicting || !futureFile}
                className="bg-sns-orange hover:bg-sns-orange-dark text-white"
              >
                {isPredicting ? 'Predicting...' : 'Predict from File'}
              </Button>
            </div>

            {futureResults && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={prepareFutureData()}
                    margin={{ top: 20, right: 30, left: 60, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#374151' }} 
                      label={{ value: 'Date / Horizon', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#374151' } }}
                    />
                    <YAxis 
                      tick={{ fill: '#374151' }} 
                      tickFormatter={(value: number) => Number(value).toFixed(0)}
                      label={{ value: 'Predicted Demand', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151' } }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb' }}
                      formatter={(value: number | string, name: string) => [
                        typeof value === 'number' ? value.toFixed(0) : String(value),
                        name === 'predicted' ? 'Predicted Demand' : 
                        name === 'upper' ? 'Upper Confidence' :
                        name === 'lower' ? 'Lower Confidence' : name
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="upper" 
                      stroke="#D96F32" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Upper Confidence Bound"
                      dot={{ fill: '#D96F32', strokeWidth: 1, r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="lower" 
                      stroke="#D96F32" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Lower Confidence Bound"
                      dot={{ fill: '#D96F32', strokeWidth: 1, r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="#D96F32" 
                      strokeWidth={3}
                      name="Predicted Demand"
                      dot={{ fill: '#D96F32', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

    {/* Price Elasticity & Optimization */}
    <div className="bg-white/70 backdrop-blur ring-1 ring-[#F3E9DC] rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium text-gray-900">Price Elasticity & Optimization</h4>
      </div>

      {!futureResults ? (
        <div className="p-4 border rounded-lg bg-[#F3E9DC]/30 text-gray-800">
          <p className="text-sm">
            Please complete the Future Demand Prediction above before running price elasticity and optimization.
          </p>
        </div>
      ) : (
      <>
      {/* Before first run: show only guidance + button */}
      {(!pricingLinear && !pricingLogLog) ? (
        <div className="p-4 border rounded-lg bg-[#F3E9DC]/30 text-gray-800 mb-4 flex items-center justify-between">
          <p className="text-sm">Click "Run Optimization" to compute price elasticity and optimization results.</p>
          <Button
            className="bg-sns-orange hover:bg-sns-orange-dark text-white"
            disabled={pricingLoading || !datasetId}
            onClick={async () => {
              if (!datasetId) return
              try {
                setPricingLoading(true)
                // Extract dates and demands from future results if available
                const futureDates = futureResults?.future_predictions?.map(pred => pred.date).filter(Boolean) || undefined
                const futureDemands = futureResults?.future_predictions?.map(pred => pred.predicted_demand) || undefined
                // default to linear on first run
                const res = await optimizePricingLinear(datasetId, 'price', 'demand', futureDates, futureDemands)
                setPricingLinear(res)
                setActivePriceTab('linear')
              } catch (e) {
                console.error('Pricing optimization failed', e)
                alert(e instanceof Error ? e.message : 'Pricing optimization failed')
              } finally {
                setPricingLoading(false)
              }
            }}
          >
            {pricingLoading ? 'Calculating…' : 'Run Optimization'}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-4">
          <button
            className={`px-3 py-1.5 rounded-md text-sm ${activePriceTab === 'linear' ? 'bg-sns-orange text-white' : 'bg-gray-100 text-gray-800'}`}
            onClick={() => setActivePriceTab('linear')}
          >
            Linear
          </button>
          <button
            className={`px-3 py-1.5 rounded-md text-sm ${activePriceTab === 'loglog' ? 'bg-sns-orange text-white' : 'bg-gray-100 text-gray-800'}`}
            onClick={() => setActivePriceTab('loglog')}
          >
            Log-Log
          </button>
          <Button
            className="ml-auto bg-sns-orange hover:bg-sns-orange-dark text-white"
            disabled={pricingLoading || !datasetId}
            onClick={async () => {
              if (!datasetId) return
              try {
                setPricingLoading(true)
                // Extract dates and demands from future results if available
                const futureDates = futureResults?.future_predictions?.map(pred => pred.date).filter(Boolean) || undefined
                const futureDemands = futureResults?.future_predictions?.map(pred => pred.predicted_demand) || undefined
                if (activePriceTab === 'linear') {
                  const res = await optimizePricingLinear(datasetId, 'price', 'demand', futureDates, futureDemands)
                  setPricingLinear(res)
                } else {
                  const idToUse = datasetIdM6 ?? datasetId
                  const res = await optimizePricingLogLog(idToUse, 'price', 'demand', futureDates, futureDemands)
                  setPricingLogLog(res)
                }
              } catch (e) {
                console.error('Pricing optimization failed', e)
                alert(e instanceof Error ? e.message : 'Pricing optimization failed')
              } finally {
                setPricingLoading(false)
              }
            }}
          >
            {pricingLoading ? 'Recalculating…' : 'Run Optimization'}
          </Button>
        </div>
      )}

      {activePriceTab === 'linear' && (
        <>
          {!pricingLinear ? (
            <div className="p-4 border rounded-lg bg-[#F3E9DC]/30 text-gray-800">Run optimization to view linear pricing insights.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <MetricCard title="Optimal Price" value={pricingLinear.optimal_price?.toFixed(2) ?? '-'} description="Best Price Point" />
                <MetricCard title="Max Revenue" value={pricingLinear.max_revenue?.toFixed(0) ?? '-'} description="Expected Revenue" />
                <MetricCard title="Elasticity" value={pricingLinear.elasticity?.toFixed(3) ?? '-'} description="Price Elasticity" />
                <MetricCard title="Current Price" value={pricingLinear.current_price?.toFixed(2) ?? '-'} description="Baseline Price" />
              </div>
              {(pricingLinear.simulations && pricingLinear.simulations.length > 0) && (
                <div className="mb-8">
                  <h5 className="text-md font-semibold text-gray-900 mb-4">Price Optimization Analysis</h5>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={pricingLinear.simulations.map(s => ({ price: s.price, demand: s.predicted_demand, revenue: s.revenue }))} margin={{ top: 20, right: 80, left: 60, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="price" 
                          tick={{ fill: '#374151' }} 
                          tickFormatter={(v: number) => `$${v.toFixed(2)}`} 
                          label={{ value: 'Price ($)', position: 'insideBottom', offset: -15, style: { textAnchor: 'middle', fill: '#374151' } }} 
                        />
                        <YAxis 
                          yAxisId="demand"
                          orientation="left"
                          tick={{ fill: '#8884d8' }} 
                          tickFormatter={(v: number) => v.toFixed(0)} 
                          label={{ value: 'Demand', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#8884d8' } }} 
                        />
                        <YAxis 
                          yAxisId="revenue"
                          orientation="right"
                          tick={{ fill: '#82ca9d' }} 
                          tickFormatter={(v: number) => `$${v.toFixed(0)}`} 
                          label={{ value: 'Revenue ($)', angle: 90, position: 'insideRight', offset: -20, style: { textAnchor: 'middle', fill: '#82ca9d' } }} 
                        />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }} 
                          contentStyle={{ backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb' }} 
                          formatter={(val: number | string, name: string) => [
                            name === 'price' && typeof val === 'number' ? `$${val.toFixed(2)}` : 
                            name === 'revenue' && typeof val === 'number' ? `$${val.toFixed(0)}` :
                            typeof val === 'number' ? val.toFixed(0) : String(val), 
                            name === 'price' ? 'Price' :
                            name === 'demand' ? 'Demand' :
                            name === 'revenue' ? 'Revenue' : name
                          ]}
                        />
                        <Line 
                          yAxisId="demand"
                          type="monotone" 
                          dataKey="demand" 
                          stroke="#8884d8" 
                          strokeWidth={3}
                          name="Demand"
                          dot={{ fill: '#8884d8', strokeWidth: 2, r: 3 }}
                        />
                        <Line 
                          yAxisId="revenue"
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#82ca9d" 
                          strokeWidth={3}
                          name="Revenue"
                          dot={{ fill: '#82ca9d', strokeWidth: 2, r: 3 }}
                        />
                        {/* Add reference lines for optimal price */}
                        {pricingLinear.optimal_price && (
                          <ReferenceLine 
                            x={pricingLinear.optimal_price} 
                            stroke="#10B981" 
                            strokeDasharray="5 5" 
                            label={{ value: "Optimal Price", position: "top" }}
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <button
                      onClick={() => setLinearChartExplanationExpanded(!linearChartExplanationExpanded)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h6 className="font-semibold text-blue-800">Chart Explanation:</h6>
                      {linearChartExplanationExpanded ? (
                        <ChevronUp className="h-4 w-4 text-blue-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                    {linearChartExplanationExpanded && (
                      <div className="text-sm text-blue-700 space-y-1 mt-2">
                        <p><span className="font-medium">Blue Line (Demand):</span> Shows how demand decreases as price increases (price elasticity)</p>
                        <p><span className="font-medium">Green Line (Revenue):</span> Shows revenue curve - peaks at optimal price point</p>
                        <p><span className="font-medium">Vertical Green Line:</span> Marks the optimal price that maximizes revenue</p>
                        <p><span className="font-medium">Left Y-axis:</span> Demand units | <span className="font-medium">Right Y-axis:</span> Revenue in dollars</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Price Bounds Analysis Over Time */}
              {(pricingLinear.time_series_data && pricingLinear.time_series_data.length > 0) ? (
                <div className="mt-8">
                  <h5 className="text-md font-semibold text-gray-900 mb-4">Price Bounds & Revenue Analysis Over Time</h5>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart 
                        data={pricingLinear.time_series_data}
                        margin={{ top: 20, right: 80, left: 60, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: '#374151' }} 
                          label={{ value: 'Date', position: 'insideBottom', offset: -15, style: { textAnchor: 'middle', fill: '#374151' } }}
                          tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis 
                          tick={{ fill: '#374151' }} 
                          tickFormatter={(v: number) => `$${v.toFixed(2)}`} 
                          label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', offset: -15, style: { textAnchor: 'middle', fill: '#374151' } }} 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb' }}
                          formatter={(val: number | string, name: string) => [
                            name === 'current_price' ? `$${Number(val).toFixed(2)}` :
                            name === 'optimal_price' ? `$${Number(val).toFixed(2)}` :
                            name === 'upper_bound_price' ? `$${Number(val).toFixed(2)}` :
                            name === 'lower_bound_price' ? `$${Number(val).toFixed(2)}` :
                            typeof val === 'number' ? val.toFixed(0) : String(val),
                            name === 'current_price' ? 'Current Price' :
                            name === 'optimal_price' ? 'Optimal Price' :
                            name === 'upper_bound_price' ? 'Upper Bound' :
                            name === 'lower_bound_price' ? 'Lower Bound' : name
                          ]}
                          labelFormatter={(value: string) => `Date: ${new Date(value).toLocaleDateString()}`}
                        />
                        {/* Price Lines */}
                        <Line 
                          type="monotone" 
                          dataKey="current_price" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          name="Current Price"
                          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="optimal_price" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          name="Optimal Price"
                          dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="upper_bound_price" 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Upper Bound"
                          dot={{ fill: '#F59E0B', strokeWidth: 1, r: 3 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="lower_bound_price" 
                          stroke="#EF4444" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Lower Bound"
                          dot={{ fill: '#EF4444', strokeWidth: 1, r: 3 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <button
                      onClick={() => setLinearTimeSeriesExpanded(!linearTimeSeriesExpanded)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h6 className="font-semibold text-green-800">Time-Series Analysis:</h6>
                      {linearTimeSeriesExpanded ? (
                        <ChevronUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-green-600" />
                      )}
                    </button>
                    {linearTimeSeriesExpanded && (
                      <div className="text-sm text-green-700 space-y-1 mt-2">
                        <p><span className="font-medium">Solid Lines:</span> Current Price (Blue) and Optimal Price (Green) - your pricing strategy</p>
                        <p><span className="font-medium">Dashed Lines:</span> Upper Bound (Orange) and Lower Bound (Red) - pricing limits</p>
                        <p><span className="font-medium">Y-axis:</span> Price in dollars - shows how prices should change over time</p>
                        <p><span className="font-medium">X-axis:</span> Time/Date - shows pricing strategy evolution over time periods</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="font-semibold text-blue-800">Current Price</div>
                      <div className="text-blue-600">${pricingLinear.current_price?.toFixed(2)}</div>
                      <div className="text-xs text-blue-500">Current market price</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="font-semibold text-green-800">Optimal Price</div>
                      <div className="text-green-600">${pricingLinear.optimal_price?.toFixed(2)}</div>
                      <div className="text-xs text-green-500">Maximum revenue point</div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="font-semibold text-orange-800">Upper Bound</div>
                      <div className="text-orange-600">${pricingLinear.upper_bound_price?.toFixed(2)}</div>
                      <div className="text-xs text-orange-500">Maximum before sales drop</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="font-semibold text-red-800">Lower Bound</div>
                      <div className="text-red-600">${pricingLinear.lower_bound_price?.toFixed(2)}</div>
                      <div className="text-xs text-red-500">Minimum profitable price</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-8">
                  <h5 className="text-md font-semibold text-gray-900 mb-4">Price Bounds Analysis</h5>
                  <div className="p-4 border rounded-lg bg-[#F3E9DC]/30 text-gray-800">
                    <p className="text-sm">
                      Complete the Future Demand Prediction above to see price bounds analysis over time.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activePriceTab === 'loglog' && (
        <>
          {!pricingLogLog ? (
            <div className="p-4 border rounded-lg bg-[#F3E9DC]/30 text-gray-800">Run optimization to view log-log pricing insights.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <MetricCard title="Optimal Price" value={pricingLogLog.optimal_price?.toFixed(2) ?? '-'} description="Best Price Point" />
                <MetricCard title="Max Revenue" value={pricingLogLog.max_revenue?.toFixed(0) ?? '-'} description="Expected Revenue" />
                <MetricCard title="Elasticity" value={pricingLogLog.elasticity?.toFixed(3) ?? '-'} description="Price Elasticity" />
                <MetricCard title="Current Price" value={pricingLogLog.current_price?.toFixed(2) ?? '-'} description="Baseline Price" />
              </div>
              {(pricingLogLog.simulations && pricingLogLog.simulations.length > 0) && (
                <div className="mb-8">
                  <h5 className="text-md font-semibold text-gray-900 mb-4">Price Optimization Analysis (Log-Log Model)</h5>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={pricingLogLog.simulations.map(s => ({ price: s.price, demand: s.predicted_demand, revenue: s.revenue }))} margin={{ top: 20, right: 80, left: 60, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="price" 
                          tick={{ fill: '#374151' }} 
                          tickFormatter={(v: number) => `$${v.toFixed(2)}`} 
                          label={{ value: 'Price ($)', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#374151' } }} 
                        />
                        <YAxis 
                          yAxisId="demand"
                          orientation="left"
                          tick={{ fill: '#8884d8' }} 
                          tickFormatter={(v: number) => v.toFixed(0)} 
                          label={{ value: 'Demand', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#8884d8' } }} 
                        />
                        <YAxis 
                          yAxisId="revenue"
                          orientation="right"
                          tick={{ fill: '#82ca9d' }} 
                          tickFormatter={(v: number) => `$${v.toFixed(0)}`} 
                          label={{ value: 'Revenue ($)', angle: 90, position: 'insideRight', offset: -20, style: { textAnchor: 'middle', fill: '#82ca9d' } }} 
                        />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }} 
                          contentStyle={{ backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb' }} 
                          formatter={(val: number | string, name: string) => [
                            name === 'price' && typeof val === 'number' ? `$${val.toFixed(2)}` : 
                            name === 'revenue' && typeof val === 'number' ? `$${val.toFixed(0)}` :
                            typeof val === 'number' ? val.toFixed(0) : String(val), 
                            name === 'price' ? 'Price' :
                            name === 'demand' ? 'Demand' :
                            name === 'revenue' ? 'Revenue' : name
                          ]}
                        />
                        <Line 
                          yAxisId="demand"
                          type="monotone" 
                          dataKey="demand" 
                          stroke="#8884d8" 
                          strokeWidth={3}
                          name="Demand"
                          dot={{ fill: '#8884d8', strokeWidth: 2, r: 3 }}
                        />
                        <Line 
                          yAxisId="revenue"
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#82ca9d" 
                          strokeWidth={3}
                          name="Revenue"
                          dot={{ fill: '#82ca9d', strokeWidth: 2, r: 3 }}
                        />
                        {/* Add reference lines for optimal price */}
                        {pricingLogLog.optimal_price && (
                          <ReferenceLine 
                            x={pricingLogLog.optimal_price} 
                            stroke="#10B981" 
                            strokeDasharray="5 5" 
                            label={{ value: "Optimal Price", position: "top" }}
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <button
                      onClick={() => setLogLogChartExplanationExpanded(!logLogChartExplanationExpanded)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h6 className="font-semibold text-blue-800">Log-Log Chart Explanation:</h6>
                      {logLogChartExplanationExpanded ? (
                        <ChevronUp className="h-4 w-4 text-blue-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                    {logLogChartExplanationExpanded && (
                      <div className="text-sm text-blue-700 space-y-1 mt-2">
                        <p><span className="font-medium">Blue Line (Demand):</span> Shows logarithmic demand response to price changes</p>
                        <p><span className="font-medium">Green Line (Revenue):</span> Shows revenue curve - peaks at optimal price point</p>
                        <p><span className="font-medium">Vertical Green Line:</span> Marks the optimal price that maximizes revenue</p>
                        <p><span className="font-medium">Left Y-axis:</span> Demand units | <span className="font-medium">Right Y-axis:</span> Revenue in dollars</p>
                        <p><span className="font-medium">Log-Log Model:</span> Assumes constant price elasticity across all price levels</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Price Bounds Analysis Over Time for Log-Log */}
              {(pricingLogLog.time_series_data && pricingLogLog.time_series_data.length > 0) ? (
                <div className="mt-8">
                  <h5 className="text-md font-semibold text-gray-900 mb-4">Price Bounds & Revenue Analysis Over Time (Log-Log Model)</h5>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart 
                        data={pricingLogLog.time_series_data}
                        margin={{ top: 20, right: 80, left: 60, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: '#374151' }} 
                          label={{ value: 'Date', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#374151' } }}
                          tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis 
                          tick={{ fill: '#374151' }} 
                          tickFormatter={(v: number) => `$${v.toFixed(2)}`} 
                          label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', offset: -10, style: { textAnchor: 'middle', fill: '#374151' } }} 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb' }}
                          formatter={(val: number | string, name: string) => [
                            name === 'current_price' ? `$${Number(val).toFixed(2)}` :
                            name === 'optimal_price' ? `$${Number(val).toFixed(2)}` :
                            name === 'upper_bound_price' ? `$${Number(val).toFixed(2)}` :
                            name === 'lower_bound_price' ? `$${Number(val).toFixed(2)}` :
                            typeof val === 'number' ? val.toFixed(0) : String(val),
                            name === 'current_price' ? 'Current Price' :
                            name === 'optimal_price' ? 'Optimal Price' :
                            name === 'upper_bound_price' ? 'Upper Bound' :
                            name === 'lower_bound_price' ? 'Lower Bound' : name
                          ]}
                          labelFormatter={(value: string) => `Date: ${new Date(value).toLocaleDateString()}`}
                        />
                        {/* Price Lines */}
                        <Line 
                          type="monotone" 
                          dataKey="current_price" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          name="Current Price"
                          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="optimal_price" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          name="Optimal Price"
                          dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="upper_bound_price" 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Upper Bound"
                          dot={{ fill: '#F59E0B', strokeWidth: 1, r: 3 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="lower_bound_price" 
                          stroke="#EF4444" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Lower Bound"
                          dot={{ fill: '#EF4444', strokeWidth: 1, r: 3 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <button
                      onClick={() => setLogLogTimeSeriesExpanded(!logLogTimeSeriesExpanded)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h6 className="font-semibold text-purple-800">Log-Log Time-Series Analysis:</h6>
                      {logLogTimeSeriesExpanded ? (
                        <ChevronUp className="h-4 w-4 text-purple-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-purple-600" />
                      )}
                    </button>
                    {logLogTimeSeriesExpanded && (
                      <div className="text-sm text-purple-700 space-y-1 mt-2">
                        <p><span className="font-medium">Solid Lines:</span> Current Price (Blue) and Optimal Price (Green) - your pricing strategy</p>
                        <p><span className="font-medium">Dashed Lines:</span> Upper Bound (Orange) and Lower Bound (Red) - pricing limits</p>
                        <p><span className="font-medium">Y-axis:</span> Price in dollars - shows how prices should change over time</p>
                        <p><span className="font-medium">X-axis:</span> Time/Date - shows pricing strategy evolution over time periods</p>
                        <p><span className="font-medium">Log-Log Model:</span> Constant elasticity model with logarithmic relationships</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="font-semibold text-blue-800">Current Price</div>
                      <div className="text-blue-600">${pricingLogLog.current_price?.toFixed(2)}</div>
                      <div className="text-xs text-blue-500">Current market price</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="font-semibold text-green-800">Optimal Price</div>
                      <div className="text-green-600">${pricingLogLog.optimal_price?.toFixed(2)}</div>
                      <div className="text-xs text-green-500">Maximum revenue point</div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="font-semibold text-orange-800">Upper Bound</div>
                      <div className="text-orange-600">${pricingLogLog.upper_bound_price?.toFixed(2)}</div>
                      <div className="text-xs text-orange-500">Maximum before sales drop</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="font-semibold text-red-800">Lower Bound</div>
                      <div className="text-red-600">${pricingLogLog.lower_bound_price?.toFixed(2)}</div>
                      <div className="text-xs text-red-500">Minimum profitable price</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-8">
                  <h5 className="text-md font-semibold text-gray-900 mb-4">Price Bounds Analysis (Log-Log Model)</h5>
                  <div className="p-4 border rounded-lg bg-[#F3E9DC]/30 text-gray-800">
                    <p className="text-sm">
                      Complete the Future Demand Prediction above to see price bounds analysis over time for the log-log model.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
      </>
      )}
        </div>
      </div>
    </div>
  )
}
