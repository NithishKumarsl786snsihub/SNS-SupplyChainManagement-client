"use client"

import { motion } from "framer-motion"
import { Download, BarChart3, Clock, MemoryStick as Memory, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/metric-card"
import { ForecastChart } from "@/components/charts/forecast-chart"
import { FeatureImportanceChart } from "@/components/charts/feature-importance-chart"
import { ModelParameters } from "@/components/model-parameters"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const forecastData = Array.from({ length: 30 }).map((_, i) => {
  const base = 980 + i * 9
  return {
    date: new Date(2024, 0, i + 1).toISOString().slice(0, 10),
    actual: i < 20 ? base + (i % 2 === 0 ? 30 : -15) : undefined,
    predicted: base + 8,
    confidence_upper: base + 70,
    confidence_lower: base - 70,
  }
})

const importanceData = [
  { feature: "price", importance: 0.30 },
  { feature: "inventory_level", importance: 0.26 },
  { feature: "seasonal_factor", importance: 0.24 },
  { feature: "promotional", importance: 0.12 },
  { feature: "date", importance: 0.08 },
]

const parameters = [
  { name: "Number of Estimators", value: "500" },
  { name: "Learning Rate", value: "0.1" },
  { name: "Max Depth", value: "8" },
  { name: "Feature Fraction", value: "0.8" },
  { name: "Bagging Fraction", value: "0.9" },
  { name: "Memory Usage", value: "156 MB" },
]

const performanceMetrics = [
  { metric: "Training Time", value: "2.3 seconds", improvement: "45% faster than XGBoost" },
  { metric: "Memory Usage", value: "156 MB", improvement: "30% less than Random Forest" },
  { metric: "CPU Efficiency", value: "High", improvement: "Optimized for speed" },
]

const metrics = [
  { title: "Accuracy Score", value: "94.2%", change: 2.1, changeType: "increase" as const, icon: <TrendingUp className="h-4 w-4" /> },
  { title: "MAPE", value: "5.8%", change: 0.3, changeType: "decrease" as const, icon: <BarChart3 className="h-4 w-4" /> },
  { title: "RMSE", value: 12.4, change: 1.2, changeType: "decrease" as const, icon: <BarChart3 className="h-4 w-4" /> },
  { title: "Training Speed", value: "2.3s", icon: <Clock className="h-4 w-4" /> },
]

interface ResultsProps {
  onRunAnotherModel: () => void
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "LightGBM", current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">LightGBM Results</h1>
              <p className="text-gray-600">
                Fast gradient boosting framework optimized for speed and memory efficiency
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-sns-orange text-sns-orange hover:bg-sns-orange hover:text-white bg-transparent"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
              <Button className="bg-sns-orange hover:bg-sns-orange-dark text-white" onClick={onRunAnotherModel}>
                Run Another Model
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>

        {/* Main Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <ForecastChart data={forecastData} title="Demand Forecast vs Actual" />
          </div>
          <div>
            <FeatureImportanceChart data={importanceData} title="Feature Importance Ranking" />
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-sns-orange" />
                Training Speed Metrics
              </CardTitle>
              <CardDescription>Performance and efficiency analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceMetrics.map((item, index) => (
                  <motion.div
                    key={item.metric}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex justify-between items-center p-3 bg-sns-cream/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.metric}</p>
                      <p className="text-sm text-gray-600">{item.improvement}</p>
                    </div>
                    <span className="font-bold text-sns-orange">{item.value}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Memory className="w-5 h-5 text-sns-orange" />
                Memory Usage Statistics
              </CardTitle>
              <CardDescription>Resource utilization breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Peak Memory Usage</span>
                  <span className="font-bold">156 MB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-sns-orange h-2 rounded-full" style={{ width: "65%" }}></div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Model Size</p>
                    <p className="font-medium">45 MB</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Training Data</p>
                    <p className="font-medium">111 MB</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model Parameters */}
        <ModelParameters modelName="LightGBM" parameters={parameters} />
      </div>
    </div>
  )
}
