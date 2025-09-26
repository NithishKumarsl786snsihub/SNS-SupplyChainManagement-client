"use client"

import { useState } from "react"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { ResultsSidebar } from "@/components/sidebar"
import Upload from "./upload"
import Results from "./results"
import { TrainingResponse, PredictionResponse } from "@/config/api"

export default function LinearRegressionResultsPage() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Models", href: "/models" },
    { label: "Linear Regression", current: true },
  ]

  const [processingDone, setProcessingDone] = useState(false)
  const [processingState, setProcessingState] = useState<{
    trainingResult: TrainingResponse | null
    predictionResult: PredictionResponse | null
    datasetId?: number | null
    datasetIdM6?: number | null
  }>({
    trainingResult: null,
    predictionResult: null,
    datasetId: null,
    datasetIdM6: null
  })

  const handleProcessingComplete = (trainingResult: TrainingResponse, predictionResult: PredictionResponse, datasetId?: number, datasetIdM6?: number) => {
    setProcessingState({ trainingResult, predictionResult, datasetId: datasetId ?? null, datasetIdM6: datasetIdM6 ?? null })
    setProcessingDone(true)
  }

  const handleRunAnotherModel = () => {
    setProcessingDone(false)
    setProcessingState({ trainingResult: null, predictionResult: null, datasetId: null, datasetIdM6: null })
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
        <Results 
          onRunAnotherModel={handleRunAnotherModel}
          trainingResult={processingState.trainingResult}
          predictionResult={processingState.predictionResult}
          datasetId={processingState.datasetId ?? undefined}
          datasetIdM6={processingState.datasetIdM6 ?? undefined}
        />
      )}
    </div>
  )
}
