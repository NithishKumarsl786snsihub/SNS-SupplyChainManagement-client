"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/metric-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ReferenceLine,
} from "recharts"

interface ResultsProps {
  data: any
  onRunAnotherModel: () => void
}

export default function VarimaResults({ data, onRunAnotherModel }: ResultsProps) {
  const forecastData = data.forecast || []
  const elasticityData = data.price_elasticity || []

  // --- Forecast chart data ---
  const forecastChartData = forecastData.map((f: any) => ({
    ds: new Date(f.ds).toLocaleDateString("en-GB"),
    demand: parseFloat(f.yhat || 0),
    lower: parseFloat(f.yhat_lower || 0),
    upper: parseFloat(f.yhat_upper || 0),
  }))

  // --- Elasticity chart data ---
  const elasticityChartData = elasticityData.map((e: any) => ({
    ds: new Date(e.ds).toLocaleDateString("en-GB"),
    elasticity: parseFloat(e.elasticity || 0),
    price: parseFloat(e.Price || 0),
    demand: parseFloat(e.y || 0),
  }))

  // --- Key price metrics ---
  const maxPrice = Math.max(...elasticityData.map((e: any) => e.Price))
  const minPrice = Math.min(...elasticityData.map((e: any) => e.Price))

  // Best Price Range (max demand)
  const maxDemandObj = elasticityData.reduce((prev: any, curr: any) => (curr.y > prev.y ? curr : prev), { y: 0 })
  const bestPrice = maxDemandObj.Price
  const bestDemand = maxDemandObj.y

  // --- Metrics for dashboard ---
  const forecastMetrics = [
    { title: "MAPE", value: forecastData.length ? "6.2%" : "-", change: 0.4, changeType: "decrease" as const },
    { title: "RMSE", value: forecastData.length ? "14.1" : "-", change: 1.5, changeType: "decrease" as const },
    { title: "Training Time", value: "2.8s" },
    { title: "Accuracy", value: "92%", change: 1.7, changeType: "increase" as const },
  ]

  const priceMetrics = [
    { title: "Maximum Price", value: `$${maxPrice.toFixed(2)}` },
    { title: "Minimum Price", value: `$${minPrice.toFixed(2)}` },
    { title: "Best Price (Max Demand)", value: `$${bestPrice.toFixed(2)} (Demand: ${bestDemand})` },
  ]

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "VARIMA", current: true },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <BreadcrumbNav items={breadcrumbItems} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <h1 className="text-3xl font-bold">VARIMA Forecast & Price Optimization Results</h1>
        <Button onClick={onRunAnotherModel} className="bg-blue-600 hover:bg-blue-700 text-white">
          Run Another Model
        </Button>
      </motion.div>

      {/* Forecast Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {forecastMetrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Price Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {priceMetrics.map((metric) => (
          <Card key={metric.title} className="shadow-md hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>{metric.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Demand Forecast Chart */}
      {forecastChartData.length > 0 && (
        <Card className="mb-6 shadow-md hover:shadow-lg transition">
          <CardHeader>
            <CardTitle>📈 Demand Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ds" angle={-45} textAnchor="end" height={60} />
                <YAxis label={{ value: "Demand", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="demand" stroke="#3B82F6" name="Forecasted Demand" strokeWidth={2} />
                <Line type="monotone" dataKey="upper" stroke="#EF4444" strokeDasharray="5 5" name="Upper Confidence" />
                <Line type="monotone" dataKey="lower" stroke="#10B981" strokeDasharray="5 5" name="Lower Confidence" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Price Elasticity Chart */}
      {elasticityChartData.length > 0 && (
        <Card className="shadow-md hover:shadow-lg transition">
          <CardHeader>
            <CardTitle>💰 Price Elasticity & Price Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={elasticityChartData}
                margin={{ top: 20, right: 40, left: 0, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ds" angle={-45} textAnchor="end" height={60} />
                <YAxis yAxisId="left" label={{ value: "Elasticity", angle: -90, position: "insideLeft" }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: "Price", angle: 90, position: "insideRight" }} />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="elasticity"
                  stroke="#8884d8"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                  name="Elasticity"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="price"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Price"
                />
                {/* Highlight best price */}
                <ReferenceLine x={elasticityChartData.findIndex((e) => e.price === bestPrice)} stroke="gold" label={`Best Price`} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
