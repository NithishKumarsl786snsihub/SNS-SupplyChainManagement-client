"use client"

import { motion } from "framer-motion"
import { Download, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/metric-card"
import { ForecastChart } from "@/components/charts/forecast-chart"
import { FeatureImportanceChart } from "@/components/charts/feature-importance-chart"
import { ModelParameters } from "@/components/model-parameters"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"

const mockForecastData = Array.from({ length: 30 }).map((_, i) => {
  const base = 1000 + i * 7
  return {
    date: new Date(2024, 0, i + 1).toISOString().slice(0, 10),
    actual: i < 18 ? base + (i % 5 === 0 ? 35 : -25) : undefined,
    predicted: base + 9,
    confidence_upper: base + 65,
    confidence_lower: base - 65,
  }
})

const mockFeatureImportance = [
  { feature: "AR terms", importance: 0.34 },
  { feature: "MA terms", importance: 0.29 },
  { feature: "Seasonality", importance: 0.21 },
  { feature: "Trend", importance: 0.16 },
]

const mockParameters = [
  { name: "p", value: 2, description: "Autoregressive order" },
  { name: "d", value: 1, description: "Differencing order" },
  { name: "q", value: 2, description: "Moving average order" },
  { name: "seasonal", value: "(1,1,1)12", description: "Seasonal ARIMA" },
]

interface ResultsProps {
  onRunAnotherModel: () => void
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "ARIMA", current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">ARIMA Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Classical time series modeling with autoregressive and moving average components.</p>
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
            value="7.4%" 
            change={0.9} 
            changeType="decrease" 
            icon={<TrendingUp className="h-4 w-4" />} 
            description="Mean Absolute Percentage Error" 
          />
          <MetricCard 
            title="RMSE" 
            value="63.8" 
            change={2.4} 
            changeType="decrease" 
            icon={<AlertCircle className="h-4 w-4" />} 
            description="Root Mean Square Error" 
          />
          <MetricCard 
            title="Seasonality" 
            value="12" 
            description="Detected period" 
          />
          <MetricCard 
            title="Stationarity" 
            value="Differenced" 
            description="d=1" 
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
            modelName="ARIMA" 
            parameters={mockParameters} 
            trainingTime="1.9 seconds" 
            accuracy={92.1} 
          />
        </div>
      </div>
    </div>
  )
}
