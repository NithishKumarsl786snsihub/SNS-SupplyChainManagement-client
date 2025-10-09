"use client"

import { motion, AnimatePresence } from "framer-motion"

interface DownloadLoaderProps {
  visible: boolean
  message?: string
  progress?: number | null
  totalItems?: number | null
  fullscreen?: boolean
}

export function DownloadLoader({ visible, message = "Preparing downloads...", progress = null, totalItems = null, fullscreen = true }: DownloadLoaderProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={fullscreen ? "fixed inset-0 z-[60] flex items-center justify-center bg-white/70 backdrop-blur-sm" : "w-full"}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={fullscreen ? "w-[92%] max-w-md rounded-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.12)] border border-gray-100 p-6" : "w-full rounded-xl bg-white border border-gray-100 p-4 shadow-sm"}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sns-orange to-orange-600 flex items-center justify-center shadow-md">
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-lg font-semibold text-gray-900">Downloading</div>
            </div>

            <div className="text-sm text-gray-600 mb-4">{message}</div>

            {typeof progress === 'number' && typeof totalItems === 'number' && (
              <div className="mt-2">
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all"
                    style={{ width: `${Math.min(100, Math.round((progress / Math.max(1, totalItems)) * 100))}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {progress}/{totalItems} files
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


