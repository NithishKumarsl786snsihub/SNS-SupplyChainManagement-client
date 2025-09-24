"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Shield, TrendingUp, Users } from "lucide-react"

const features = [
  {
    title: "11 Advanced Models",
    description:
      "Choose from traditional ML, deep learning, and time series models including XGBoost, LSTM, Prophet, and ARIMA variants.",
    icon: Zap,
  },
  {
    title: "Enterprise Security",
    description: "Your data is processed securely with enterprise-grade encryption and privacy protection.",
    icon: Shield,
  },
  {
    title: "Real-time Insights",
    description: "Get instant forecasting results with interactive visualizations and comprehensive analytics.",
    icon: TrendingUp,
  },
  {
    title: "Team Collaboration",
    description: "Share forecasts and insights across your organization with built-in collaboration tools.",
    icon: Users,
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-sns-cream/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need for accurate supply chain forecasting
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-white"
            >
              <CardHeader className="text-center pb-4">
                <div className="bg-sns-orange/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-sns-orange group-hover:text-white transition-all duration-300">
                  <feature.icon className="h-8 w-8 text-sns-orange group-hover:text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-gray-600 text-center text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
