"use client"

import { useState } from "react"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { ResultsSidebar } from "@/components/sidebar"
import Upload from "./upload"
import Results from "./results"
import LoaderSpinner from "@/components/ui/loader"

export default function CatBoostResults() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "CatBoost", current: true },
  ]

  const [processingDone, setProcessingDone] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [processingError, setProcessingError] = useState<string | null>(null)

  const handleProcessingComplete = () => {
    // Immediately show the processing loader; it will handle auto-advance and completion
    setIsProcessing(true)
    setProcessingStep(0)
    setProcessingError(null)
  }

  const handleProcessingProgress = (step: number) => {
    setProcessingStep(step)
  }

  const handleProcessingFinished = () => {
    setIsProcessing(false)
    setProcessingDone(true)
  }

  const handleProcessingError = (message: string) => {
    setProcessingStep(0)
    setIsProcessing(false)
    setProcessingDone(false)
    setProcessingError(message || 'Dataset was not received. Please upload your CSV and try again.')
  }

  const handleRunAnotherModel = () => {
    setProcessingDone(false)
  }

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {isProcessing ? (
        <LoaderSpinner
          showStepper
          autoAdvance={false}
          step={processingStep}
          message="Processing your data..."
          fullscreen={false}
          background="#fdfaf6"
        />
      ) : processingError ? (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-xl w-full text-center bg-white/70 ring-1 ring-[#F3E9DC] rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">We couldn’t process your file</h2>
            <p className="text-gray-700 mb-6">{processingError}</p>
            <div className="flex gap-3 justify-center">
              <button className="px-4 py-2 rounded-md bg-[#D96F32] text-white hover:bg-[#C75D2C]" onClick={() => setProcessingError(null)}>Back</button>
            </div>
          </div>
        </div>
      ) : !processingDone ? (
        <>
      <ResultsSidebar />
      <div className="px-4 sm:px-6 lg:pl-[300px] lg:pr-8 py-8">
            <BreadcrumbNav items={breadcrumbItems} />
            <Upload onProcessingComplete={handleProcessingComplete} onProcessingProgress={handleProcessingProgress} onProcessingFinished={handleProcessingFinished} onProcessingError={handleProcessingError} />
          </div>
                      </>
                    ) : (
        <Results onRunAnotherModel={handleRunAnotherModel} />
      )}
    </div>
  )
}
