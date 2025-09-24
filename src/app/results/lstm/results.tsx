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
  const base = 1000 + Math.sin(i / 3) * 60 + i * 5
  return {
    date: new Date(2024, 0, i + 1).toISOString().slice(0, 10),
    actual: i < 22 ? base + (i % 4 === 0 ? 30 : -20) : undefined,
    predicted: base + 10,
    confidence_upper: base + 80,
    confidence_lower: base - 80,
  }
})

const mockFeatureImportance = [
  { feature: "lag_7", importance: 0.28 },
  { feature: "lag_14", importance: 0.22 },
  { feature: "moving_avg", importance: 0.20 },
  { feature: "promo", importance: 0.18 },
  { feature: "price", importance: 0.12 },
]

const mockParameters = [
  { name: "hidden_units", value: 128, description: "Size of hidden state" },
  { name: "num_layers", value: 2, description: "Number of LSTM layers" },
  { name: "dropout", value: 0.2, description: "Dropout regularization" },
  { name: "sequence_length", value: 30, description: "Input sequence length" },
  { name: "learning_rate", value: 0.001, description: "Optimizer learning rate" },
]

interface ResultsProps {
  onRunAnotherModel: () => void
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "LSTM", current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">LSTM Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Sequence modeling results leveraging long short-term memory for temporal dependencies.</p>
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
            value="6.9%" 
            change={1.0} 
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
            title="Trend Capture" 
            value="High" 
            icon={<TrendingUp className="h-4 w-4" />} 
            description="Temporal pattern learning" 
          />
          <MetricCard 
            title="Lookback Window" 
            value="30 steps" 
            description="Sequence length" 
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
            modelName="LSTM" 
            parameters={mockParameters} 
            trainingTime="12.4 seconds" 
            accuracy={93.1} 
          />
        </div>
      </div>
    </div>
  )
}
