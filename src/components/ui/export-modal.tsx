"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DownloadLoader } from "@/components/ui/download-loader"
import { Download, X } from "lucide-react"

export interface ExportProgress {
  storeIndex: number
  storeTotal: number
  productIndex: number
}

export interface ExportModalProps<TInput> {
  onClose: () => void
  title?: string
  subtitle?: string
  input: TInput
  // Exporter returns a Blob (zip) and supports progress callbacks
  onExport: (args: {
    input: TInput
    onStoreProgress: (current: number, total: number) => void
    onProductProgress: (current: number) => void
  }) => Promise<Blob>
  // Optional filename for the final archive
  buildFilename?: () => string
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ExportModal<TInput>({ onClose, title = "Export Results", subtitle = "Download one archive containing per-store files with per-product sheets.", input, onExport, buildFilename }: ExportModalProps<TInput>) {
  const [downloading, setDownloading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [storeProgress, setStoreProgress] = useState(0)
  const [storeTotal, setStoreTotal] = useState(0)
  const [, setProductProgress] = useState(0)

  const handleExportAll = async () => {
    setDownloading(true)
    setErrorMsg(null)
    setStoreProgress(0)
    setStoreTotal(0)
    setProductProgress(0)
    try {
      const blob = await onExport({
        input,
        onStoreProgress: (current, total) => {
          setStoreProgress(current)
          setStoreTotal(total)
        },
        onProductProgress: (current) => setProductProgress(current),
      })
      const name = buildFilename?.() || `export_${new Date().toISOString().slice(0,10)}.zip`
      triggerDownload(blob, name)
      setTimeout(onClose, 300)
    } catch {
      setErrorMsg("Export failed. Ensure required packages are installed and try again.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20">
      <div className="w-[92%] max-w-xl rounded-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.12)] border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-gray-600 text-sm">{subtitle}</p>
          </div>
          <button className="p-2 rounded-md hover:bg-gray-100" onClick={onClose} aria-label="Close" disabled={downloading}>
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content area: either actions or the contained loader */}
        {!downloading ? (
          <>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button className="bg-sns-orange hover:bg-sns-orange-dark text-white" onClick={handleExportAll}>
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>

            {errorMsg && (
              <div className="mt-4 text-sm text-red-600">
                {errorMsg} Install with: <code className="bg-red-50 px-1 py-0.5 rounded">npm i xlsx jszip</code>
              </div>
            )}
          </>
        ) : (
          <div className="pt-2">
            <DownloadLoader
              visible={true}
              message={`Exporting stores (${storeProgress}/${storeTotal || 0})...`}
              progress={storeProgress}
              totalItems={storeTotal || null}
              fullscreen={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}


