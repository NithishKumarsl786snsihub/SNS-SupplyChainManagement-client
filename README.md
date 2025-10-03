# SNS-Supply Chain Management Client

A modern, AI-powered supply chain forecasting platform built with Next.js 15, React 18, and TypeScript.

## 🚀 Features

- **8 Advanced Forecasting Models**: XGBoost, LightGBM, CatBoost, Linear Regression, ARIMA, SARIMA, ARIMAX, and Prophet
- **Interactive Data Visualization**: Real-time charts and graphs using Recharts
- **Drag & Drop File Upload**: Easy CSV file upload with validation
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern UI Components**: Built with Radix UI and shadcn/ui
- **Type Safety**: Full TypeScript support

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.x
- **UI Components**: Radix UI + shadcn/ui
- **Charts**: Recharts
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Fonts**: Geist Sans & Geist Mono

## 📁 Project Structure (App Router)

```
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout (fonts, analytics)
│   ├── models/                   # Model selection + sample dataset
│   │   └── page.tsx
│   └── results/                  # Per-model results (upload-first)
│       ├── xgboost/page.tsx
│       ├── lightgbm/page.tsx
│       ├── catboost/page.tsx
│       ├── linear-regression/page.tsx
│       ├── arima/page.tsx
│       ├── sarima/page.tsx
│       ├── arimax/page.tsx
│       └── prophet/page.tsx
├── components/
│   ├── landingpage/              # Landing-specific UI
│   │   ├── hero-section.tsx
│   │   └── navbar.tsx            # Exports SiteNavbar (full) & RoundNavbar (pill)
│   ├── charts/                   # Recharts wrappers
│   │   ├── forecast-chart.tsx
│   │   └── feature-importance-chart.tsx
│   ├── data-table.tsx
│   ├── file-upload-zone.tsx
│   ├── file-preview.tsx
│   ├── upload-progress.tsx
│   ├── metric-card.tsx
│   └── breadcrumb-nav.tsx
├── hooks/
│   └── use-toast.ts
├── lib/
│   └── utils.ts
└── app/globals.css               # Tailwind + brand variables/utilities
```

## 🎨 Design System

### Color Palette (Brand)
- **SNS Cream**: `#F3E9DC` (backgrounds, soft surfaces)
- **SNS Orange**: `#D96F32` (primary)
- **SNS Orange Dark**: `#C75D2C` (primary hover/pressed)
- **SNS Yellow**: `#F8B259` (accents)

Defined in `src/app/globals.css` as CSS variables and utility classes:
```
--sns-cream: #F3E9DC;
--sns-orange: #D96F32;
--sns-orange-dark: #C75D2C;
--sns-yellow: #F8B259;

.bg-sns-cream / .bg-sns-orange / .bg-sns-orange-dark / .bg-sns-yellow
.text-sns-cream / .text-sns-orange / .text-sns-orange-dark / .text-sns-yellow
.border-sns-orange
```

### Typography
- **Primary Font**: Geist Sans
- **Monospace Font**: Geist Mono

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 📱 Pages Overview

### 1. Home Page (`/`)
- Hero section with value proposition
- Workflow explanation (4-step process)
- Feature highlights
- Navigation to model selection

### 2. Model Selection (`/models`)
- 11 forecasting models across 3 categories:
  - **Machine Learning**: XGBoost, LightGBM, CatBoost, Random Forest, Linear Regression
  - **Deep Learning**: LSTM, TFT
  - **Time Series**: ARIMA, SARIMA, ARIMAX, Prophet
- Interactive model cards with selection state

### 3. Sample Dataset (`/dataset`)
- Model-specific sample data preview
- Data requirements panel
- CSV download functionality
- Format validation guidelines

### 4. Data Upload (`/upload`)
- Drag-and-drop file upload
- Multi-step processing simulation
- Real-time progress tracking
- File preview with validation

### 5. Results Pages (`/results/[model]`)
- Model-specific performance metrics
- Interactive forecast visualizations
- Feature importance analysis
- Model parameters display
- Export functionality

## 🔧 Key Components

### Core Components
- `ModelCard`: Interactive model selection with category badges
- `ForecastChart`: Recharts-based time series visualization
- `MetricCard`: Performance metrics with trend indicators
- `FileUploadZone`: Drag-and-drop CSV upload with validation
- `DataTable`: Responsive data preview
- `BreadcrumbNav`: Navigation breadcrumbs

### Specialized Components
- `FeatureImportanceChart`: Model interpretability visualization
- `ModelParameters`: Hyperparameter display
- `UploadProgress`: Multi-step upload tracking
- `DataRequirementsPanel`: Column specifications

## 📊 Data Requirements

### Required Columns
- **Date/Period**: Time series index (DateTime)
- **Demand/Sales**: Target variable (Numeric)

### Optional Columns
- **Price**: Product price (Numeric)
- **Inventory Level**: Stock levels (Numeric)
- **Seasonal Factor**: Seasonal multiplier (Numeric)
- **Promotional**: Binary indicator (0/1)

### File Format
- CSV format with headers
- Date format: YYYY-MM-DD or MM/DD/YYYY
- Numeric values without currency symbols
- Missing values: empty or NULL

## 🎯 Performance Metrics

Each model displays:
- **Accuracy Score**: Overall model accuracy
- **MAPE**: Mean Absolute Percentage Error
- **RMSE**: Root Mean Square Error
- **Training Time**: Model training duration
- **Feature Importance**: Variable impact analysis
- **Cross-validation**: Model generalization

## 🔒 Security & Privacy

- Client-side data processing
- No persistent data storage
- File size limits (10MB)
- CSV format validation
- Mock results for demonstration

## 🚧 Development Notes

### Current Status
This is a **frontend prototype** with:
- Mock data and simulated processing
- No backend integration
- No real ML model execution
- No persistent state management

### Production Readiness
For production deployment, consider:
- Backend API integration
- Real ML model deployment
- Database for data persistence
- Authentication and user management
- Error handling and logging
- Real-time processing capabilities

## 📝 License

This project is part of the SNS-Supply Chain Management system.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions or support, please contact the development team.