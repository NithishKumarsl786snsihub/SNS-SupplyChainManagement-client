"use client"

import { useState } from "react"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { ResultsSidebar } from "@/components/sidebar"
import Upload from "./upload"
import Results from "./results"

interface SarimaResultPayload {
  preview: Array<Record<string, unknown>>
  steps: number
  chart_base64: string
}

export default function SARIMAResultsPage() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "SARIMA", current: true },
  ]

  const [processingDone, setProcessingDone] = useState(false)
  const [sarimaResult, setSarimaResult] = useState<SarimaResultPayload | null>(null)

  const handleProcessingComplete = (result: SarimaResultPayload) => {
    setSarimaResult(result)
    setProcessingDone(true)
  }

  const handleRunAnotherModel = () => {
    setProcessingDone(false)
    setSarimaResult(null)
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
        <Results onRunAnotherModel={handleRunAnotherModel} result={sarimaResult} />
      )}
    </div>
  )
}