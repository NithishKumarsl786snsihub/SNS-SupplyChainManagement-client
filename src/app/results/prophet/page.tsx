"use client"

import { useState } from "react"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import Upload from "./upload"
import Results from "./results"

export default function ProphetPage() {
  const [processingDone, setProcessingDone] = useState(false)
  const [results, setResults] = useState<any>(null)

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "Prophet", current: true },
  ]

  const handleProcessingComplete = (apiResults: any) => {
    setResults(apiResults)
    setProcessingDone(true)
  }

  const handleRunAnotherModel = () => {
    setProcessingDone(false)
    setResults(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />
        {!processingDone ? (
          <Upload modelName="Prophet" onProcessingComplete={handleProcessingComplete} />
        ) : (
          <Results data={results} onRunAnotherModel={handleRunAnotherModel} />
        )}
      </div>
    </div>
  )
}
