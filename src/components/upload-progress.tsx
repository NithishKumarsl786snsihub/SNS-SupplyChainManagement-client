"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Clock, AlertCircle } from "lucide-react"

interface UploadStep {
  id: string
  label: string
  status: "pending" | "processing" | "completed" | "error"
  message?: string
}

interface UploadProgressProps {
  steps: UploadStep[]
}

export function UploadProgress({ steps }: UploadProgressProps) {
  const getStepIcon = (status: UploadStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "processing":
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sns-orange"></div>
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStepColor = (status: UploadStep["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-900"
      case "processing":
        return "text-sns-orange"
      case "error":
        return "text-red-900"
      default:
        return "text-gray-600"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Upload Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className="mt-0.5">{getStepIcon(step.status)}</div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${getStepColor(step.status)}`}>{step.label}</p>
              {step.message && <p className="text-sm text-gray-600 mt-1">{step.message}</p>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
