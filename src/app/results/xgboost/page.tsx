"use client"

import { useState } from "react"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { ResultsSidebar } from "@/components/sidebar"
import Upload from "./upload"
import Results from "./results"

type XGBPredictionRow = {
  StoreID: string
  ProductID: string
  Date: string
  PredictedMonthlyDemand: number
}

type XGBApiResponse = {
  count: number
  predictions: XGBPredictionRow[]
}

type CategoryMap = Record<string, string>
type ContextMap = Record<string, Record<string, unknown>>

export default function XGBoostResultsPage() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "XGBoost", current: true },
  ]

  const [processingDone, setProcessingDone] = useState(false)
  const [apiResult, setApiResult] = useState<XGBApiResponse | null>(null)
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({})
  const [contextMap, setContextMap] = useState<ContextMap>({})

  const handleProcessingComplete = (response: XGBApiResponse, categories: CategoryMap, contexts: ContextMap) => {
    setApiResult(response)
    setCategoryMap(categories)
    setContextMap(contexts)
    setProcessingDone(true)
  }

  const handleRunAnotherModel = () => {
    setProcessingDone(false)
    setApiResult(null)
    setCategoryMap({})
  }

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {!processingDone ? (
        <>
          <ResultsSidebar />
          <div className="px-4 sm:px-6 lg:pl-[300px] lg:pr-8 py-8">
            <BreadcrumbNav items={breadcrumbItems} />
            <Upload onProcessingComplete={handleProcessingComplete} />
          </div>
        </>
      ) : (
        <Results onRunAnotherModel={handleRunAnotherModel} predictions={apiResult?.predictions ?? []} categoryMap={categoryMap} contextMap={contextMap} />
      )}
    </div>
  )
}