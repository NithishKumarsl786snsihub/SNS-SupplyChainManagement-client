"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Info } from "lucide-react"

interface DataRequirement {
  column: string
  type: string
  required: boolean
  description: string
}

interface DataRequirementsPanelProps {
  modelName: string
  requirements: DataRequirement[]
}

export function DataRequirementsPanel({ modelName, requirements }: DataRequirementsPanelProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Info className="h-5 w-5 text-sns-orange" />
          Data Requirements for {modelName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-sns-cream/30 rounded-lg">
              <div className="mt-0.5">
                {req.required ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{req.column}</span>
                  <Badge variant={req.required ? "default" : "secondary"} className="text-xs">
                    {req.type}
                  </Badge>
                  {req.required && <Badge className="bg-red-100 text-red-800 text-xs">Required</Badge>}
                </div>
                <p className="text-sm text-gray-600">{req.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Format Guidelines</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• CSV format with headers in the first row</li>
            <li>• Date format: YYYY-MM-DD or MM/DD/YYYY</li>
            <li>• Numeric values without currency symbols</li>
            <li>• Missing values should be empty or marked as NULL</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
