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

  // Compute dynamic Y-axis domain with slight padding and compact tick formatting
  const values: number[] = []
  for (const row of data) {
    if (typeof row.predicted === 'number') values.push(row.predicted)
    if (typeof row.actual === 'number') values.push(row.actual)
    if (typeof row.confidence_upper === 'number') values.push(row.confidence_upper)
    if (typeof row.confidence_lower === 'number') values.push(row.confidence_lower)
  }
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = Math.max(1, maxVal - minVal)
  // Add stronger padding so the line never hugs the axes
  const pad = Math.max(10, Math.round(range * 0.30))
  const domain: [number, number] = [minVal - pad, maxVal + pad]
  const compactFmt = new Intl.NumberFormat(undefined, { notation: 'compact' })

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
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getFullYear()}`
                }}
              />
              <YAxis stroke="#666" fontSize={12} domain={domain} tickFormatter={(v) => compactFmt.format(Number(v))} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                }}
                labelFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getFullYear()}`
                }}
                formatter={(value: number, name: string) => [compactFmt.format(value), name]}
              />
              <Legend />
              {data.some((d) => d.actual !== undefined) && (
                <Line
                  type="linear"
                  dataKey="actual"
                  stroke="#6b7280"
                  strokeWidth={2}
                  dot={{ fill: "#6b7280", strokeWidth: 2, r: 3 }}
                  connectNulls
                  name="Actual"
                />
              )}
              <Line
                type="linear"
                dataKey="predicted"
                stroke="#D96F32"
                strokeWidth={2}
                dot={{ fill: "#D96F32", strokeWidth: 2, r: 3 }}
                connectNulls
                name="Predicted"
              />
              {data.some((d) => d.confidence_upper !== undefined) && (
                <>
                  <Line
                    type="linear"
                    dataKey="confidence_upper"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    connectNulls
                    name="Upper Confidence"
                  />
                  <Line
                    type="linear"
                    dataKey="confidence_lower"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    connectNulls
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


