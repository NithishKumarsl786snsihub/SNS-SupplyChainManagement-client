/* eslint-disable @typescript-eslint/no-explicit-any */

export type ArimaxForecastRow = {
  date: string
  prediction: number
  lower_bound?: number | null
  upper_bound?: number | null
  lower_tight?: number | null
  upper_tight?: number | null
}

export type ArimaxPricingRow = {
  price: number
  predicted_demand: number
  profit: number
  demand_lower?: number | null
  demand_upper?: number | null
  profit_lower?: number | null
  profit_upper?: number | null
}

export interface ArimaxExportInput {
  forecast: ArimaxForecastRow[]
  pricing: ArimaxPricingRow[]
}

async function dynamicImports() {
  const xlsxMod: any = await import("xlsx").catch(() => { throw new Error("Missing dependency: xlsx") })
  const xlsxWrite = xlsxMod.write
  const bookNew = xlsxMod.utils?.book_new || xlsxMod.utils.book_new
  const bookAppendSheet = xlsxMod.utils?.book_append_sheet || xlsxMod.utils.book_append_sheet
  const aoaToSheet = xlsxMod.utils?.aoa_to_sheet || xlsxMod.utils.aoa_to_sheet
  return { xlsxWrite, bookNew, bookAppendSheet, aoaToSheet }
}

export async function exportArimaxToXlsx({
  input,
  onStoreProgress,
  onProductProgress,
}: {
  input: ArimaxExportInput
  onStoreProgress: (current: number, total: number) => void
  onProductProgress: (current: number) => void
}): Promise<Blob> {
  const { forecast, pricing } = input
  const { xlsxWrite, bookNew, bookAppendSheet, aoaToSheet } = await dynamicImports()

  onStoreProgress(0, 1)
  onProductProgress(0)

  const wb = bookNew()

  const forecastHeader = [
    "Date",
    "Prediction",
    "LowerBound",
    "UpperBound",
    "LowerTight",
    "UpperTight",
  ]
  const forecastData = forecast.map((r) => [
    r.date,
    r.prediction,
    r.lower_bound ?? "",
    r.upper_bound ?? "",
    r.lower_tight ?? "",
    r.upper_tight ?? "",
  ])
  const sheetForecast: (string | number)[][] = []
  sheetForecast.push(["ARIMAX Forecast"])
  sheetForecast.push(forecastHeader)
  if (forecastData.length) sheetForecast.push(...forecastData)
  const wsForecast = aoaToSheet(sheetForecast)
  const forecastColWidths = (sheetForecast[1] || []).map((_, ci) => ({ wch: Math.max(12, ...sheetForecast.map((row) => String(row[ci] ?? "").length + 2)) }))
  ;(wsForecast as any)["!cols"] = forecastColWidths
  bookAppendSheet(wb, wsForecast, "Forecast")

  const pricingHeader = [
    "Price",
    "PredictedDemand",
    "Profit",
    "DemandLower",
    "DemandUpper",
    "ProfitLower",
    "ProfitUpper",
  ]
  const pricingData = pricing.map((r) => [
    r.price,
    r.predicted_demand,
    r.profit,
    r.demand_lower ?? "",
    r.demand_upper ?? "",
    r.profit_lower ?? "",
    r.profit_upper ?? "",
  ])
  const sheetPricing: (string | number)[][] = []
  sheetPricing.push(["Price Analysis"])
  sheetPricing.push(pricingHeader)
  if (pricingData.length) sheetPricing.push(...pricingData)
  const wsPricing = aoaToSheet(sheetPricing)
  const pricingColWidths = (sheetPricing[1] || []).map((_, ci) => ({ wch: Math.max(12, ...sheetPricing.map((row) => String(row[ci] ?? "").length + 2)) }))
  ;(wsPricing as any)["!cols"] = pricingColWidths
  bookAppendSheet(wb, wsPricing, "Pricing")

  onProductProgress(1)
  onStoreProgress(1, 1)

  const wbOut: ArrayBuffer = xlsxWrite(wb, { type: "array", bookType: "xlsx" })
  return new Blob([wbOut], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}


