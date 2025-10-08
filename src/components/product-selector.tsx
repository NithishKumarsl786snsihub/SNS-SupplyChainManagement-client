"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Store, Package, TrendingUp, BarChart3, Target } from "lucide-react"

interface PredictionResult {
  StoreID: string
  ProductID: string
  ProductName?: string
  Date: string
  PredictedDailySales: number
  Confidence: number
  Error?: string
}

interface ProductSelectorProps {
  data: PredictionResult[]
  onSelectionChange: (store: string, product: string, filteredData: PredictionResult[]) => void
  embedded?: boolean
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

export default function ProductSelector({ data, onSelectionChange, embedded = false }: ProductSelectorProps) {
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [availableStores, setAvailableStores] = useState<string[]>([])
  const [productIdToName, setProductIdToName] = useState<Record<string, string>>({})
  const [storeProductStats, setStoreProductStats] = useState<StoreProductStats[]>([])

  // Extract unique stores and products
  useEffect(() => {
    if (data && data.length > 0) {
      console.log(`🔍 [PRODUCT-SELECTOR] Processing ${data.length} data items`)
      
      const stores = [...new Set(data.map(item => item.StoreID))].sort()
      const products = [...new Set(data.map(item => item.ProductID))].sort()
      
      console.log(`🏪 [PRODUCT-SELECTOR] Found ${stores.length} unique stores:`, stores)
      console.log(`📦 [PRODUCT-SELECTOR] Found ${products.length} unique products:`, products)
      
      setAvailableStores(stores)
      const map: Record<string, string> = {}
      data.forEach(item => {
        if (item.ProductID && item.ProductName && !map[item.ProductID]) {
          map[item.ProductID] = item.ProductName
        }
      })
      setProductIdToName(map)
      
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
      console.log(`📊 [PRODUCT-SELECTOR] Calculated ${stats.length} store-product combinations`)
      
      // Set default selections
      if (stores.length > 0 && !selectedStore) {
        setSelectedStore(stores[0])
        console.log(`🏪 [PRODUCT-SELECTOR] Default store selected: ${stores[0]}`)
      }
      if (products.length > 0 && !selectedProduct) {
        setSelectedProduct(products[0])
        console.log(`📦 [PRODUCT-SELECTOR] Default product selected: ${products[0]}`)
      }
    }
  }, [data, selectedStore, selectedProduct])

  // Filter data based on selected store and product
  useEffect(() => {
    if (selectedStore && selectedProduct && data) {
      const filtered = data.filter(item => 
        item.StoreID === selectedStore && item.ProductID === selectedProduct
      ).sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())
      
      onSelectionChange(selectedStore, selectedProduct, filtered)
    }
  }, [selectedStore, selectedProduct, data, onSelectionChange])

  // Get current stats
  const currentStats = storeProductStats.find(stat => 
    stat.store === selectedStore && stat.product === selectedProduct
  )

  const handleStoreChange = (store: string) => {
    console.log(`🏪 [PRODUCT-SELECTOR] Store changed to: ${store}`)
    setSelectedStore(store)
    // Reset product selection when store changes
    const availableProductsForStore = storeProductStats
      .filter(stat => stat.store === store)
      .map(stat => stat.product)
    
    console.log(`📦 [PRODUCT-SELECTOR] Available products for ${store}:`, availableProductsForStore)
    
    if (availableProductsForStore.length > 0) {
      setSelectedProduct(availableProductsForStore[0])
      console.log(`📦 [PRODUCT-SELECTOR] Auto-selected product: ${availableProductsForStore[0]}`)
    }
  }

  const handleProductChange = (product: string) => {
    setSelectedProduct(product)
  }

  const Inner = (
        <div className="space-y-6">
          {/* Selection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-base font-bold flex items-center gap-2 text-slate-700">
                <div className="p-1 rounded" style={{ backgroundColor: '#D96F32' }}>
                  <Store className="h-4 w-4 text-white" />
                </div>
                Store Selection
              </label>
              <Select value={selectedStore} onValueChange={handleStoreChange}>
                <SelectTrigger 
                  className="w-full border-2 border-blue-300 rounded-xl font-semibold transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 bg-white"
                >
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto rounded-xl border-2 border-blue-300">
                  {availableStores.map(store => {
                    const storeStats = storeProductStats.filter(stat => stat.store === store)
                    const totalProducts = storeStats.length
                    
                    return (
                      <SelectItem key={store} value={store} className="font-semibold">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-slate-700">{store}</span>
                          <Badge 
                            className="ml-2 text-xs font-bold px-2 py-1 rounded-lg text-white"
                            style={{ backgroundColor: '#F8B259' }}
                          >
                            {totalProducts} products
                          </Badge>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-base font-bold flex items-center gap-2 text-slate-700">
                <div className="p-1 rounded" style={{ backgroundColor: '#F8B259' }}>
                  <Package className="h-4 w-4 text-white" />
                </div>
                Product Selection
              </label>
              <Select value={selectedProduct} onValueChange={handleProductChange}>
                <SelectTrigger 
                  className="w-full border-2 border-indigo-300 rounded-xl font-semibold transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 bg-white"
                >
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto rounded-xl border-2 border-indigo-300">
                  {selectedStore && storeProductStats
                    .filter(stat => stat.store === selectedStore)
                    .map(stat => (
                      <SelectItem key={stat.product} value={stat.product} className="font-semibold">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-slate-700">{stat.product}{productIdToName[stat.product] ? ` (${productIdToName[stat.product]})` : ''}</span>
                          <Badge 
                            className="ml-2 text-xs font-bold px-2 py-1 rounded-lg text-white"
                            style={{ backgroundColor: '#D96F32' }}
                          >
                            {stat.totalPredictions} predictions
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>


          {/* Removed "Available Store-Product Combinations" for a cleaner UI */}
        </div>
  )

  if (embedded) {
    return (
      <div className="w-full">
        <div className="pb-4">
          <div className="flex items-center gap-3 text-2xl font-bold text-slate-800">
            <div className="p-2 rounded-lg shadow-lg" style={{ backgroundColor: '#D96F32' }}>
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            Product & Store Selection
          </div>
          <p className="text-base font-medium text-slate-600 mt-2">
            Select a store and product combination to view detailed demand forecasting
          </p>
        </div>
        {Inner}
      </div>
    )
  }

  return (
    <Card className="w-full border-0 shadow-xl bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-800">
          <div className="p-2 rounded-lg shadow-lg" style={{ backgroundColor: '#D96F32' }}>
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          Product & Store Selection
        </CardTitle>
        <p className="text-base font-medium text-slate-600">
          Select a store and product combination to view detailed demand forecasting
        </p>
      </CardHeader>

      <CardContent>
        {Inner}
      </CardContent>
    </Card>
  )
}
