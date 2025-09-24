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
  { date: "2024-01-01", actual: 1200, predicted: 1195, confidence_upper: 1255, confidence_lower: 1135 },
  { date: "2024-01-02", actual: 1150, predicted: 1145, confidence_upper: 1205, confidence_lower: 1085 },
  { date: "2024-01-03", actual: 1300, predicted: 1295, confidence_upper: 1355, confidence_lower: 1235 },
  { date: "2024-01-04", actual: 1400, predicted: 1390, confidence_upper: 1450, confidence_lower: 1330 },
  { date: "2024-01-05", actual: 1350, predicted: 1345, confidence_upper: 1405, confidence_lower: 1285 },
  { date: "2024-01-06", predicted: 1280, confidence_upper: 1340, confidence_lower: 1220 },
  { date: "2024-01-07", predicted: 1150, confidence_upper: 1210, confidence_lower: 1090 },
  { date: "2024-01-08", predicted: 1220, confidence_upper: 1280, confidence_lower: 1160 },
  { date: "2024-01-09", predicted: 1330, confidence_upper: 1390, confidence_lower: 1270 },
  { date: "2024-01-10", predicted: 1450, confidence_upper: 1510, confidence_lower: 1390 },
]

const mockFeatureImportance = [
  { feature: "Trend", importance: 0.35 },
  { feature: "Seasonality", importance: 0.30 },
  { feature: "Autoregressive", importance: 0.20 },
  { feature: "Moving Average", importance: 0.15 },
]

const mockParameters = [
  { name: "order", value: "(1,1,1)", description: "ARIMA order (p,d,q)" },
  { name: "seasonal_order", value: "(1,1,1,12)", description: "Seasonal order (P,D,Q,s)" },
  { name: "trend", value: "c", description: "Trend component" },
  { name: "enforce_stationarity", value: "true", description: "Stationarity enforcement" },
  { name: "enforce_invertibility", value: "true", description: "Invertibility enforcement" },
]

interface ResultsProps {
  onRunAnotherModel: () => void
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "SARIMA", current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">SARIMA Results</h1>
              <p className="text-lg text-gray-600 max-w-3xl">Seasonal ARIMA modeling with trend and seasonal components for time series forecasting.</p>
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
            value="5.8%" 
            change={0.9} 
            changeType="decrease" 
            icon={<TrendingUp className="h-4 w-4" />} 
            description="Mean Absolute Percentage Error" 
          />
          <MetricCard 
            title="RMSE" 
            value="52.3" 
            change={3.1} 
            changeType="decrease" 
            icon={<AlertCircle className="h-4 w-4" />} 
            description="Root Mean Square Error" 
          />
          <MetricCard 
            title="Seasonality" 
            value="Strong" 
            description="Detected seasonal patterns" 
          />
          <MetricCard 
            title="Stationarity" 
            value="Achieved" 
            description="Data stationarity" 
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
            modelName="SARIMA" 
            parameters={mockParameters} 
            trainingTime="2.3 seconds" 
            accuracy={94.2} 
          />
        </div>

        {/* Additional metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="AIC" value="1247.3" description="Akaike Information Criterion" />
          <MetricCard title="BIC" value="1278.9" description="Bayesian Information Criterion" />
          <MetricCard title="Ljung-Box" value="0.12" description="Residual autocorrelation test" />
        </div>
      </div>
    </div>
  )
}
