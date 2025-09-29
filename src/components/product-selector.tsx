"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Store, Package, TrendingUp, BarChart3, Calendar } from "lucide-react"

interface PredictionResult {
  StoreID: string
  ProductID: string
  Date: string
  PredictedDailySales: number
  Confidence: number
  Error?: string
}

interface ProductSelectorProps {
  data: PredictionResult[]
  onSelectionChange: (store: string, product: string, filteredData: PredictionResult[]) => void
}

interface StoreProductStats {
  store: string
  product: string
  totalPredictions: number
  avgDemand: number
  maxDemand: number
  minDemand: number
  avgConfidence: number
}

export default function ProductSelector({ data, onSelectionChange }: ProductSelectorProps) {
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [availableStores, setAvailableStores] = useState<string[]>([])
  const [availableProducts, setAvailableProducts] = useState<string[]>([])
  const [storeProductStats, setStoreProductStats] = useState<StoreProductStats[]>([])
  const [filteredData, setFilteredData] = useState<PredictionResult[]>([])

  // Extract unique stores and products
  useEffect(() => {
    if (data && data.length > 0) {
      const stores = [...new Set(data.map(item => item.StoreID))].sort()
      const products = [...new Set(data.map(item => item.ProductID))].sort()
      
      setAvailableStores(stores)
      setAvailableProducts(products)
      
      // Calculate stats for each store-product combination
      const stats: StoreProductStats[] = []
      stores.forEach(store => {
        products.forEach(product => {
          const storeProductData = data.filter(item => 
            item.StoreID === store && item.ProductID === product
          )
          
          if (storeProductData.length > 0) {
            const totalPredictions = storeProductData.length
            const avgDemand = storeProductData.reduce((sum, item) => sum + item.PredictedDailySales, 0) / totalPredictions
            const maxDemand = Math.max(...storeProductData.map(item => item.PredictedDailySales))
            const minDemand = Math.min(...storeProductData.map(item => item.PredictedDailySales))
            const avgConfidence = storeProductData.reduce((sum, item) => sum + item.Confidence, 0) / totalPredictions
            
            stats.push({
              store,
              product,
              totalPredictions,
              avgDemand,
              maxDemand,
              minDemand,
              avgConfidence
            })
          }
        })
      })
      
      setStoreProductStats(stats)
      
      // Set default selections
      if (stores.length > 0 && !selectedStore) {
        setSelectedStore(stores[0])
      }
      if (products.length > 0 && !selectedProduct) {
        setSelectedProduct(products[0])
      }
    }
  }, [data, selectedStore, selectedProduct])

  // Filter data based on selected store and product
  useEffect(() => {
    if (selectedStore && selectedProduct && data) {
      const filtered = data.filter(item => 
        item.StoreID === selectedStore && item.ProductID === selectedProduct
      ).sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())
      
      setFilteredData(filtered)
      onSelectionChange(selectedStore, selectedProduct, filtered)
    }
  }, [selectedStore, selectedProduct, data, onSelectionChange])

  // Get current stats
  const currentStats = storeProductStats.find(stat => 
    stat.store === selectedStore && stat.product === selectedProduct
  )

  const handleStoreChange = (store: string) => {
    setSelectedStore(store)
    // Reset product selection when store changes
    const availableProductsForStore = storeProductStats
      .filter(stat => stat.store === store)
      .map(stat => stat.product)
    
    if (availableProductsForStore.length > 0) {
      setSelectedProduct(availableProductsForStore[0])
    }
  }

  const handleProductChange = (product: string) => {
    setSelectedProduct(product)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Product & Store Selection
        </CardTitle>
        <p className="text-gray-600 text-sm">
          Select a store and product combination to view detailed demand forecasting
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Selection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Store className="h-4 w-4" />
                Store Selection
              </label>
              <Select value={selectedStore} onValueChange={handleStoreChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {availableStores.map(store => {
                    const storeStats = storeProductStats.filter(stat => stat.store === store)
                    const totalProducts = storeStats.length
                    const totalPredictions = storeStats.reduce((sum, stat) => sum + stat.totalPredictions, 0)
                    
                    return (
                      <SelectItem key={store} value={store}>
                        <div className="flex items-center justify-between w-full">
                          <span>{store}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {totalProducts} products
                          </Badge>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Product Selection
              </label>
              <Select value={selectedProduct} onValueChange={handleProductChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {selectedStore && storeProductStats
                    .filter(stat => stat.store === selectedStore)
                    .map(stat => (
                      <SelectItem key={stat.product} value={stat.product}>
                        <div className="flex items-center justify-between w-full">
                          <span>{stat.product}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {stat.totalPredictions} points
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current Selection Stats */}
          {currentStats && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Current Selection</h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Store className="h-3 w-3 mr-1" />
                    {selectedStore}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    {selectedProduct}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Data Points</span>
                  </div>
                  <p className="text-xl font-bold text-blue-900">{currentStats.totalPredictions}</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Avg Demand</span>
                  </div>
                  <p className="text-xl font-bold text-green-900">{currentStats.avgDemand.toFixed(0)}</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">Peak Demand</span>
                  </div>
                  <p className="text-xl font-bold text-orange-900">{currentStats.maxDemand.toFixed(0)}</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">Confidence</span>
                  </div>
                  <p className="text-xl font-bold text-purple-900">{(currentStats.avgConfidence * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Available Combinations Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Available Store-Product Combinations</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {storeProductStats.slice(0, 6).map((stat, index) => (
                <div 
                  key={`${stat.store}-${stat.product}`}
                  className={`p-2 rounded text-sm cursor-pointer transition-colors ${
                    stat.store === selectedStore && stat.product === selectedProduct
                      ? 'bg-blue-600 text-white'
                      : 'bg-white hover:bg-blue-100'
                  }`}
                  onClick={() => {
                    setSelectedStore(stat.store)
                    setSelectedProduct(stat.product)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{stat.store}</span>
                    <Badge 
                      variant={stat.store === selectedStore && stat.product === selectedProduct ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {stat.product}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {stat.totalPredictions} points • {(stat.avgConfidence * 100).toFixed(0)}% conf
                  </div>
                </div>
              ))}
              {storeProductStats.length > 6 && (
                <div className="p-2 rounded text-sm text-gray-500 text-center">
                  +{storeProductStats.length - 6} more combinations
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
