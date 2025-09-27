"use client"

import { useState } from "react"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { ResultsSidebar } from "@/components/sidebar"
import Upload from "./upload"
import Results from "./results"

interface SarimaxPreviewRow {
  [key: string]: string | number | undefined
  StoreID: string
  ProductID: string
  Date: string
  PredictedMonthlyDemand: number
  LowerConfidenceBound?: number
  UpperConfidenceBound?: number
}

export interface SarimaxResult {
  preview?: SarimaxPreviewRow[]
  steps?: number
  chart_base64?: string
  forecast_csv_base64?: string
  model_info?: unknown
  storeToProducts?: Record<string, string[]>
  session_id?: string
}
export type { SarimaxPreviewRow }

export default function SarimaxResultsPage() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "SARIMAX", current: true },
  ]

  const [processingDone, setProcessingDone] = useState(false)
  const [resultPayload, setResultPayload] = useState<SarimaxResult | null>(null)

  const handleProcessingComplete = (payload: SarimaxResult) => {
    setResultPayload(payload)
    setProcessingDone(true)
  }

  const handleRunAnotherModel = () => {
    setProcessingDone(false)
    setResultPayload(null)
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
        <Results onRunAnotherModel={handleRunAnotherModel} result={resultPayload} />
      )}
    </div>
  )
}
