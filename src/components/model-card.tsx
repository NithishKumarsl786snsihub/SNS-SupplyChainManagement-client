"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ModelCardProps {
  name: string
  description: string
  category: "ml" | "deep-learning" | "time-series"
  isSelected: boolean
  onClick: () => void
}

const categoryColors = {
  ml: "bg-sns-orange text-white",
  "deep-learning": "bg-sns-orange-dark text-white",
  "time-series": "bg-sns-yellow text-gray-900",
}

const categoryLabels = {
  ml: "Machine Learning",
  "deep-learning": "Deep Learning",
  "time-series": "Time Series",
}

export function ModelCard({ name, description, category, isSelected, onClick }: ModelCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        isSelected ? "ring-2 ring-sns-orange shadow-lg" : "hover:shadow-md",
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">{name}</CardTitle>
          <Badge className={categoryColors[category]}>{categoryLabels[category]}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  )
}
