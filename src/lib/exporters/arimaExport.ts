/* eslint-disable @typescript-eslint/no-explicit-any */

export type ArimaForecastRow = {
  date: string
  prediction: number
  lower?: number | null
  upper?: number | null
  lower_tight?: number | null
  upper_tight?: number | null
}

export interface ArimaExportInput {
  forecast: ArimaForecastRow[]
}

async function dynamicImports() {
  const xlsxMod: any = await import("xlsx").catch(() => { throw new Error("Missing dependency: xlsx") })
  const xlsxWrite = xlsxMod.write
  const bookNew = xlsxMod.utils?.book_new || xlsxMod.utils.book_new
  const bookAppendSheet = xlsxMod.utils?.book_append_sheet || xlsxMod.utils.book_append_sheet
  const aoaToSheet = xlsxMod.utils?.aoa_to_sheet || xlsxMod.utils.aoa_to_sheet
  return { xlsxWrite, bookNew, bookAppendSheet, aoaToSheet }
}

export async function exportArimaToXlsx({
  input,
  onStoreProgress,
  onProductProgress,
}: {
  input: ArimaExportInput
  onStoreProgress: (current: number, total: number) => void
  onProductProgress: (current: number) => void
}): Promise<Blob> {
  const { forecast } = input
  const { xlsxWrite, bookNew, bookAppendSheet, aoaToSheet } = await dynamicImports()

  onStoreProgress(0, 1)
  onProductProgress(0)

  const wb = bookNew()

  const header = [
    "Date",
    "Prediction",
    "Lower",
    "Upper",
    "LowerTight",
    "UpperTight",
  ]
  const data = forecast.map((r) => [
    r.date,
    r.prediction,
    r.lower ?? "",
    r.upper ?? "",
    r.lower_tight ?? "",
    r.upper_tight ?? "",
  ])

  const sheetAoa: (string | number)[][] = []
  sheetAoa.push(["ARIMA Forecast"])
  sheetAoa.push(header)
  if (data.length) sheetAoa.push(...data)

  const ws = aoaToSheet(sheetAoa)
  const colWidths = (sheetAoa[1] || []).map((_, ci) => ({ wch: Math.max(12, ...sheetAoa.map((row) => String(row[ci] ?? "").length + 2)) }))
  ;(ws as any)["!cols"] = colWidths
  bookAppendSheet(wb, ws, "Forecast")

  onProductProgress(1)
  onStoreProgress(1, 1)

  const wbOut: ArrayBuffer = xlsxWrite(wb, { type: "array", bookType: "xlsx" })
  return new Blob([wbOut], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}


