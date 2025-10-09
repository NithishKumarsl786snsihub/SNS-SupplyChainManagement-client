/* eslint-disable @typescript-eslint/no-explicit-any */

export type XgbPredictionRow = {
  StoreID: string
  ProductID: string
  Date: string
  PredictedMonthlyDemand: number
}

export type XgbPriceRow = {
  month: string
  current_price: number
  upper_bound: number
  lower_bound: number
}

export interface XgbExportInput {
  predictions: XgbPredictionRow[]
  priceSeriesByKey: Record<string, XgbPriceRow[]>
}

async function dynamicImports() {
  const xlsxMod: any = await import("xlsx").catch(() => { throw new Error("Missing dependency: xlsx") })
  const JSZipMod: any = await import("jszip").catch(() => { throw new Error("Missing dependency: jszip") })
  const xlsxWrite = xlsxMod.write
  const bookNew = xlsxMod.utils?.book_new || xlsxMod.utils.book_new
  const bookAppendSheet = xlsxMod.utils?.book_append_sheet || xlsxMod.utils.book_append_sheet
  const aoaToSheet = xlsxMod.utils?.aoa_to_sheet || xlsxMod.utils.aoa_to_sheet
  const JSZip = JSZipMod.default || JSZipMod
  return { xlsxWrite, bookNew, bookAppendSheet, aoaToSheet, JSZip }
}

export async function exportXgbToZip({
  input,
  onStoreProgress,
  onProductProgress,
}: {
  input: XgbExportInput
  onStoreProgress: (current: number, total: number) => void
  onProductProgress: (current: number) => void
}): Promise<Blob> {
  const { predictions, priceSeriesByKey } = input
  const { xlsxWrite, bookNew, bookAppendSheet, aoaToSheet, JSZip } = await dynamicImports()

  // Build store -> products map
  const storeMap = new Map<string, Set<string>>()
  for (const p of predictions) {
    if (!storeMap.has(p.StoreID)) storeMap.set(p.StoreID, new Set<string>())
    storeMap.get(p.StoreID)!.add(p.ProductID)
  }
  const stores = Array.from(storeMap.entries()).map(([storeId, products]) => ({ storeId, products: Array.from(products).sort() }))

  const zip = new JSZip()
  onStoreProgress(0, stores.length)

  for (let s = 0; s < stores.length; s++) {
    const { storeId, products } = stores[s]
    const wb = bookNew()
    onProductProgress(0)

    for (let p = 0; p < products.length; p++) {
      const productId = products[p]
      const key = `${storeId}::${productId}`

      const demandRows = predictions
        .filter((r) => r.StoreID === storeId && r.ProductID === productId)
        .sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())
      const demandHeader = ["Date", "StoreID", "ProductID", "PredictedMonthlyDemand"]
      const demandData = demandRows.map((r) => [r.Date, r.StoreID, r.ProductID, r.PredictedMonthlyDemand])

      const priceRows = (priceSeriesByKey[key] || [])
        .sort((a, b) => new Date(a.month + "-01").getTime() - new Date(b.month + "-01").getTime())
      const priceHeader = ["Month", "CurrentPrice", "UpperBound", "LowerBound"]
      const priceData = priceRows.map((r) => [r.month, r.current_price, r.upper_bound, r.lower_bound])

      const sheetAoa: (string | number)[][] = []
      if (demandData.length) {
        sheetAoa.push(["Demand Forecast"])
        sheetAoa.push(demandHeader)
        sheetAoa.push(...demandData)
      }
      if (priceData.length) {
        if (sheetAoa.length) sheetAoa.push([""])
        sheetAoa.push(["Price Analysis"])
        sheetAoa.push(priceHeader)
        sheetAoa.push(...priceData)
      }
      if (!sheetAoa.length) sheetAoa.push(["No data available for this product"]) 

      const ws = aoaToSheet(sheetAoa)
      const colWidths = (sheetAoa[1] || []).map((_, ci) => ({ wch: Math.max(12, ...sheetAoa.map((row) => String(row[ci] ?? "").length + 2)) }))
      ;(ws as any)["!cols"] = colWidths
      bookAppendSheet(wb, ws, productId.slice(0, 31))
      onProductProgress(p + 1)
      await new Promise((r) => setTimeout(r, 0))
    }

    const wbOut: ArrayBuffer = xlsxWrite(wb, { type: "array", bookType: "xlsx" })
    const safeStore = storeId.replace(/[^a-zA-Z0-9_-]/g, "_")
    zip.file(`${safeStore}.xlsx`, wbOut)
    onStoreProgress(s + 1, stores.length)
    onProductProgress(0)
    await new Promise((r) => setTimeout(r, 0))
  }

  const content = await zip.generateAsync({ type: "blob" })
  return content as Blob
}


