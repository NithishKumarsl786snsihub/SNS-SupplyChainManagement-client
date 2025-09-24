"use client"

import { motion } from "framer-motion"
import { Download, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/metric-card"
import { ForecastChart } from "@/components/charts/forecast-chart"
import { FeatureImportanceChart } from "@/components/charts/feature-importance-chart"
import { ModelParameters } from "@/components/model-parameters"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"

const mockForecastData = [
  { date: "2024-01-01", actual: 1350, predicted: 1345, confidence_upper: 1405, confidence_lower: 1285 },
  { date: "2024-01-02", actual: 1300, predicted: 1295, confidence_upper: 1355, confidence_lower: 1235 },
  { date: "2024-01-03", actual: 1450, predicted: 1445, confidence_upper: 1505, confidence_lower: 1385 },
  { date: "2024-01-04", actual: 1500, predicted: 1495, confidence_upper: 1555, confidence_lower: 1435 },
  { date: "2024-01-05", actual: 1420, predicted: 1415, confidence_upper: 1475, confidence_lower: 1355 },
  { date: "2024-01-06", predicted: 1380, confidence_upper: 1440, confidence_lower: 1320 },
  { date: "2024-01-07", predicted: 1250, confidence_upper: 1310, confidence_lower: 1190 },
  { date: "2024-01-08", predicted: 1320, confidence_upper: 1380, confidence_lower: 1260 },
  { date: "2024-01-09", predicted: 1440, confidence_upper: 1500, confidence_lower: 1380 },
  { date: "2024-01-10", predicted: 1560, confidence_upper: 1620, confidence_lower: 1500 },
]

const mockFeatureImportance = [
  { feature: "Static Features", importance: 0.25 },
  { feature: "Historical Values", importance: 0.30 },
  { feature: "Future Known", importance: 0.20 },
  { feature: "Attention Weights", importance: 0.25 },
]

const mockParameters = [
  { name: "hidden_size", value: 64, description: "Hidden state dimension" },
  { name: "lstm_layers", value: 2, description: "Number of LSTM layers" },
  { name: "attention_head_size", value: 4, description: "Multi-head attention heads" },
  { name: "dropout", value: 0.1, description: "Dropout rate" },
  { name: "context_length", value: 64, description: "Input sequence length" },
]

interface ResultsProps {
  onRunAnotherModel: () => void
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "TFT", current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">TFT Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Temporal Fusion Transformer with attention mechanisms for multivariate time series forecasting.</p>
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
            value="4.2%" 
            change={0.7} 
            changeType="decrease" 
            icon={<TrendingUp className="h-4 w-4" />} 
            description="Mean Absolute Percentage Error" 
          />
          <MetricCard 
            title="RMSE" 
            value="45.8" 
            change={2.3} 
            changeType="decrease" 
            icon={<AlertCircle className="h-4 w-4" />} 
            description="Root Mean Square Error" 
          />
          <MetricCard 
            title="Attention" 
            value="Multi-Head" 
            description="Attention mechanism" 
          />
          <MetricCard 
            title="Context Length" 
            value="64 steps" 
            description="Input sequence length" 
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
            modelName="TFT" 
            parameters={mockParameters} 
            trainingTime="18.7 seconds" 
            accuracy={95.8} 
          />
        </div>

        {/* Additional metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="Attention Heads" value="4" description="Multi-head attention" />
          <MetricCard title="LSTM Layers" value="2" description="Recurrent layers" />
          <MetricCard title="Hidden Size" value="64" description="Model capacity" />
        </div>
      </div>
    </div>
  )
}
