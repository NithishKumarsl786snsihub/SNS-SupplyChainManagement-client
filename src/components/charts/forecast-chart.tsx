"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface ForecastChartProps {
  data: Array<{
    date: string
    actual?: number
    predicted: number
    confidence_upper?: number
    confidence_lower?: number
  }>
  title?: string
}

export function ForecastChart({ data, title = "Forecast vs Actual" }: ForecastChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-gray-500">No data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              {data.some((d) => d.actual !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#6b7280"
                  strokeWidth={2}
                  dot={{ fill: "#6b7280", strokeWidth: 2, r: 4 }}
                  name="Actual"
                />
              )}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="var(--color-sns-orange)"
                strokeWidth={2}
                dot={{ fill: "var(--color-sns-orange)", strokeWidth: 2, r: 4 }}
                name="Predicted"
              />
              {data.some((d) => d.confidence_upper !== undefined) && (
                <>
                  <Line
                    type="monotone"
                    dataKey="confidence_upper"
                    stroke="var(--color-sns-yellow)"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Upper Confidence"
                  />
                  <Line
                    type="monotone"
                    dataKey="confidence_lower"
                    stroke="var(--color-sns-yellow)"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Lower Confidence"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}


