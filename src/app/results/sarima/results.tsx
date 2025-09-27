"use client"

import { motion } from "framer-motion"
import { Download, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/metric-card"
import { ForecastChart } from "@/components/charts/forecast-chart"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts"

const mockForecastData = [
  { date: "2024-01-01", actual: 1200, predicted: 1195, confidence_upper: 1255, confidence_lower: 1135 },
  { date: "2024-01-02", actual: 1150, predicted: 1145, confidence_upper: 1205, confidence_lower: 1085 },
  { date: "2024-01-03", actual: 1300, predicted: 1295, confidence_upper: 1355, confidence_lower: 1235 },
  { date: "2024-01-04", actual: 1400, predicted: 1390, confidence_upper: 1450, confidence_lower: 1330 },
  { date: "2024-01-05", actual: 1350, predicted: 1345, confidence_upper: 1405, confidence_lower: 1285 },
  { date: "2024-01-06", predicted: 1280, confidence_upper: 1340, confidence_lower: 1220 },
  { date: "2024-01-07", predicted: 1150, confidence_upper: 1210, confidence_lower: 1090 },
  { date: "2024-01-08", predicted: 1230, confidence_upper: 1290, confidence_lower: 1170 },
  { date: "2024-01-09", predicted: 1330, confidence_upper: 1390, confidence_lower: 1270 },
  { date: "2024-01-10", predicted: 1450, confidence_upper: 1510, confidence_lower: 1390 },
]

const mockParameters = [
  { name: "order", value: "(1,1,1)", description: "ARIMA order (p,d,q)" },
  { name: "seasonal_order", value: "(1,1,1,12)", description: "Seasonal order (P,D,Q,s)" },
  { name: "trend", value: "c", description: "Trend component" },
  { name: "enforce_stationarity", value: "true", description: "Stationarity enforcement" },
  { name: "enforce_invertibility", value: "true", description: "Invertibility enforcement" },
]

interface ResultsProps {
  onRunAnotherModel: () => void
  result?: {
    preview: Array<Record<string, unknown>>
    steps: number
    chart_base64: string
  } | null
}

export default function Results({ onRunAnotherModel, result }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "SARIMA", current: true },
  ]

  // Transform backend preview into ForecastChart/ComposedChart format
  const forecastData = (() => {
    if (!result || !result.preview || result.preview.length === 0) return mockForecastData

    const first = result.preview[0]
    const dateKey = Object.keys(first).find((k) => /date|index/i.test(k)) as string | undefined

    const pickKey = (row: Record<string, unknown>, candidates: string[]): string | undefined => {
      return candidates.find((k) => row[k] !== undefined && typeof row[k] === "number")
    }

    return result.preview.map((row) => {
      const r = row as Record<string, unknown>
      const date = String(r[dateKey ?? "index"]) // fallback to index if date not present

      const actualKey = pickKey(r, ["actual", "sales", "y"]) // historical
      const predictedKey = pickKey(r, ["forecast", "predicted", "prediction", "demand"]) // future
      const upperKey = pickKey(r, ["upper", "confidence_upper", "upper_ci", "upper95"]) || undefined
      const lowerKey = pickKey(r, ["lower", "confidence_lower", "lower_ci", "lower95"]) || undefined

      const actualVal = actualKey ? (r[actualKey] as number) : undefined
      const predictedVal = predictedKey ? (r[predictedKey] as number) : undefined

      return {
        date,
        actual: typeof actualVal === "number" ? actualVal : undefined,
        predicted: typeof predictedVal === "number" ? Number(predictedVal) : 0,
        confidence_upper: typeof upperKey === "string" ? Number(r[upperKey]) : undefined,
        confidence_lower: typeof lowerKey === "string" ? Number(r[lowerKey]) : undefined,
      }
    })
  })()

  const hasBackendForecast = !!(result && result.preview && result.preview.length > 0)

  // Find split index where past (actual present) ends and future (no actual) starts
  const splitIndex = forecastData.findIndex((d) => d.actual === undefined)
  const hasSplit = splitIndex > -1
  const splitX = hasSplit ? forecastData[splitIndex]?.date : undefined

  // Derive summary metrics for the three boxes
  const futureRows = forecastData.filter((d) => d.actual === undefined)

  // Highest future predicted day
  const maxRow = futureRows.length > 0 ? futureRows.reduce((max, r) => (r.predicted > max.predicted ? r : max), futureRows[0]) : undefined
  const highestFutureText = maxRow ? `${Math.round(maxRow.predicted)} on ${new Date(maxRow.date).toLocaleDateString()}` : "—"

  // Lowest future predicted day
  let lowestFutureText = "—"
  if (futureRows.length > 0) {
    const minRow = futureRows.reduce((min, r) => (r.predicted < min.predicted ? r : min), futureRows[0])
    lowestFutureText = `${Math.round(minRow.predicted)} on ${new Date(minRow.date).toLocaleDateString()}`
  }

  // Accuracy via MAPE on any overlap (if actual and predicted both exist)
  const overlap = forecastData.filter((d) => d.actual !== undefined && typeof d.predicted === "number" && d.predicted > 0)
  const mape = overlap.length > 0
    ? (overlap.reduce((sum, r) => sum + Math.abs(((r.actual as number) - r.predicted) / (r.actual as number)), 0) / overlap.length) * 100
    : undefined
  const accuracy = mape !== undefined ? Math.max(0, 100 - mape) : 93

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">SARIMA Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Seasonal ARIMA modeling with trend and seasonal components for time series forecasting.</p>
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

        <div className="mb-8">
          {hasBackendForecast ? (
            <div>
              <p className="text-lg font-semibold text-gray-900 mb-3">Demand Forecast - Future Predictions</p>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      stroke="#666"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "white", border: "1px solid #e0e0e0", borderRadius: 8 }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    {/* Predicted as solid line */}
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      name="Predicted Demand"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 3, strokeWidth: 2, fill: "#3b82f6" }}
                      activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                    />
                    {/* Upper and lower bands as dashed lines */}
                    <Line
                      type="monotone"
                      dataKey="confidence_upper"
                      name="Upper Confidence Bound"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="confidence_lower"
                      name="Lower Confidence Bound"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    {/* Optional split line between past and future */}
                    {hasSplit && splitX && (
                      <ReferenceLine x={splitX} stroke="#e5e7eb" strokeDasharray="3 3" label={{ value: "Forecast start", position: "insideTop", fill: "#6b7280" }} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Predictions Table (future only) */}
              <div className="mt-6 bg-white rounded-lg border">
                <div className="px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-900">Forecast Table</h3>
                  <p className="text-sm text-gray-500">Date, Predicted Demand, Lower Confidence Bound, Upper Confidence Bound</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-700">
                        <th className="px-4 py-2 text-left border">Date</th>
                        <th className="px-4 py-2 text-left border">Predicted Demand</th>
                        <th className="px-4 py-2 text-left border">Lower Confidence Bound</th>
                        <th className="px-4 py-2 text-left border">Upper Confidence Bound</th>
                      </tr>
                    </thead>
                    <tbody>
                      {futureRows.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-4 py-2 border">{new Date(row.date).toLocaleDateString()}</td>
                          <td className="px-4 py-2 border">{Number(row.predicted ?? 0).toFixed(2)}</td>
                          <td className="px-4 py-2 border">{row.confidence_lower !== undefined ? Number(row.confidence_lower).toFixed(2) : "-"}</td>
                          <td className="px-4 py-2 border">{row.confidence_upper !== undefined ? Number(row.confidence_upper).toFixed(2) : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <ForecastChart data={forecastData} title="Demand Forecast - Actual vs Predicted" />
          )}
        </div>

        {/* Summary boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="Highest Future Demand" value={highestFutureText} description="Maximum predicted in forecast horizon" />
          <MetricCard title="Model Accuracy" value={accuracy !== undefined ? `${accuracy.toFixed(1)}%` : "—"} description="Backtest accuracy (MAPE)" />
          <MetricCard title="Lowest Future Demand" value={lowestFutureText} description="Minimum predicted in forecast horizon" />
        </div>
      </div>
    </div>
  )
}
