"use client"

import { useState } from "react"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { ModelCard } from "@/components/model-card"
import { useRouter } from "next/navigation"

export default function ModelsPage() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const router = useRouter()

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", current: true },
  ]

  const models = [
    { name: "XGBoost", description: "Gradient boosting for high accuracy predictions with excellent performance on structured data", category: "ml" as const },
    { name: "LightGBM", description: "Fast gradient boosting with low memory usage, optimized for large datasets", category: "ml" as const },
    { name: "CatBoost", description: "Handles categorical features automatically without preprocessing requirements", category: "ml" as const },
    { name: "Random Forest", description: "Ensemble method for robust predictions with built-in feature importance", category: "ml" as const },
    { name: "Linear Regression", description: "Simple, interpretable baseline model for understanding linear relationships", category: "ml" as const },
    { name: "LSTM", description: "Recurrent neural network for time series with long-term memory capabilities", category: "deep-learning" as const },
    { name: "TFT (Temporal Fusion Transformer)", description: "Temporal Fusion Transformer for complex patterns and multi-horizon forecasting", category: "deep-learning" as const },
    { name: "ARIMA", description: "Classical time series forecasting for stationary data with trend analysis", category: "time-series" as const },
    { name: "SARIMA", description: "Seasonal ARIMA for cyclical data with seasonal pattern recognition", category: "time-series" as const },
    { name: "ARIMAX", description: "ARIMA with external variables for incorporating additional predictors", category: "time-series" as const },
    { name: "Prophet", description: "Facebook's robust forecasting tool with automatic seasonality detection", category: "time-series" as const },
    { name: "VARIMA", description: "Vector ARIMA for multivariate time series with cross-variable dependencies", category: "time-series" as const },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Choose Your Forecasting Model</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Select the most suitable forecasting algorithm for your supply chain data. Each model has unique strengths for different types of patterns and data characteristics.
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {models.map((model) => (
              <ModelCard
                key={model.name}
                name={model.name}
                description={model.description}
                category={model.category}
                isSelected={selectedModel === model.name}
                onClick={() => {
                  setSelectedModel(model.name)
                  const slug =
                    model.name === "XGBoost" ? "xgboost" :
                    model.name === "LightGBM" ? "lightgbm" :
                    model.name === "CatBoost" ? "catboost" :
                    model.name === "Random Forest" ? "random-forest" :
                    model.name === "Linear Regression" ? "linear-regression" :
                    model.name.startsWith("LSTM") ? "lstm" :
                    model.name.startsWith("TFT") ? "tft" :
                    model.name === "ARIMA" ? "arima" :
                    model.name === "SARIMA" ? "sarima" :
                    model.name === "ARIMAX" ? "arimax" :
                    model.name === "Prophet" ? "prophet" :
                    model.name === "VARIMA" ? "varima" : "xgboost"
                  router.push(`/results/${slug}`)
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}