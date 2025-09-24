"use client"

import { motion } from "framer-motion"
import { Download, TrendingUp, AlertCircle, BarChart3 } from "lucide-react"
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
  { feature: "Demand Lag 1", importance: 0.28 },
  { feature: "Price Lag 1", importance: 0.24 },
  { feature: "Cross-correlation", importance: 0.22 },
  { feature: "Seasonal Pattern", importance: 0.18 },
  { feature: "Economic Index", importance: 0.08 },
]

const mockParameters = [
  { name: "p", value: 2, description: "Autoregressive order" },
  { name: "d", value: 1, description: "Differencing order" },
  { name: "q", value: 1, description: "Moving average order" },
  { name: "variables", value: 3, description: "Number of time series" },
  { name: "lag_order", value: 2, description: "Maximum lag order" },
]

interface ResultsProps {
  onRunAnotherModel: () => void
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "VARIMA", current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">VARIMA Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Vector Autoregressive Integrated Moving Average for multivariate time series forecasting with cross-variable dependencies.</p>
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
            value="6.2%" 
            change={1.1} 
            changeType="decrease" 
            icon={<TrendingUp className="h-4 w-4" />} 
            description="Mean Absolute Percentage Error" 
          />
          <MetricCard 
            title="RMSE" 
            value="58.4" 
            change={3.2} 
            changeType="decrease" 
            icon={<AlertCircle className="h-4 w-4" />} 
            description="Root Mean Square Error" 
          />
          <MetricCard 
            title="Cross-Correlation" 
            value="0.87" 
            description="Variable dependency strength" 
          />
          <MetricCard 
            title="Variables" 
            value="3" 
            description="Time series analyzed" 
          />
        </div>

        {/* Full width forecast chart */}
        <div className="mb-8">
          <ForecastChart data={mockForecastData} title="Multivariate Forecast - Demand vs Price Interaction" />
        </div>

        {/* Full width charts grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <FeatureImportanceChart data={mockFeatureImportance} title="Cross-Variable Importance" />
          <ModelParameters 
            modelName="VARIMA" 
            parameters={mockParameters} 
            trainingTime="3.2 seconds" 
            accuracy={94.3} 
          />
        </div>

        {/* Additional VARIMA-specific insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-sns-orange" />
              Cross-Variable Analysis
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Demand → Price</span>
                <span className="text-sm font-medium text-gray-900">0.73</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Price → Inventory</span>
                <span className="text-sm font-medium text-gray-900">0.68</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Economic Index → Demand</span>
                <span className="text-sm font-medium text-gray-900">0.45</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-sns-orange" />
              Model Diagnostics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Stationarity Test</span>
                <span className="text-sm font-medium text-green-600">Passed</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Cointegration</span>
                <span className="text-sm font-medium text-green-600">Detected</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Residual Normality</span>
                <span className="text-sm font-medium text-green-600">Normal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
