"use client"

import { useState } from "react"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { ResultsSidebar } from "@/components/sidebar"
import Upload from "./upload"
import Results from "./results"

export default function ARIMAXResultsPage() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "ARIMAX", current: true },
  ]

  const [processingDone, setProcessingDone] = useState(false)

  const handleProcessingComplete = () => {
    setProcessingDone(true)
  }

  const handleRunAnotherModel = () => {
    setProcessingDone(false)
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
        <Results onRunAnotherModel={handleRunAnotherModel} />
      )}
    </div>
  )
}


