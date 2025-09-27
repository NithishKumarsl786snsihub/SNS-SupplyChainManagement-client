"use client"

import { useState } from "react"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import Upload from "./upload"
import Results from "./results"

export default function ProphetPage() {
  const [processingDone, setProcessingDone] = useState(false)
  const [uploadedData, setUploadedData] = useState<any[]>([])

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "Prophet", current: true },
  ]

  const handleProcessingComplete = (data: any[]) => {
    setUploadedData(data)
    setProcessingDone(true)
  }

  const handleRunAnotherModel = () => {
    setProcessingDone(false)
    setUploadedData([])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />
        {!processingDone ? (
          <Upload onProcessingComplete={handleProcessingComplete} />
        ) : (
          <Results data={uploadedData} onRunAnotherModel={handleRunAnotherModel} />
        )}
      </div>
    </div>
  )
}
