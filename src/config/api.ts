// API Configuration for Linear Regression Backend
const API_BASE_URL = 'http://localhost:8000/api/m5'
const API_BASE_URL_M6 = 'http://localhost:8000/api/m6'

export interface DatasetUploadResponse {
  dataset_id: number
  rows: number
  columns: number
  column_names: string[]
  data_types: Record<string, string>
  sample_data: Array<Record<string, any>>
  missing_values: Record<string, number>
}

export interface TrainingResponse {
  success: boolean
  metrics?: {
    r2_score: number
    mse: number
    mae: number
    rmse: number
  }
  // Backend may return either a dict of feature->importance or an array of objects
  feature_importance?:
    | Array<{
        feature: string
        importance: number
      }>
    | Record<string, number>
  actual_vs_predicted?: {
    actual: number[]
    predicted: number[]
  }
  forecast_id?: number
  error?: string
}

export interface PredictionResponse {
  success: boolean
  predictions?: Array<{
    date: string
    predicted: number
    confidence_upper: number
    confidence_lower: number
  }>
  error?: string
}

export interface FuturePredictItem {
  index?: number
  month?: number
  date?: string
  predicted_demand: number
}

export interface FuturePredictResponse {
  success: boolean
  future_predictions?: FuturePredictItem[]
  feature_importance?: Record<string, number>
  training_metrics?: Record<string, number>
  error?: string
}

export interface PricingSimulation {
  price: number
  predicted_demand: number
  revenue: number
}

export interface PricingResponse {
  success: boolean
  optimal_price?: number
  max_revenue?: number
  current_price?: number
  current_demand?: number
  elasticity?: number
  simulations?: PricingSimulation[]
  regression_type?: string
  error?: string
}

export interface DatasetInfo {
  id: number
  name: string
  uploaded_at: string
  file_name: string
}

// API Functions
export const uploadDataset = async (file: File): Promise<DatasetUploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    const response = await fetch(`${API_BASE_URL}/upload-dataset/`, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Upload failed: ${response.statusText}`)
    }
    
    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to backend server. Please ensure the Django server is running on port 8000.')
    }
    throw error
  }
}

export const analyzeDataset = async (datasetId: number): Promise<DatasetUploadResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze-dataset/${datasetId}/`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Analysis failed: ${response.statusText}`)
    }
    
    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to backend server. Please ensure the Django server is running on port 8000.')
    }
    throw error
  }
}

export const trainModel = async (datasetId: number, targetColumn: string = 'demand'): Promise<TrainingResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/train-forecast/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataset_id: datasetId,
        target_column: targetColumn,
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Training failed: ${response.statusText}`)
    }
    
    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to backend server. Please ensure the Django server is running on port 8000.')
    }
    throw error
  }
}

export const predictFuture = async (datasetId: number, months: number = 5, targetColumn: string = 'demand'): Promise<PredictionResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/predict-future/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataset_id: datasetId,
        months: months,
        target_column: targetColumn,
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Prediction failed: ${response.statusText}`)
    }
    
    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to backend server. Please ensure the Django server is running on port 8000.')
    }
    throw error
  }
}

export const getDatasets = async (): Promise<DatasetInfo[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to fetch datasets: ${response.statusText}`)
    }
    
    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to backend server. Please ensure the Django server is running on port 8000.')
    }
    throw error
  }
}

export const predictFromFutureFile = async (
  datasetId: number,
  file: File,
  targetColumn: string = 'demand',
  dateColumn: string = 'date'
): Promise<FuturePredictResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('dataset_id', String(datasetId))
  formData.append('target_column', targetColumn)
  formData.append('date_column', dateColumn)

  try {
    const response = await fetch(`${API_BASE_URL}/predict-from-future-file/`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Future prediction failed: ${response.statusText}`)
    }
    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to backend server. Please ensure the Django server is running on port 8000.')
    }
    throw error
  }
}

// M6 (log-log) dataset upload
export const uploadDatasetM6 = async (file: File): Promise<DatasetUploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const response = await fetch(`${API_BASE_URL_M6}/upload-dataset/`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `M6 upload failed: ${response.statusText}`)
    }
    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to backend server (M6). Please ensure the Django server is running on port 8000.')
    }
    throw error
  }
}

export const optimizePricingLinear = async (
  datasetId: number,
  priceColumn: string = 'price',
  demandColumn: string = 'demand'
): Promise<PricingResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/optimize-pricing-linear/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id: datasetId, price_column: priceColumn, demand_column: demandColumn })
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Pricing (linear) failed: ${response.statusText}`)
    }
    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to backend server. Please ensure the Django server is running on port 8000.')
    }
    throw error
  }
}

export const optimizePricingLogLog = async (
  datasetId: number,
  priceColumn: string = 'price',
  demandColumn: string = 'demand'
): Promise<PricingResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL_M6}/optimize-pricing-loglog/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id: datasetId, price_column: priceColumn, demand_column: demandColumn })
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Pricing (log-log) failed: ${response.statusText}`)
    }
    return response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to backend server. Please ensure the Django server is running on port 8000.')
    }
    throw error
  }
}
