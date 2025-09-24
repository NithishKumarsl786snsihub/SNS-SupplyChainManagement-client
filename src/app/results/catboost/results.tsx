"use client"

import { motion } from "framer-motion"
import { Download, TrendingUp, BarChart3, Shield, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/metric-card"
import { ForecastChart } from "@/components/charts/forecast-chart"
import { FeatureImportanceChart } from "@/components/charts/feature-importance-chart"
import { ModelParameters } from "@/components/model-parameters"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const forecastData = Array.from({ length: 30 }).map((_, i) => {
  const base = 1000 + i * 8
  return {
    date: new Date(2024, 0, i + 1).toISOString().slice(0, 10),
    actual: i < 20 ? base + (i % 3 === 0 ? 40 : -20) : undefined,
    predicted: base + 10,
    confidence_upper: base + 80,
    confidence_lower: base - 80,
  }
})

const importanceData = [
  { feature: "price", importance: 0.32 },
  { feature: "inventory_level", importance: 0.24 },
  { feature: "seasonal_factor", importance: 0.21 },
  { feature: "promotional", importance: 0.14 },
  { feature: "date", importance: 0.09 },
]

const parameters = [
  { name: "Iterations", value: "1000" },
  { name: "Learning Rate", value: "0.08" },
  { name: "Depth", value: "6" },
  { name: "L2 Regularization", value: "3.0" },
  { name: "Border Count", value: "128" },
  { name: "Cat Features", value: "Auto-detected" },
]

const categoricalFeatures = [
  { feature: "Product Category", handling: "Target Encoding", impact: "High" },
  { feature: "Supplier Region", handling: "Frequency Encoding", impact: "Medium" },
  { feature: "Season", handling: "One-Hot Encoding", impact: "High" },
  { feature: "Promotion Type", handling: "Target Encoding", impact: "Medium" },
]

const metrics = [
  { title: "Accuracy Score", value: "95.1%", change: 2.8, changeType: "increase" as const, icon: <TrendingUp className="h-4 w-4" /> },
  { title: "MAPE", value: "4.9%", change: 0.6, changeType: "decrease" as const, icon: <BarChart3 className="h-4 w-4" /> },
  { title: "RMSE", value: 11.2, change: 1.8, changeType: "decrease" as const, icon: <BarChart3 className="h-4 w-4" /> },
  { title: "Overfitting Score", value: "Low", icon: <Shield className="h-4 w-4" /> },
]

interface ResultsProps {
  onRunAnotherModel: () => void
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "CatBoost", current: true },
  ]

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
            <FeatureImportanceChart data={importanceData} title="Feature Importance Analysis" />
          </div>
        </div>

        {/* Categorical Features & Overfitting Detection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-sns-orange" />
                Categorical Feature Handling
              </CardTitle>
              <CardDescription>Automatic encoding and processing summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoricalFeatures.map((item, index) => (
                  <motion.div key={item.feature} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="flex justify-between items-center p-3 bg-sns-cream/30 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.feature}</p>
                      <p className="text-sm text-gray-600">{item.handling}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${item.impact === "High" ? "bg-sns-orange text-white" : item.impact === "Medium" ? "bg-sns-yellow text-gray-900" : "bg-gray-200 text-gray-700"}`}>
                      {item.impact}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-sns-orange" />
                Overfitting Detection
              </CardTitle>
              <CardDescription>Model complexity and generalization analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Overfitting Risk</span>
                  <span className="font-bold text-green-600">Low</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "25%" }}></div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Train Score</p>
                    <p className="font-medium">95.1%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Validation Score</p>
                    <p className="font-medium">94.3%</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Model shows excellent generalization with minimal overfitting detected.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model Parameters */}
        <ModelParameters modelName="CatBoost" parameters={parameters} />
      </div>
    </div>
  )
}
