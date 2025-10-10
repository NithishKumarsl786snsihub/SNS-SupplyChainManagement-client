'use client'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { ResultsSidebar } from '@/components/sidebar'
import Upload from './upload'
import Results from './results'
import { useState } from 'react'
import type { DatasetInfo } from '@/types/api'

export default function ARIMAPage() {
  const [processingDone, setProcessingDone] = useState<boolean>(false)
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null)

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Models', href: '/models' },
    { label: 'ARIMA', current: true },
  ]

  const handleProcessingComplete = (info: DatasetInfo) => {
    setDatasetInfo(info)
    setProcessingDone(true)
  }

  const handleRunAnotherModel = () => {
    setProcessingDone(false)
    setDatasetInfo(null)
  }

  return (
    <div className="min-h-screen bg-sns-cream/20">
      {!processingDone ? (
        <>
          <ResultsSidebar />
          <div className="px-4 sm:px-6 lg:pl-[300px] lg:pr-8 py-8">
            <BreadcrumbNav items={breadcrumbItems} />
            <Upload onProcessingComplete={handleProcessingComplete} />
          </div>
        </>
      ) : (
        <Results datasetInfo={datasetInfo} onRunAnotherModel={handleRunAnotherModel} />
      )}
    </div>
  )
}