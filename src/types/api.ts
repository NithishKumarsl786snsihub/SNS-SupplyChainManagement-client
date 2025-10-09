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
  llf?: number;
}

export interface PredictionResponse {
  dates: string[]
  predictions: number[]
  confidence_intervals?: {
    lower: number[]
    upper: number[]
  }
  exog_features_used: string[]
  prediction_type: string
  future_exog_used?: Record<string, number[]>
  model_summary: string
}


export interface OptimizationResult {
  price: number;
  predicted_demand: number;
  revenue: number;
  profit: number;
  margin: number;
}
export interface ConfidenceIntervals {
  demand_lower: number;
  demand_upper: number;
  profit_lower: number;
  profit_upper: number;
}

export interface MonthlyAnalysis {
  month: number;
  price: number;
  predicted_demand: number;
  revenue: number;
  profit: number;
  margin: number;
  elasticity: number;
  confidence_intervals?: ConfidenceIntervals;
}

export interface MonthlyOptimalPrices {
  month_1: MonthlyAnalysis;
  month_2: MonthlyAnalysis;
  month_3: MonthlyAnalysis;
}


export interface ElasticityThresholds {
  high_elasticity: number | null;
  low_elasticity: number | null;
  optimal_range: {
    min: number | null;
    max: number | null;
  };
}
export interface PriceOptimizationResponse {
  optimization_results: Array<{
    price: number
    predicted_demand: number
    revenue: number
    profit: number
    margin: number
    confidence_intervals?: {
      demand_lower: number
      demand_upper: number
      profit_lower: number
      profit_upper: number
    }
  }>
  best_price: {
    price: number
    predicted_demand: number
    revenue: number
    profit: number
    margin: number
    confidence_intervals?: {
      demand_lower: number
      demand_upper: number
      profit_lower: number
      profit_upper: number
    }
  } | null

    monthly_optimal_prices: MonthlyOptimalPrices;
  elasticity_analysis: ElasticityThresholds;
  best_overall_price: OptimizationResult | null;
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

