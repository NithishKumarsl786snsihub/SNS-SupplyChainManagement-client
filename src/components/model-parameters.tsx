"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ModelParameter {
  name: string
  value: string | number
  description?: string
}

interface ModelParametersProps {
  modelName: string
  parameters: ModelParameter[]
  trainingTime?: string
  accuracy?: number
}

export function ModelParameters({ modelName, parameters, trainingTime, accuracy }: ModelParametersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">Model Configuration</span>
          <Badge className="bg-sns-orange text-white">{modelName}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(trainingTime || accuracy) && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-sns-cream/30 rounded-lg">
            {trainingTime && (
              <div>
                <p className="text-sm text-gray-600">Training Time</p>
                <p className="font-medium text-gray-900">{trainingTime}</p>
              </div>
            )}
            {accuracy && (
              <div>
                <p className="text-sm text-gray-600">Model Accuracy</p>
                <p className="font-medium text-gray-900">{accuracy}%</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Parameters</h4>
          {parameters.map((param, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{param.name}</p>
                {param.description && <p className="text-sm text-gray-600">{param.description}</p>}
              </div>
              <Badge variant="outline" className="border-sns-orange text-sns-orange">
                {param.value}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
