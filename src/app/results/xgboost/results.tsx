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
  { date: "2024-01-01", actual: 1100, predicted: 1095, confidence_upper: 1155, confidence_lower: 1035 },
  { date: "2024-01-02", actual: 1050, predicted: 1045, confidence_upper: 1105, confidence_lower: 985 },
  { date: "2024-01-03", actual: 1200, predicted: 1195, confidence_upper: 1255, confidence_lower: 1135 },
  { date: "2024-01-04", actual: 1300, predicted: 1290, confidence_upper: 1350, confidence_lower: 1230 },
  { date: "2024-01-05", actual: 1250, predicted: 1245, confidence_upper: 1305, confidence_lower: 1185 },
  { date: "2024-01-06", predicted: 1180, confidence_upper: 1240, confidence_lower: 1120 },
  { date: "2024-01-07", predicted: 1050, confidence_upper: 1110, confidence_lower: 990 },
  { date: "2024-01-08", predicted: 1120, confidence_upper: 1180, confidence_lower: 1060 },
  { date: "2024-01-09", predicted: 1240, confidence_upper: 1300, confidence_lower: 1180 },
  { date: "2024-01-10", predicted: 1360, confidence_upper: 1420, confidence_lower: 1300 },
]

const mockFeatureImportance = [
  { feature: "Price", importance: 0.38 },
  { feature: "Seasonal Factor", importance: 0.28 },
  { feature: "Inventory Level", importance: 0.18 },
  { feature: "Promotional", importance: 0.16 },
]

const mockParameters = [
  { name: "n_estimators", value: 300, description: "Number of boosting rounds" },
  { name: "max_depth", value: 6, description: "Maximum tree depth" },
  { name: "learning_rate", value: 0.1, description: "Boosting learning rate" },
  { name: "subsample", value: 0.8, description: "Subsample ratio" },
  { name: "colsample_bytree", value: 0.8, description: "Column sampling ratio" },
]

interface ResultsProps {
  onRunAnotherModel: () => void
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "XGBoost", current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">XGBoost Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Gradient boosting with advanced regularization for high-performance forecasting.</p>
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
            value="0.923" 
            change={0.04} 
            changeType="increase" 
            icon={<Target className="h-4 w-4" />} 
            description="Coefficient of determination" 
          />
          <MetricCard 
            title="MAPE" 
            value="5.1%" 
            change={0.6} 
            changeType="decrease" 
            icon={<TrendingUp className="h-4 w-4" />} 
            description="Mean Absolute Percentage Error" 
          />
          <MetricCard 
            title="RMSE" 
            value="48.7" 
            change={3.8} 
            changeType="decrease" 
            icon={<AlertCircle className="h-4 w-4" />} 
            description="Root Mean Square Error" 
          />
          <MetricCard 
            title="Boosting Rounds" 
            value="300" 
            description="Number of estimators" 
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
            modelName="XGBoost" 
            parameters={mockParameters} 
            trainingTime="4.1 seconds" 
            accuracy={92.3} 
          />
        </div>

        {/* Additional metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="Early Stopping" value="Round 287" description="Best iteration" />
          <MetricCard title="Feature Count" value="4" description="Input features used" />
          <MetricCard title="Tree Depth" value="6" description="Maximum tree depth" />
        </div>
      </div>
    </div>
  )
}
