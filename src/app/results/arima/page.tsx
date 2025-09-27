'use client'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { ResultsSidebar } from '@/components/sidebar'
import Upload from './upload'
import Results from './results'
import { useState } from 'react'
import type { DatasetInfo } from '@/types/api'

// no local chart data here; charts live in Results

export default function ARIMAPage() {
  const [processingDone, setProcessingDone] = useState<boolean>(false)
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null)

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Models', href: '/models' },
    { label: 'ARIMA', current: true },
  ]

  // Upload and training/prediction are handled in child components

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {!processingDone ? (
        <>
          <ResultsSidebar />
          <div className="px-4 sm:px-6 lg:pl-[300px] lg:pr-8 py-8">
            <BreadcrumbNav items={breadcrumbItems} />
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">ARIMA</h1>
              <p className="text-gray-600">Autoregressive Integrated Moving Average</p>
            </div>
            <Upload onProcessingComplete={(info) => { setDatasetInfo(info); setProcessingDone(true) }} />
          </div>
        </>
      ) : (
        <Results datasetInfo={datasetInfo} onRunAnotherModel={() => { setProcessingDone(false); setDatasetInfo(null) }} />
      )}
    </div>
  )
}