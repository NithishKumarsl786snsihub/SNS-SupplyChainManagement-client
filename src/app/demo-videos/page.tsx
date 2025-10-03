"use client"

import { useRouter } from "next/navigation"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Download, Film } from "lucide-react"

type Category = "ml" | "deep-learning" | "time-series"

const models: Array<{
  name: string
  slug: string
  category: Category
  description: string
  videoSrc: string
  poster?: string
}> = [
  { name: "XGBoost", slug: "xgboost", category: "ml", description: "Gradient boosting for structured data.", videoSrc: "/demovideos/xgboost.mp4", poster: "/demovideos/xgboost.jpg" },
  { name: "LightGBM", slug: "lightgbm", category: "ml", description: "Fast gradient boosting.", videoSrc: "/demovideos/lightgbm.mp4", poster: "/demovideos/lightgbm.jpg" },
  { name: "CatBoost", slug: "catboost", category: "ml", description: "Categorical features made easy.", videoSrc: "/demovideos/catboost.mp4", poster: "/demovideos/catboost.jpg" },
  { name: "Linear Regression", slug: "linear-regression", category: "ml", description: "Interpretable baseline model.", videoSrc: "/demovideos/linear-regression.mp4", poster: "/demovideos/linear-regression.jpg" },
  { name: "ARIMA", slug: "arima", category: "time-series", description: "Classical univariate forecasting.", videoSrc: "/demovideos/arima.mp4", poster: "/demovideos/arima.jpg" },
  { name: "SARIMA", slug: "sarima", category: "time-series", description: "Seasonal ARIMA.", videoSrc: "/demovideos/sarima.mp4", poster: "/demovideos/sarima.jpg" },
  { name: "ARIMAX", slug: "arimax", category: "time-series", description: "ARIMA with exogenous variables.", videoSrc: "/demovideos/arimax.mp4", poster: "/demovideos/arimax.jpg" },
  { name: "Prophet", slug: "prophet", category: "time-series", description: "Automatic seasonality detection.", videoSrc: "/demovideos/prophet.mp4", poster: "/demovideos/prophet.jpg" },
  { name: "VARIMA", slug: "varima", category: "time-series", description: "Multivariate ARIMA.", videoSrc: "/demovideos/varima.mp4", poster: "/demovideos/varima.jpg" },
]

const categoryBadge = (category: Category) => {
  switch (category) {
    case "ml":
      return <Badge className="bg-sns-orange text-white">Machine Learning</Badge>
    case "deep-learning":
      return <Badge className="bg-sns-orange-dark text-white">Deep Learning</Badge>
    default:
      return <Badge className="bg-sns-yellow text-gray-900">Time Series</Badge>
  }
}

export default function DemoVideosPage() {
  const router = useRouter()

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Demo Videos", current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav items={breadcrumbItems} />

        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 flex items-center gap-3">
            <Film className="h-8 w-8 text-sns-orange" /> Demo Videos
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Explore short walkthroughs for each forecasting model. Learn the workflow, inputs, and how to interpret the results.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {models.map((m) => (
            <Card key={m.slug} className="overflow-hidden border-0 bg-white/90 backdrop-blur shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl text-gray-900">{m.name}</CardTitle>
                    <div className="mt-2">{categoryBadge(m.category)}</div>
                  </div>
                  {/* <Button
                    variant="outline"
                    className="bg-transparent border-sns-orange text-sns-orange hover:bg-sns-orange hover:text-white"
                    onClick={() => router.push(`/results/${m.slug}`)}
                  >
                    Open Model <ExternalLink className="h-4 w-4 ml-2" />
                  </Button> */}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/5 ring-1 ring-[#F3E9DC]">
                  <video
                    className="w-full h-full"
                    controls
                    preload="metadata"
                    poster={m.poster}
                  >
                    <source src={m.videoSrc} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <p className="text-sm text-gray-700">{m.description}</p>
                <div className="flex items-center gap-3">
                  <Button className="bg-sns-orange hover:bg-sns-orange-dark text-white" onClick={() => router.push(`/results/${m.slug}`)}>
                    Try This Model <Play className="h-4 w-4 ml-2" />
                  </Button>
                  <a
                    href={m.videoSrc}
                    download
                    className="inline-flex items-center gap-2 text-sns-orange hover:underline"
                  >
                    <Download className="h-4 w-4" /> Download Video
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}


