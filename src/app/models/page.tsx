"use client"

import { useState } from "react"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { ModelCard } from "@/components/model-card"
import { useRouter } from "next/navigation"

export default function ModelsPage() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [hoveredModel, setHoveredModel] = useState<string | null>(null)
  const router = useRouter()

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", current: true },
  ]

  const models = [
    {
      name: "XGBoost",
      description: "Gradient boosting for high accuracy predictions with excellent performance on structured data",
      category: "ml" as const,
    },
    {
      name: "CatBoost",
      description: "Handles categorical features automatically without preprocessing requirements",
      category: "ml" as const,
    },
    {
      name: "LightGBM",
      description: "Fast gradient boosting with low memory usage, optimized for large datasets",
      category: "ml" as const,
    },
    {
      name: "Linear Regression",
      description: "Simple, interpretable baseline model for understanding linear relationships",
      category: "ml" as const,
    },
    {
      name: "Prophet",
      description: "Facebook's robust forecasting tool with automatic seasonality detection",
      category: "time-series" as const,
    },
    {
      name: "ARIMA",
      description: "Classical time series forecasting for stationary data with trend analysis",
      category: "time-series" as const,
    },
    {
      name: "ARIMAX",
      description: "ARIMA with external variables for incorporating additional predictors",
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
      name: "VARIMA",
      description: "Vector ARIMA for multivariate time series with cross-variable dependencies",
      category: "time-series" as const,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-sns-cream/30 via-white to-orange-50/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-200/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
        <div className="mb-8 animate-fade-in">
          <BreadcrumbNav items={breadcrumbItems} />
        </div>

        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 bg-clip-text text-transparent bg-gray-900">
            Choose Your Forecasting Model
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Select the most suitable forecasting algorithm for your supply chain data. Each model has unique strengths for different types of patterns and data characteristics.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Left Decorative Panel */}
          <div className="hidden xl:block xl:col-span-2">
            <div className="sticky top-8 space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-orange-100 hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Machine Learning</h3>
                <p className="text-sm text-gray-600">Advanced algorithms for complex patterns</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-100 hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Time Series</h3>
                <p className="text-sm text-gray-600">Specialized for temporal data analysis</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-12 xl:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger-in">
              {models.map((model, idx) => (
                <div 
                  key={model.name}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                  onMouseEnter={() => setHoveredModel(model.name)}
                  onMouseLeave={() => setHoveredModel(null)}
                >
                  <ModelCard
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
                        model.name === "Linear Regression" ? "linear-regression" :
                        model.name === "ARIMA" ? "arima" :
                        model.name === "SARIMA" ? "sarima" :
                        model.name === "ARIMAX" ? "arimax" :
                        model.name === "SARIMAX" ? "sarimax" :
                        model.name === "Prophet" ? "prophet" :
                        model.name === "VARIMA" ? "varima" : "xgboost"
                      router.push(`/results/${slug}`)
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Decorative Panel */}
          <div className="hidden xl:block xl:col-span-2">
            <div className="sticky top-8 space-y-6">
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-6 shadow-xl text-white hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg mb-2">Quick Select</h3>
                <p className="text-sm text-white/90">Click any model to view detailed results and insights</p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700 font-medium">High Accuracy</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700 font-medium">Fast Training</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700 font-medium">Easy to Use</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-gray-100">
                <div className="text-center">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600 mb-1">
                    {hoveredModel ? "✓" : "10"}
                  </div>
                  <p className="text-xs text-gray-600 font-medium">
                    {hoveredModel ? "Ready" : "Models Available"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

     {/* CSS Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
          opacity: 0;
        }

        .delay-500 {
          animation-delay: 500ms;
        }

        .delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
    </div>
  )
}