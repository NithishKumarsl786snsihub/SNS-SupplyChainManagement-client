"use client"

import { motion } from "framer-motion"
import { Download, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/metric-card"
import { ForecastChart } from "@/components/forecast-chart"
import { FeatureImportanceChart } from "@/components/charts/feature-importance-chart"
import { ModelParameters } from "@/components/model-parameters"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"

const mockForecastData = Array.from({ length: 30 }).map((_, i) => {
  const base = 995 + Math.sin(i / 2) * 20 + i * 6
  return {
    date: new Date(2024, 0, i + 1).toISOString().slice(0, 10),
    actual: i < 20 ? base + (i % 6 === 0 ? 20 : -10) : undefined,
    predicted: base + 8,
    confidence_upper: base + 60,
    confidence_lower: base - 60,
  }
})

const mockFeatureImportance = [
  { feature: "Trend", importance: 0.40 },
  { feature: "Seasonality", importance: 0.38 },
  { feature: "Holidays", importance: 0.12 },
  { feature: "Regressors", importance: 0.10 },
]

const mockParameters = [
  { name: "changepoint_prior_scale", value: 0.05, description: "Trend flexibility" },
  { name: "seasonality_mode", value: "additive", description: "Seasonality interaction" },
  { name: "seasonality_prior_scale", value: 10, description: "Seasonality flexibility" },
]

interface ResultsProps {
  onRunAnotherModel: () => void
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "Prophet", current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Prophet Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Forecasting with decomposed trend, seasonality, and holiday effects.</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard 
            title="MAPE" 
            value="6.7%" 
            change={1.1} 
            changeType="decrease" 
            icon={<TrendingUp className="h-4 w-4" />} 
            description="Mean Absolute Percentage Error" 
          />
          <MetricCard 
            title="RMSE" 
            value="59.3" 
            change={2.9} 
            changeType="decrease" 
            icon={<AlertCircle className="h-4 w-4" />} 
            description="Root Mean Square Error" 
          />
          <MetricCard 
            title="Seasonality Strength" 
            value="High" 
            description="Detected cycles" 
          />
          <MetricCard 
            title="Holiday Impact" 
            value="Low" 
            description="From regressors" 
          />
        </div>

        {/* Full width forecast chart */}
        <div className="mb-8">
          <ForecastChart data={mockForecastData} title="Demand Forecast - Actual vs Predicted" />
        </div>

        {/* Full width charts grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <FeatureImportanceChart data={mockFeatureImportance} />
          <ModelParameters 
            modelName="Prophet" 
            parameters={mockParameters} 
            trainingTime="2.0 seconds" 
            accuracy={93.4} 
          />
        </div>
      </div>
    </div>
  )
}
