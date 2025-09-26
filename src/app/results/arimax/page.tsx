'use client'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { ResultsSidebar } from '@/components/sidebar'
import Upload from './upload'
import Results from './results'
import { useState } from 'react'
import type { DatasetInfo } from '@/types/api'

export default function ARIMAXPage() {
  const [processingDone, setProcessingDone] = useState<boolean>(false)
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null)

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Models', href: '/models' },
    { label: 'ARIMAX', current: true },
  ]

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {!processingDone ? (
        <>
          <ResultsSidebar />
          <div className="px-4 sm:px-6 lg:pl-[300px] lg:pr-8 py-8">
            <BreadcrumbNav items={breadcrumbItems} />
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">ARIMAX</h1>
              <p className="text-gray-600">Advanced forecasting with external variables and price optimization</p>
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