"use client"

import { motion } from "framer-motion"
import { Download, Target, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/metric-card"
import { ForecastChart } from "@/components/charts/forecast-chart"
import { FeatureImportanceChart } from "@/components/charts/feature-importance-chart"
import { ModelParameters } from "@/components/model-parameters"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"

const mockForecastData = [
  { date: "2024-01-01", actual: 1250, predicted: 1235, confidence_upper: 1285, confidence_lower: 1185 },
  { date: "2024-01-02", actual: 1180, predicted: 1170, confidence_upper: 1220, confidence_lower: 1120 },
  { date: "2024-01-03", actual: 1320, predicted: 1305, confidence_upper: 1355, confidence_lower: 1255 },
  { date: "2024-01-04", actual: 1450, predicted: 1420, confidence_upper: 1470, confidence_lower: 1370 },
  { date: "2024-01-05", actual: 1380, predicted: 1355, confidence_upper: 1405, confidence_lower: 1305 },
  { date: "2024-01-06", predicted: 1280, confidence_upper: 1330, confidence_lower: 1230 },
  { date: "2024-01-07", predicted: 1150, confidence_upper: 1200, confidence_lower: 1100 },
  { date: "2024-01-08", predicted: 1210, confidence_upper: 1260, confidence_lower: 1160 },
  { date: "2024-01-09", predicted: 1320, confidence_upper: 1370, confidence_lower: 1270 },
  { date: "2024-01-10", predicted: 1450, confidence_upper: 1500, confidence_lower: 1400 },
]

const mockFeatureImportance = [
  { feature: "Price", importance: 0.45 },
  { feature: "Seasonal Factor", importance: 0.30 },
  { feature: "Inventory Level", importance: 0.15 },
  { feature: "Promotional", importance: 0.10 },
]

const mockParameters = [
  { name: "fit_intercept", value: "true", description: "Whether to calculate intercept" },
  { name: "normalize", value: "false", description: "Whether to normalize features" },
  { name: "copy_X", value: "true", description: "Whether to copy X" },
  { name: "n_jobs", value: -1, description: "Number of parallel jobs" },
  { name: "positive", value: "false", description: "Whether to force positive coefficients" },
]

interface ResultsProps {
  onRunAnotherModel: () => void
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "Linear Regression", current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Linear Regression Forecasting Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Simple, interpretable baseline model for understanding linear relationships in your supply chain data.</p>
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
            title="R² Score" 
            value="0.847" 
            change={0.05} 
            changeType="increase" 
            icon={<Target className="h-4 w-4" />} 
            description="Coefficient of determination" 
          />
          <MetricCard 
            title="MAPE" 
            value="8.3%" 
            change={1.2} 
            changeType="decrease" 
            icon={<TrendingUp className="h-4 w-4" />} 
            description="Mean Absolute Percentage Error" 
          />
          <MetricCard 
            title="RMSE" 
            value="89.5" 
            change={5.2} 
            changeType="decrease" 
            icon={<AlertCircle className="h-4 w-4" />} 
            description="Root Mean Square Error" 
          />
          <MetricCard 
            title="Interpretability" 
            value="High" 
            icon={<TrendingUp className="h-4 w-4" />} 
            description="Linear relationship clarity" 
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
            modelName="Linear Regression" 
            parameters={mockParameters} 
            trainingTime="0.8 seconds" 
            accuracy={84.7} 
          />
        </div>

        {/* Statistical metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="F-Statistic" value="156.7" description="Overall model significance" />
          <MetricCard title="P-Value" value="< 0.001" description="Statistical significance" />
          <MetricCard title="Durbin-Watson" value="1.95" description="Residual autocorrelation test" />
        </div>
      </div>
    </div>
  )
}
