"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Database, Upload, Brain, BarChart3 } from "lucide-react"

const steps = [
  {
    number: 1,
    title: "Select Forecasting Model",
    description: "Choose from 11 advanced models including XGBoost, LSTM, Prophet, and more",
    icon: Brain,
  },
  {
    number: 2,
    title: "Download Sample Dataset",
    description: "Get structured sample data to understand the required format",
    icon: Database,
  },
  {
    number: 3,
    title: "Upload Your Data",
    description: "Drag and drop your CSV files with supply chain data",
    icon: Upload,
  },
  {
    number: 4,
    title: "View Intelligent Results",
    description: "Get comprehensive forecasts with visualizations and insights",
    icon: BarChart3,
  },
]

export function WorkflowSection() {
  return (
    <section id="workflow" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get accurate supply chain forecasts in four simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <Card
              key={step.number}
              className="relative group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-6 text-center">
                <div className="bg-sns-yellow/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-sns-yellow/30 transition-colors">
                  <span className="text-2xl font-bold text-sns-orange">{step.number}</span>
                </div>
                <div className="bg-sns-orange/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-6 w-6 text-sns-orange" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </CardContent>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-sns-orange/30"></div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
