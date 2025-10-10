"use client"

import { motion } from "framer-motion"
import { Download, BarChart3, TrendingUp, Zap, Activity } from "lucide-react"
import React, { useEffect, useState } from "react"
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, Area, ComposedChart } from 'recharts'

// --- Self-Contained UI Components to Resolve Import Errors ---

const Button = ({ children, onClick, className = '', variant = 'primary' }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: 'primary' | 'outline' }) => {
  const baseClasses = "font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center gap-2";
  const variantClasses = variant === 'outline'
    ? "bg-white shadow-lg border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white"
    : "bg-orange-600 text-white hover:bg-orange-700";
  return <button onClick={onClick} className={`${baseClasses} ${variantClasses} ${className}`}>{children}</button>
}

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`border-0 shadow-xl bg-white/80 backdrop-blur rounded-2xl ${className}`}>{children}</div>
)

const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

const CardDescription = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <p className={`text-base font-medium text-slate-600 ${className}`}>{children}</p>
)

const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`flex items-center gap-3 text-2xl font-bold text-slate-800 ${className}`}>{children}</h3>
)

const BreadcrumbNav = ({ items }: { items: { label: string, href?: string, current?: boolean }[] }) => (
  <nav aria-label="Breadcrumb" className="mb-6">
    <ol className="flex items-center gap-1 text-sm text-gray-600">
      {items.map((item, index) => (
        <li key={item.label} className="flex items-center">
          {index > 0 && <span className="mx-2">/</span>}
          <a href={item.href || '#'} className={`block transition hover:text-gray-700 ${item.current ? 'font-bold text-orange-600' : ''}`}>
            {item.label}
          </a>
        </li>
      ))}
    </ol>
  </nav>
);

const LoaderSpinner = ({ fullscreen = false, message }: { fullscreen?: boolean, message: string }) => (
    <div className={`flex items-center justify-center ${fullscreen ? 'fixed inset-0 bg-white/80 z-50' : 'w-full h-full'}`}>
        <div className="text-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-lg font-semibold text-slate-700">{message}</p>
        </div>
    </div>
);


// --- Interfaces for Prophet API Response ---

interface ModelInfo {
  name: string
  version: string
  description: string
  target_variable: string
  model_type: string
  last_updated: string
}

interface ForecastPoint {
  ds: string
  yhat: number
  yhat_lower: number
  yhat_upper: number
}

interface ElasticityPoint {
  ds: string
  Price: number
  y: number
  elasticity: number
}

interface ProphetResults {
  model_info: ModelInfo
  forecast: ForecastPoint[]
  price_elasticity: ElasticityPoint[]
}

interface ResultsProps {
  onRunAnotherModel: () => void
}

// --- Main Results Component ---

export default function Results({ onRunAnotherModel }: ResultsProps) {
  const [results, setResults] = useState<ProphetResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [yDomain, setYDomain] = useState<[number, number]>([0, 0])
  const [forecastStats, setForecastStats] = useState<{ avgDemand: number; peakDemand: number; totalDemand: number }>({ avgDemand: 0, peakDemand: 0, totalDemand: 0 })

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "Prophet", current: true },
  ]

  useEffect(() => {
    // Load results from session storage
    const storedResults = sessionStorage.getItem('prophet_results')
    if (storedResults) {
      try {
        const parsedResults: ProphetResults = JSON.parse(storedResults)
        setResults(parsedResults)
        
        // Process forecast data for charts and stats
        if (parsedResults.forecast && parsedResults.forecast.length > 0) {
          const forecast = parsedResults.forecast;
          const minY = Math.min(...forecast.map(p => p.yhat_lower))
          const maxY = Math.max(...forecast.map(p => p.yhat_upper))
          const pad = Math.max(1, (maxY - minY) * 0.1)
          setYDomain([Math.max(0, Math.floor(minY - pad)), Math.ceil(maxY + pad)])

          const total = forecast.reduce((sum, p) => sum + p.yhat, 0);
          const avg = total / forecast.length;
          const peak = Math.max(...forecast.map(p => p.yhat));
          setForecastStats({ avgDemand: avg, peakDemand: peak, totalDemand: total });
        }
      } catch (error) {
        console.error('Error parsing stored Prophet results:', error)
      }
    }
    setLoading(false)
  }, [])

  if (loading) {
      return <LoaderSpinner fullscreen message="Loading results..."/>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold text-slate-800">Prophet Forecast Analytics</h1>
                <p className="text-lg font-medium text-slate-600">{results?.model_info?.description || 'Time-series forecasting with trend and seasonality.'}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Download className="w-5 h-5 mr-2" /> Export Results
              </Button>
              <Button onClick={onRunAnotherModel}>
                <Zap className="w-5 h-5 mr-2" /> Run Another Forecast
              </Button>
            </div>
          </div>
        </motion.div>

        {results && results.forecast && results.forecast.length > 0 ? (
          <div className="space-y-8">
            {/* Forecast Chart and Metrics */}
            <Card>
              <CardHeader>
                 <CardTitle>
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                    Sales Demand Forecast
                </CardTitle>
                <CardDescription>
                    Predicted sales for the next {results.forecast.length} days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-3 h-[450px] w-full p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border">
                     <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={results.forecast}>
                            <defs>
                              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#D96F32" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#D96F32" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="ds" tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} angle={-30} textAnchor="end" height={50} tick={{ fontSize: 12 }} />
                            <YAxis domain={yDomain} allowDataOverflow tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#D96F32' }} />
                            <Legend />
                            <Area type="monotone" dataKey="yhat" name="Forecast" stroke="#D96F32" strokeWidth={2.5} fill="url(#forecastGradient)" />
                            <Line type="monotone" dataKey="yhat_upper" name="Upper Bound" stroke="#22c55e" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="yhat_lower" name="Lower Bound" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                      <MetricCard title="Total Forecasted Sales" value={Math.round(forecastStats.totalDemand).toLocaleString()} />
                      <MetricCard title="Average Daily Sales" value={Math.round(forecastStats.avgDemand).toLocaleString()} />
                      <MetricCard title="Peak Daily Sales" value={Math.round(forecastStats.peakDemand).toLocaleString()} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price Elasticity Chart */}
            {results.price_elasticity && results.price_elasticity.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            <Activity className="h-6 w-6 text-orange-600" />
                            Historical Price Elasticity
                        </CardTitle>
                        <CardDescription>
                            How changes in price have historically affected sales demand.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full p-4 bg-gradient-to-br from-slate-50 to-orange-50 rounded-2xl border">
                             <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={results.price_elasticity}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="ds" tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })} tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#C75D2C' }}/>
                                    <Legend />
                                    <Line type="monotone" dataKey="elasticity" name="Price Elasticity" stroke="#C75D2C" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Forecast Data Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Forecast Data</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="max-h-96 overflow-y-auto rounded-lg border">
                        <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-100">
                            <tr className="text-slate-700 font-semibold">
                              <th className="py-3 px-4 text-center">Date</th>
                              <th className="py-3 px-4 text-center">Forecast (yhat)</th>
                              <th className="py-3 px-4 text-center">Lower Bound</th>
                              <th className="py-3 px-4 text-center">Upper Bound</th>
                          </tr>
                        </thead>
                        <tbody>
                            {results.forecast.map((row) => (
                                <tr key={row.ds} className="border-b hover:bg-slate-50">
                                  <td className="py-3 px-4 text-center font-medium">{new Date(row.ds).toLocaleDateString()}</td>
                                  <td className="py-3 px-4 text-center font-bold text-orange-600">{row.yhat.toFixed(2)}</td>
                                  <td className="py-3 px-4 text-center text-red-600">{row.yhat_lower.toFixed(2)}</td>
                                  <td className="py-3 px-4 text-center text-green-600">{row.yhat_upper.toFixed(2)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      </div>
                </CardContent>
            </Card>

          </div>
        ) : (
          /* No Data / Error State */
          <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <BarChart3 className="h-20 w-20 text-orange-500 mb-6" />
                  <h3 className="text-3xl font-bold mb-4 text-slate-800">No Forecast Data Available</h3>
                  <p className="text-lg font-medium mb-8 text-slate-600">
                    Something went wrong, or no results were found. Please try uploading your data again.
                  </p>
                  <Button onClick={onRunAnotherModel}>
                    <Zap className="w-5 h-5 mr-2" /> Upload Data
                  </Button>
              </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


// --- Reusable Metric Card Component ---
const MetricCard = ({ title, value }: { title: string, value: string | number }) => (
    <div className="rounded-2xl bg-white shadow-lg ring-1 ring-orange-100 p-5">
        <div className="flex flex-col items-start gap-1">
             <div className="text-slate-600 text-sm font-medium">{title}</div>
             <div className="text-3xl font-bold text-orange-600">{value}</div>
        </div>
    </div>
)

