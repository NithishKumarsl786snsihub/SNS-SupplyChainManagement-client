"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts"

interface PredictionResult {
  StoreID: string
  ProductID: string
  Date: string
  PredictedDailySales: number
  Confidence: number
  Error?: string
}

interface DemandForecastChartProps {
  data: PredictionResult[]
  title?: string
}

interface ChartDataPoint {
  date: string
  predicted: number
  actual?: number
  confidence_upper: number
  confidence_lower: number
  store: string
  product: string
}

export default function DemandForecastChart({ data, title = "Demand Forecast vs Actual" }: DemandForecastChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])

  // Process all data for the chart (no filtering needed since ProductSelector handles that)
  useEffect(() => {
    if (data && data.length > 0) {
      const chartDataPoints: ChartDataPoint[] = data.map(item => {
        const confidence = item.Confidence || 0.8
        const margin = item.PredictedDailySales * (1 - confidence) * 0.5
        
        return {
          date: item.Date,
          predicted: item.PredictedDailySales,
          actual: undefined, // We don't have actual values in predictions
          confidence_upper: item.PredictedDailySales + margin,
          confidence_lower: Math.max(0, item.PredictedDailySales - margin),
          store: item.StoreID,
          product: item.ProductID
        }
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      setChartData(chartDataPoints)
    }
  }, [data])


  // Calculate metrics
  const totalPredictions = chartData.length
  const avgPrediction = chartData.length > 0 
    ? chartData.reduce((sum, item) => sum + item.predicted, 0) / chartData.length 
    : 0
  const maxPrediction = chartData.length > 0 
    ? Math.max(...chartData.map(item => item.predicted)) 
    : 0
  const minPrediction = chartData.length > 0 
    ? Math.min(...chartData.map(item => item.predicted)) 
    : 0

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; payload?: { confidence_upper?: number; confidence_lower?: number; store?: string; product?: string } }>; label?: string }) => {
    if (active && payload && payload.length && label) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{formatDate(label)}</p>
          <div className="space-y-1">
            <p className="text-blue-600">
              <span className="font-medium">Predicted:</span> {payload[0]?.value?.toFixed(0)} units
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Confidence:</span> {payload[0]?.value && payload[0]?.payload?.confidence_upper && payload[0]?.payload?.confidence_lower ? ((payload[0].payload.confidence_upper - payload[0].payload.confidence_lower) / 2 / payload[0].value * 100).toFixed(1) : '0'}%
            </p>
            <p className="text-gray-500 text-sm">
              Store: {payload[0]?.payload?.store} | Product: {payload[0]?.payload?.product}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {title}
          </CardTitle>
          <p className="text-gray-600 mt-1">
            Interactive demand forecasting with confidence intervals
          </p>
        </div>
      </CardHeader>

      <CardContent>
        {/* Metrics Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Data Points</span>
            </div>
            <p className="text-xl font-bold text-blue-900">{totalPredictions}</p>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Avg Demand</span>
            </div>
            <p className="text-xl font-bold text-green-900">{avgPrediction.toFixed(0)}</p>
          </div>
          
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">Peak Demand</span>
            </div>
            <p className="text-xl font-bold text-orange-900">{maxPrediction.toFixed(0)}</p>
          </div>
          
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Min Demand</span>
            </div>
            <p className="text-xl font-bold text-purple-900">{minPrediction.toFixed(0)}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="w-full h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#6B7280"
                fontSize={12}
                tickLine={{ stroke: '#6B7280' }}
                axisLine={{ stroke: '#6B7280' }}
              />
              
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
                tickLine={{ stroke: '#6B7280' }}
                axisLine={{ stroke: '#6B7280' }}
                label={{ 
                  value: 'Daily Sales Quantity', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: '#374151' }
                }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend />
              
              {/* Confidence Interval Area */}
              <Area
                type="monotone"
                dataKey="confidence_upper"
                stroke="none"
                fill="url(#confidenceGradient)"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="confidence_lower"
                stroke="none"
                fill="white"
                fillOpacity={1}
              />
              
              {/* Prediction Line */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: 'white' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Predicted Demand</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-200 rounded-full"></div>
            <span className="text-sm text-gray-600">Confidence Interval</span>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
