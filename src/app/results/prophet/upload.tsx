"use client"

import React, { useState, useCallback } from "react"
import { Download, FileText, CheckCircle, UploadCloud, X } from "lucide-react"
import { useDropzone } from 'react-dropzone'

// --- Self-Contained UI Components to Resolve Import Errors ---

const Button = ({ children, onClick, className = '', disabled = false }: { children: React.ReactNode, onClick?: () => void, className?: string, disabled?: boolean }) => (
  <button onClick={onClick} className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${className}`} disabled={disabled}>
    {children}
  </button>
)

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
)

const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
)

const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
)

const DataTable = ({ data }: { data: Record<string, any>[] }) => {
  if (!data || data.length === 0) {
    return <p>No data to display.</p>;
  }
  const headers = Object.keys(data[0]);
  return (
    <div className="relative w-full overflow-auto border rounded-lg">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b bg-slate-100">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            {headers.map(header => (
              <th key={header} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              {headers.map(header => (
                <td key={`${rowIndex}-${header}`} className="p-4 align-middle">{String(row[header])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FileUploadZone = ({ onFileUpload, onFileRemove, uploadedFile, isUploading, uploadError }: any) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onFileUpload(acceptedFiles[0]);
        }
    }, [onFileUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: false,
    });

    return (
        <div>
            {!uploadedFile ? (
                <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-xl cursor-pointer text-center transition-colors ${isDragActive ? 'border-orange-500 bg-orange-50' : 'border-slate-300 hover:border-orange-400'}`}>
                    <input {...getInputProps()} />
                    <UploadCloud className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <p className="font-semibold text-slate-700">
                        {isDragActive ? "Drop the file here..." : "Drag & drop a CSV file here, or click to select"}
                    </p>
                    <p className="text-sm text-slate-500">Only *.csv files will be accepted</p>
                </div>
            ) : (
                <div className="p-4 border rounded-lg bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-green-600" />
                        <div>
                            <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                            <p className="text-sm text-gray-600">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                    </div>
                    {!isUploading && (
                        <button onClick={onFileRemove} className="p-2 rounded-full hover:bg-slate-200">
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    )}
                </div>
            )}
            {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
        </div>
    );
};


// --- Main Upload Component ---

interface UploadProps {
  onProcessingComplete: () => void;
  onProcessingFinished?: () => void;
  onProcessingError?: (message: string) => void;
}

export default function Upload({ onProcessingComplete, onProcessingFinished, onProcessingError }: UploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [forecastDays, setForecastDays] = useState<number>(30);

  const getSampleData = () => [
    { Date: "2024-01-01", UnitsSold: 150, Price: 1250.00 },
    { Date: "2024-01-02", UnitsSold: 155, Price: 1250.00 },
    { Date: "2024-01-03", UnitsSold: 148, Price: 1275.00 },
  ];

  const handleDownload = () => {
    const rows = getSampleData();
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map(h => String(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prophet_sample_dataset.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 2000);
  };

  const callProphetAPI = async (file: File) => {
    console.log('🚀 [PROPHET-FRONTEND] Starting Prophet API call');
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("forecast_days", String(forecastDays));
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);
      
      const response = await fetch("http://localhost:8000/api/prophet/forecast/", {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
        throw new Error(`API Error: ${response.status} - ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ [PROPHET-FRONTEND] API call successful. Response:', result);
      return result;
      
    } catch (error) {
      console.error('❌ [PROPHET-FRONTEND] Error calling Prophet API:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. The server is taking too long to process.');
      }
      throw error;
    }
  };

  const startProcessing = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    onProcessingComplete();
    
    try {
      const result = await callProphetAPI(file);
      
      sessionStorage.setItem('prophet_results', JSON.stringify(result));
      console.log('💾 [PROPHET-FRONTEND] Results stored in session storage.');

      setIsUploading(false);
      if (onProcessingFinished) onProcessingFinished();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setUploadError(`Processing failed: ${errorMessage}`);
      if (onProcessingError) onProcessingError(errorMessage);
    }
  };

  const handleFileUpload = (file: File) => { 
    if (!file || file.size === 0) {
      if (onProcessingError) onProcessingError('No dataset detected. Please upload a valid CSV file.');
      return;
    }
    setUploadedFile(file);
    startProcessing(file); 
  };

  const handleFileRemove = () => { 
    setUploadedFile(null);
    setUploadError(null);
  };

  return (
    <>
      <div id="dataset" className="scroll-mt-28 mt-12 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dataset Requirements</h2>
        <p className="text-gray-600">Your CSV file must contain `Date`, `UnitsSold`, and `Price` columns for the model to work correctly.</p>
      </div>

      <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur ring-1 ring-[#F3E9DC] shadow-[0_10px_30px_rgba(217,111,50,0.06)] mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#D96F32]" />
            Download Sample Dataset
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-[#F3E9DC]/50 rounded-lg mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">prophet_sample_dataset.csv</p>
                <p className="text-sm text-gray-600">{getSampleData().length} records • 3 columns • 1 KB</p>
              </div>
            </div>
            <Button onClick={handleDownload} className="bg-[#D96F32] hover:bg-[#C75D2C] text-white" disabled={isDownloaded}>
              {isDownloaded ? <><CheckCircle className="h-4 w-4 mr-2" />Downloaded</> : <><Download className="h-4 w-4 mr-2" />Download CSV</>}
            </Button>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Sample Data Preview</h3>
            <div>
              <DataTable data={getSampleData()} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-8 mb-10">
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Sales Data</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-2 mb-6">
                <label htmlFor="forecast-days" className="block text-sm font-semibold text-slate-700">
                    Forecast Period (Days)
                </label>
                <input 
                    id="forecast-days"
                    type="number" 
                    min={1} 
                    max={365} 
                    value={forecastDays} 
                    onChange={e=>setForecastDays(Number(e.target.value))} 
                    className="w-40 px-4 py-3 border-2 border-slate-300 rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-slate-700 bg-white"
                />
            </div>
            <FileUploadZone 
              onFileUpload={handleFileUpload} 
              onFileRemove={handleFileRemove} 
              uploadedFile={uploadedFile} 
              isUploading={isUploading} 
              uploadError={uploadError} 
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

