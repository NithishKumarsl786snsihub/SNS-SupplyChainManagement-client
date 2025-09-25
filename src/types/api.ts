// API Response Types
export interface DatasetInfo {
  rows: number;
  columns: string[];
  date_range: {
    start: string;
    end: string;
  };
  demand_stats: {
    mean: number;
    min: number;
    max: number;
    std?: number;
  };
}

export interface ModelInfo {
  order: number[];
  seasonal_order?: number[];
  exog_features?: string[];
  aic?: number;
  bic?: number;
}

export interface PredictionResponse {
  dates: string[];
  predictions: number[];
  confidence_intervals?: {
    lower: number[];
    upper: number[];
  };
  model_summary?: string;
  exog_features_used?: string[];
}

export interface OptimizationResult {
  price: number;
  predicted_demand: number;
  revenue: number;
  profit: number;
  margin: number;
}

export interface PriceOptimizationResponse {
  optimization_results: OptimizationResult[];
  best_price?: OptimizationResult;
}

export interface ScenarioResponse {
  scenario_changes: Record<string, any>;
  predictions: PredictionResponse;
}

export interface UploadResponse {
  message: string;
  dataset_info: DatasetInfo;
  model_type: 'arima' | 'arimax'; // Add model type
}

export interface ApiError {
  error: string;
}

// Component Prop Types
export interface CSVUploadProps {
  onUploadSuccess: (data: UploadResponse) => void;
}

export interface ScenarioParams {
  [key: string]: {
    type: 'multiply' | 'add' | 'set';
    value: number;
  };
}

export interface ModelDatasetInfo {
  arima: DatasetInfo | null;
  arimax: DatasetInfo | null;
}