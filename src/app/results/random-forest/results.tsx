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
  { date: "2024-01-01", actual: 1250, predicted: 1240, confidence_upper: 1300, confidence_lower: 1180 },
  { date: "2024-01-02", actual: 1180, predicted: 1175, confidence_upper: 1235, confidence_lower: 1115 },
  { date: "2024-01-03", actual: 1320, predicted: 1310, confidence_upper: 1370, confidence_lower: 1250 },
  { date: "2024-01-04", actual: 1450, predicted: 1435, confidence_upper: 1495, confidence_lower: 1375 },
  { date: "2024-01-05", actual: 1380, predicted: 1370, confidence_upper: 1430, confidence_lower: 1310 },
  { date: "2024-01-06", predicted: 1285, confidence_upper: 1345, confidence_lower: 1225 },
  { date: "2024-01-07", predicted: 1145, confidence_upper: 1205, confidence_lower: 1085 },
  { date: "2024-01-08", predicted: 1215, confidence_upper: 1275, confidence_lower: 1155 },
  { date: "2024-01-09", predicted: 1335, confidence_upper: 1395, confidence_lower: 1275 },
  { date: "2024-01-10", predicted: 1475, confidence_upper: 1535, confidence_lower: 1415 },
]

const mockFeatureImportance = [
  { feature: "Price", importance: 0.32 },
  { feature: "Seasonal Factor", importance: 0.25 },
  { feature: "Inventory Level", importance: 0.20 },
  { feature: "Promotional", importance: 0.13 },
  { feature: "Historical Average", importance: 0.10 },
]

const mockParameters = [
  { name: "n_estimators", value: 200, description: "Number of trees in the forest" },
  { name: "max_depth", value: 10, description: "Maximum depth of trees" },
  { name: "min_samples_split", value: 5, description: "Minimum samples to split a node" },
  { name: "min_samples_leaf", value: 2, description: "Minimum samples in a leaf" },
  { name: "max_features", value: "sqrt", description: "Number of features to consider for splits" },
]

interface ResultsProps {
  onRunAnotherModel: () => void
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Random Forest", current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Random Forest Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Ensemble learning with multiple decision trees for robust forecasting.</p>
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
            value="0.891" 
            change={0.03} 
            changeType="increase" 
            icon={<Target className="h-4 w-4" />} 
            description="Coefficient of determination" 
          />
          <MetricCard 
            title="MAPE" 
            value="7.2%" 
            change={0.8} 
            changeType="decrease" 
            icon={<TrendingUp className="h-4 w-4" />} 
            description="Mean Absolute Percentage Error" 
          />
          <MetricCard 
            title="RMSE" 
            value="67.8" 
            change={4.1} 
            changeType="decrease" 
            icon={<AlertCircle className="h-4 w-4" />} 
            description="Root Mean Square Error" 
          />
          <MetricCard 
            title="Trees" 
            value="200" 
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
            modelName="Random Forest" 
            parameters={mockParameters} 
            trainingTime="3.2 seconds" 
            accuracy={89.1} 
          />
        </div>

        {/* Additional metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="OOB Score" value="0.876" description="Out-of-bag accuracy" />
          <MetricCard title="Feature Count" value="5" description="Input features used" />
          <MetricCard title="Tree Depth" value="10" description="Maximum tree depth" />
        </div>
      </div>
    </div>
  )
}
