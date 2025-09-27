"use client"

import { ModelCard } from "@/components/model-card"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function ModelCardsSection() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const router = useRouter()

  const models = [
    {
      name: "XGBoost",
      description: "Gradient boosting for high accuracy predictions with excellent performance on structured data",
      category: "ml" as const,
    },
    {
      name: "LightGBM",
      description: "Fast gradient boosting with low memory usage, optimized for large datasets",
      category: "ml" as const,
    },
    {
      name: "CatBoost",
      description: "Handles categorical features automatically without preprocessing requirements",
      category: "ml" as const,
    },
    {
      name: "Random Forest",
      description: "Ensemble method for robust predictions with built-in feature importance",
      category: "ml" as const,
    },
    {
      name: "Linear Regression",
      description: "Simple, interpretable baseline model for understanding linear relationships",
      category: "ml" as const,
    },
    {
      name: "LSTM",
      description: "Recurrent neural network for time series with long-term memory capabilities",
      category: "deep-learning" as const,
    },
    {
      name: "TFT (Temporal Fusion Transformer)",
      description: "Temporal Fusion Transformer for complex patterns and multi-horizon forecasting",
      category: "deep-learning" as const,
    },
    {
      name: "ARIMA",
      description: "Classical time series forecasting for stationary data with trend analysis",
      category: "time-series" as const,
    },
    {
      name: "SARIMA",
      description: "Seasonal ARIMA for cyclical data with seasonal pattern recognition",
      category: "time-series" as const,
    },
   {
      name: "SARIMAX",
      description: "Seasonal ARIMA with eXogenous variables for time series forecasting with external factors and seasonal patterns",
      category: "time-series" as const,
    },
    {
      name: "ARIMAX",
      description: "ARIMA with external variables for incorporating additional predictors",
      category: "time-series" as const,
    },
    {
      name: "Prophet",
      description: "Facebook's robust forecasting tool with automatic seasonality detection",
      category: "time-series" as const,
    },
    {
      name: "VARIMA",
      description: "Vector ARIMA for multivariate time series with cross-variable dependencies",
      category: "time-series" as const,
    },
  ]

  return (
    <section id="models" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Forecasting Model</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Select the most suitable forecasting algorithm for your supply chain data. Each model has unique strengths for different types of patterns and data characteristics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                   model.name === "SARIMAX" ? "sarimax" :
                  model.name === "ARIMAX" ? "arimax" :
                  model.name === "Prophet" ? "prophet" :
                  model.name === "VARIMA" ? "varima" : "xgboost"
                router.push(`/results/${slug}`)
              }}
            />
          ))}
        </div>

      </div>
    </section>
  )
}
