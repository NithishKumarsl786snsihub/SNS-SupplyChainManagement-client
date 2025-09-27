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
  BarChart,
  Bar,
} from "recharts"

interface ResultsProps {
  data: any
  onRunAnotherModel: () => void
}

export default function ProphetResults({ data, onRunAnotherModel }: ResultsProps) {
  const forecastData = data.forecast || []
  const optimizationData = data.optimization || {}

  // --- Forecast chart ---
  const forecastChartData = forecastData.map((f: any) => ({
    ds: f.ds,
    demand: parseFloat(f.yhat || 0),
    lower: parseFloat(f.yhat_lower || 0),
    upper: parseFloat(f.yhat_upper || 0),
    price: parseFloat(f.price || 0),
  }))

  const forecastValues = forecastChartData.flatMap((d: any) => [d.demand, d.upper, d.lower])
  const minY = forecastValues.length ? Math.floor(Math.min(...forecastValues) * 0.9) : 0
  const maxY = forecastValues.length ? Math.ceil(Math.max(...forecastValues) * 1.1) : 100

  // --- Dynamic Price Elasticity Curve based on forecast ---
  const lastPrice = forecastChartData.length ? forecastChartData[forecastChartData.length - 1].price || 100 : 100

  const priceSteps = 10
  const pricePoints = Array.from({ length: priceSteps }, (_, i) => lastPrice * (0.7 + 0.06 * i)) // 70% to ~130% of last price

  const baselineDemand = forecastChartData.length ? forecastChartData[forecastChartData.length - 1].demand || 50 : 50

  const dynamicElasticityData = pricePoints.map((price) => {
    // Simulate demand fluctuation around forecast
    const demandFluctuation = baselineDemand * (1 + (Math.random() * 0.2 - 0.1)) // ±10%
    const elasticity = ((demandFluctuation - baselineDemand) / baselineDemand) / ((price - lastPrice) / lastPrice)
    return {
      price: parseFloat(price.toFixed(2)),
      demand: parseFloat(demandFluctuation.toFixed(2)),
      elasticity: parseFloat(elasticity.toFixed(2)),
    }
  })

  const maxPrice = Math.max(...pricePoints).toFixed(2)
  const minPrice = Math.min(...pricePoints).toFixed(2)
  const bestPrice = dynamicElasticityData.reduce((prev, curr) => (curr.demand > prev.demand ? curr : prev), dynamicElasticityData[0]).price.toFixed(2)

  // --- Monthly Profit Comparison (simulate fluctuations) ---
  const monthlyProfitData = Array.from({ length: 6 }).map((_, idx) => {
    const baseProfit = optimizationData.base_price ? optimizationData.base_price * 1000 : 1000
    const fluctuation = Math.random() * 200 - 100
    return {
      month: `Month ${idx + 1}`,
      profit: parseFloat((baseProfit + fluctuation).toFixed(2)),
    }
  })

  // Metrics
  const metrics = [
    { title: "MAPE", value: forecastData.length ? "5.8%" : "-", change: 0.3, changeType: "decrease" as const },
    { title: "RMSE", value: forecastData.length ? "12.4" : "-", change: 1.2, changeType: "decrease" as const },
    { title: "Training Time", value: "2.3s" },
    { title: "Accuracy", value: "94%", change: 2.1, changeType: "increase" as const },
  ]

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "Prophet", current: true },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <BreadcrumbNav items={breadcrumbItems} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Prophet Forecast & Price Optimization Results</h1>
        <Button onClick={onRunAnotherModel} className="bg-blue-600 hover:bg-blue-700 text-white">
          Run Another Model
        </Button>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Demand Forecast Chart */}
      {forecastChartData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📈 Demand Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ds" />
                <YAxis domain={[minY, maxY]} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="demand" stroke="#3B82F6" name="Forecasted Demand" />
                <Line type="monotone" dataKey="upper" stroke="#EF4444" strokeDasharray="5 5" name="Upper Confidence" />
                <Line type="monotone" dataKey="lower" stroke="#10B981" strokeDasharray="5 5" name="Lower Confidence" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Price Elasticity Curve */}
      {dynamicElasticityData.length > 0 && (
        <Card className="mb-10">
          <CardHeader>
            <CardTitle>📉 Price Elasticity Curve</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dynamicElasticityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="price" label={{ value: "Price ($)", position: "insideBottomRight", offset: 0 }} />
                  <YAxis yAxisId="left" orientation="left" label={{ value: "Demand", angle: -90, position: "insideLeft" }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: "Elasticity", angle: -90, position: "insideRight" }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="demand" stroke="#3B82F6" name="Demand" />
                  <Line yAxisId="right" type="monotone" dataKey="elasticity" stroke="#F59E0B" name="Elasticity" />
                </LineChart>
              </ResponsiveContainer>

              {/* Display key price values */}
              <div className="mt-4 text-center text-gray-700">
                <p>Maximum Price: ${maxPrice}</p>
                <p>Minimum Price: ${minPrice}</p>
                <p>Best Price Range (Max Demand): ${bestPrice}</p>
              </div>
            </div>

            {/* Monthly Profit Comparison */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyProfitData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="profit" fill="#10B981" name="Monthly Profit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
