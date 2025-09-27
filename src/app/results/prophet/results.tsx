"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import LoaderSpinner from "@/components/ui/loader"
import Papa from "papaparse"

interface ResultsProps {
  data: any[]
  onRunAnotherModel: () => void
}

export default function Results({ data, onRunAnotherModel }: ResultsProps) {
  const [forecastData, setForecastData] = useState<any[]>([])
  const [elasticityData, setElasticityData] = useState<any[]>([])
  const [priceOptimization, setPriceOptimization] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (data.length > 0) generateForecast()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const generateForecast = async () => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", new Blob([Papa.unparse(data)], { type: "text/csv" }), "forecast.csv")

      const response = await axios.post("http://localhost:8000/api/prophet_forecast/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      const forecast = response.data.forecast || []
      const elasticity = response.data.price_elasticity || []

      setForecastData(forecast)
      setElasticityData(elasticity)

      const optimizedPrices = elasticity.map((e) => {
        const basePrice = parseFloat(e.Price) || 0
        const el = parseFloat(e.elasticity) || 0
        let optimalPrice = basePrice
        if (el < -1) optimalPrice = basePrice * 0.95
        else if (el > -1 && el < 0) optimalPrice = basePrice * 1.05
        return { ds: e.ds, optimalPrice: parseFloat(optimalPrice.toFixed(2)) }
      })

      setPriceOptimization(optimizedPrices)
    } catch (err) {
      console.error(err)
      alert("Error fetching forecast from backend")
    } finally {
      setLoading(false)
    }
  }

  const forecastChartData = forecastData.map((f, idx) => ({
    ds: f.ds,
    demand: parseFloat(f.yhat || 0),
    lower: parseFloat(f.yhat_lower || 0),
    upper: parseFloat(f.yhat_upper || 0),
  }))

  const priceChartData = elasticityData.map((e, idx) => {
    const opt = priceOptimization[idx] || {}
    return {
      ds: e.ds,
      price: parseFloat(e.Price || 0),
      optimalPrice: opt.optimalPrice || 0,
      elasticity: parseFloat(e.elasticity || 0),
    }
  })

  return (
    <div>
      {loading && <LoaderSpinner fullscreen size="md" message="Generating forecast & price optimization..." />}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📈 Prophet Forecast & Price Optimization</h1>
        <Button onClick={onRunAnotherModel}>Run Another Forecast</Button>
      </div>

      {forecastChartData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📈 Demand Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ds" />
                <YAxis label={{ value: "Demand", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="demand" stroke="#3B82F6" name="Forecasted Demand" />
                <Line type="monotone" dataKey="upper" stroke="#EF4444" strokeDasharray="5 5" name="Upper Confidence" />
                <Line type="monotone" dataKey="lower" stroke="#10B981" strokeDasharray="5 5" name="Lower Confidence" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {priceChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>💰 Price Optimization & Elasticity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={priceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ds" />
                <YAxis yAxisId="left" label={{ value: "Price / Optimal Price", angle: -90, position: "insideLeft" }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: "Elasticity", angle: -90, position: "insideRight" }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="price" stroke="#EF4444" yAxisId="left" name="Price" />
                <Line type="monotone" dataKey="optimalPrice" stroke="#8B5CF6" strokeDasharray="5 5" yAxisId="left" name="Optimal Price" />
                <Line type="monotone" dataKey="elasticity" stroke="#10B981" yAxisId="right" name="Price Elasticity" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
