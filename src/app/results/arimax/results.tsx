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
  const base = 1010 + i * 7
  return {
    date: new Date(2024, 0, i + 1).toISOString().slice(0, 10),
    actual: i < 16 ? base + (i % 3 === 0 ? 32 : -18) : undefined,
    predicted: base + 11,
    confidence_upper: base + 72,
    confidence_lower: base - 72,
  }
})

const mockFeatureImportance = [
  { feature: "AR terms", importance: 0.28 },
  { feature: "MA terms", importance: 0.24 },
  { feature: "Exogenous", importance: 0.30 },
  { feature: "Trend", importance: 0.18 },
]

const mockParameters = [
  { name: "(p,d,q)", value: "(2,1,2)", description: "ARIMA orders" },
  { name: "Exogenous Vars", value: "price,promo", description: "External regressors" },
]

interface ResultsProps {
  onRunAnotherModel: () => void
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "ARIMAX", current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">ARIMAX Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">ARIMA with exogenous variables to capture external effects.</p>
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
            value="7.1%" 
            change={1.0} 
            changeType="decrease" 
            icon={<TrendingUp className="h-4 w-4" />} 
            description="Mean Absolute Percentage Error" 
          />
          <MetricCard 
            title="RMSE" 
            value="62.7" 
            change={2.5} 
            changeType="decrease" 
            icon={<AlertCircle className="h-4 w-4" />} 
            description="Root Mean Square Error" 
          />
          <MetricCard 
            title="Exogenous Impact" 
            value="Moderate" 
            description="External regressors effect" 
          />
          <MetricCard 
            title="Differencing" 
            value="1" 
            description="Order d" 
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
            modelName="ARIMAX" 
            parameters={mockParameters} 
            trainingTime="2.1 seconds" 
            accuracy={92.4} 
          />
        </div>
      </div>
    </div>
  )
}
