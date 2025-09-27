"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import Upload from "./upload"
import Results from "./results"
import { Button } from "@/components/ui/button"

export default function VarimaPage() {
  const [processingDone, setProcessingDone] = useState(false)
  const [uploadedData, setUploadedData] = useState<any[]>([])
  const router = useRouter()

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "VARIMA", current: true },
  ]

  const handleProcessingComplete = (data: any[]) => {
    setUploadedData(data)
    setProcessingDone(true)
  }

  const handleRunAnotherModel = () => {
    setProcessingDone(false)
    setUploadedData([])
  }

  const handleGoBack = () => {
    router.back() // Navigate to the previous page (Prophet)
  }

  return (
    <div className="min-h-screen bg-gray-50 px-8 py-8">
      {/* Breadcrumb + Back Button */}
      <div className="flex items-center justify-between mb-6">
        <BreadcrumbNav items={breadcrumbItems} />
        <Button variant="outline" onClick={handleGoBack}>
          ← Back to Prophet Forecast
        </Button>
      </div>

      {/* Upload / Results Toggle */}
      {!processingDone ? (
        <Upload onProcessingComplete={handleProcessingComplete} />
      ) : (
        <Results data={uploadedData} onRunAnotherModel={handleRunAnotherModel} />
      )}
    </div>
  )
}
