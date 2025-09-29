"use client"

import { motion } from "framer-motion"
import { Download, BarChart3, Shield, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import DemandForecastChart from "@/components/charts/demand-forecast-chart"
import ProductSelector from "@/components/product-selector"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"


interface ResultsProps {
  onRunAnotherModel: () => void
}

interface PredictionResult {
  StoreID: string
  ProductID: string
  Date: string
  PredictedDailySales: number
  Confidence: number
  Error?: string
}

interface CatBoostResults {
  count: number
  predictions: PredictionResult[]
  model: string
  status: string
  data_info?: {
    total_rows_processed: number
    predictions_generated: number
    processing_time_seconds: number
    target_variable_handled: boolean
  }
}

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const [results, setResults] = useState<CatBoostResults | null>(null)

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "CatBoost", current: true },
  ]

  useEffect(() => {
    // Load results from session storage
    const storedResults = sessionStorage.getItem('catboost_results')
    if (storedResults) {
      try {
        const parsedResults = JSON.parse(storedResults)
        setResults(parsedResults)
        
        // Results loaded successfully
        
      } catch (error) {
        console.error('Error parsing stored results:', error)
      }
    }
  }, [])

  const handleSelectionChange = (store: string, product: string, filteredData: PredictionResult[]) => {
    // Selection change is handled by the ProductSelector component
    console.log(`Selected: ${store} - ${product} (${filteredData.length} data points)`)
  }

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {/* Full page layout without sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">CatBoost Results</h1>
              <p className="text-gray-600">Advanced gradient boosting with automatic categorical feature handling</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-sns-orange text-sns-orange hover:bg-sns-orange hover:text-white bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
              <Button className="bg-sns-orange hover:bg-sns-orange-dark text-white" onClick={onRunAnotherModel}>
                Run Another Model
              </Button>
            </div>
          </div>
        </motion.div>


        {/* Interactive CatBoost Visualization */}
        {results && results.predictions && results.predictions.length > 0 ? (
          <>
            {/* Product Selection */}
            <div className="mb-8">
              <ProductSelector 
                data={results.predictions} 
                onSelectionChange={handleSelectionChange}
              />
            </div>

            {/* Main Interactive Chart - Full Width */}
            <div className="mb-8">
              <DemandForecastChart 
                data={results.predictions} 
                title="Interactive Demand Forecast Analysis"
              />
            </div>
          </>
        ) : (
          /* No Data State */
          <div className="mb-8">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
                  <p className="text-gray-600 mb-6">
                    Upload your data to see interactive demand forecasting and detailed analytics.
                  </p>
                  <Button 
                    onClick={onRunAnotherModel}
                    className="bg-sns-orange hover:bg-sns-orange-dark text-white"
                  >
                    Upload Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Real-time Data Summary - Only show when we have data */}
        {results && results.predictions && results.predictions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-sns-orange" />
                  Data Processing Summary
                </CardTitle>
                <CardDescription>Real-time processing information from your uploaded data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Data Points Processed</span>
                    <span className="font-bold text-blue-600">{results.count || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Unique Stores</span>
                    <span className="font-bold text-green-600">
                      {results.predictions ? [...new Set(results.predictions.map(p => p.StoreID))].length : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Unique Products</span>
                    <span className="font-bold text-purple-600">
                      {results.predictions ? [...new Set(results.predictions.map(p => p.ProductID))].length : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Processing Time</span>
                    <span className="font-bold text-orange-600">
                      {results.data_info?.processing_time_seconds 
                        ? `${results.data_info.processing_time_seconds.toFixed(1)}s`
                        : '< 1s'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-sns-orange" />
                  Model Performance
                </CardTitle>
                <CardDescription>CatBoost model performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Model Status</span>
                    <span className="font-bold text-green-600">Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Confidence</span>
                    <span className="font-bold text-blue-600">
                      {results.predictions && results.predictions.length > 0 
                        ? `${(results.predictions.reduce((sum, p) => sum + p.Confidence, 0) / results.predictions.length * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Target Variable</span>
                    <span className="font-bold text-purple-600">DailySalesQty</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>CatBoost model successfully processed your data with high confidence predictions.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}
