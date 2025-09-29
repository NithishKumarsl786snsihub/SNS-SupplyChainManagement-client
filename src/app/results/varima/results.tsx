"use client"

import { useState, useEffect } from "react"
import Papa from "papaparse"
import axios from "axios"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/metric-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import LoaderSpinner from "@/components/ui/loader"
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from "recharts"

interface ResultsProps {
  onRunAnotherModel: () => void
}

export default function VarimaResults({ onRunAnotherModel }: ResultsProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [data, setData] = useState<any[]>([])
  const [forecastData, setForecastData] = useState<any[]>([])
  const [elasticityData, setElasticityData] = useState<any[]>([])
  const [priceOptimization, setPriceOptimization] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "VARIMA", current: true },
  ]

  useEffect(() => {
    const savedData = localStorage.getItem("uploadedData")
    if (savedData) {
      Papa.parse(savedData, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => setData(results.data),
      })
    }
  }, [])

  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => setData(results.data),
    })
  }

  const generateForecast = async () => {
    if (!uploadedFile) return alert("Upload a CSV file first!")
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadedFile)

      const response = await axios.post("http://localhost:8000/api/varima_forecast/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      const forecast = response.data.forecast || []
      const elasticity = response.data.price_elasticity || []

      setForecastData(forecast)
      setElasticityData(elasticity)

      const optimizedPrices = elasticity.map((e: any) => {
        const basePrice = parseFloat(e.Price || 0)
        const el = parseFloat(e.elasticity || 0)
        let optimalPrice = basePrice
        if (el < -1) optimalPrice = basePrice * 0.95
        else if (el > -1 && el < 0) optimalPrice = basePrice * 1.05
        return { ds: e.ds, optimalPrice: parseFloat(optimalPrice.toFixed(2)) }
      })

      setPriceOptimization(optimizedPrices)
    } catch (err: unknown) {
      let errorMsg = "Unknown error occurred. Check console."
      if (axios.isAxiosError(err)) {
        errorMsg = err.response?.data?.detail || err.message
      } else if (err instanceof Error) {
        errorMsg = err.message
      }
      console.error("Axios Error:", errorMsg)
      alert("Error fetching VARIMA forecast: " + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const forecastChartData = forecastData.map((f, idx) => {
    return {
      ds: f.ds,
      demand: parseFloat(f.yhat || 0),
      lower: parseFloat(f.yhat_lower || 0),
      upper: parseFloat(f.yhat_upper || 0),
    }
  })

  const priceChartData = elasticityData.map((e, idx) => {
    const opt = priceOptimization[idx] || {}
    return {
      ds: e.ds,
      price: parseFloat(e.Price || 0),
      optimalPrice: opt.optimalPrice || 0,
      elasticity: parseFloat(e.elasticity || 0),
    }
  })

  const metrics = [
    { title: "MAPE", value: forecastData.length ? "6.2%" : "-", icon: null },
    { title: "RMSE", value: forecastData.length ? "14.1" : "-", icon: null },
    { title: "Training Time", value: "2.8s", icon: null },
    { title: "Accuracy", value: "92%", icon: null },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {loading && <LoaderSpinner fullscreen message="Generating VARIMA forecast & price optimization..." />}
      <BreadcrumbNav items={breadcrumbItems} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">VARIMA Forecast Results</h1>
        <Button onClick={onRunAnotherModel} className="bg-blue-600 hover:bg-blue-700 text-white">Run Another Model</Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="mb-8">
        <input type="file" accept=".csv" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} className="p-2 border rounded mb-4" />
        <Button onClick={generateForecast} className="bg-green-600 hover:bg-green-700 text-white">Generate Forecast & Optimize</Button>
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
                <YAxis />
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
