'use client'

import { useState, ChangeEvent } from 'react'
import axios from 'axios'
import { CSVUploadProps, UploadResponse, ApiError } from '@/types/api'

interface ExtendedCSVUploadProps extends CSVUploadProps {
  modelType: 'arima' | 'arimax';
}

const CSVUpload: React.FC<ExtendedCSVUploadProps> = ({ onUploadSuccess, modelType }) => {
  const [uploading, setUploading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('date_column', 'date')
    formData.append('demand_column', 'demand')

    setUploading(true)
    setError('')

    try {
      const endpoint = modelType === 'arima' 
        ? 'http://localhost:8000/api/upload-dataset-arima/'
        : 'http://localhost:8000/api/upload-dataset-arimax/'

      const response = await axios.post<UploadResponse>(
        endpoint, 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      
      onUploadSuccess(response.data)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError((err.response.data as ApiError).error || 'Upload failed')
      } else {
        setError('Upload failed')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="chart-container">
      <h2 className="text-xl font-semibold mb-4">Upload Dataset for {modelType.toUpperCase()}</h2>
      
      <div className="upload-area border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          id={`csv-upload-${modelType}`}
        />
        <label htmlFor={`csv-upload-${modelType}`} className="cursor-pointer block">
          <div className="text-gray-600">
            {uploading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2">Uploading...</span>
              </div>
            ) : (
              <>
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2">Click to upload CSV file for {modelType.toUpperCase()}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {modelType === 'arimax' ? 'Supports files with date, demand, and exogenous variables (price, ads, etc.)' : 'Supports files with date and demand columns'}
                </p>
              </>
            )}
          </div>
        </label>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  )
}

export default CSVUpload