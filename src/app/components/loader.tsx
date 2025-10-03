import React from "react"

interface LoaderSpinnerProps {
  fullscreen?: boolean
  size?: "sm" | "md" | "lg"
  message?: string
}

export const LoaderSpinner: React.FC<LoaderSpinnerProps> = ({
  fullscreen = false,
  size = "md",
  message = "",
}) => {
  const sizeClasses: Record<string, string> = {
    sm: "w-6 h-6 border-4",
    md: "w-10 h-10 border-4",
    lg: "w-16 h-16 border-8",
  }

  return (
    <div
      className={`flex items-center justify-center ${
        fullscreen ? "fixed inset-0 bg-black bg-opacity-30 z-50" : ""
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        <div
          className={`animate-spin rounded-full border-t-blue-600 border-b-gray-300 border-solid ${sizeClasses[size]}`}
        ></div>
        {message && <span className="text-gray-700">{message}</span>}
      </div>
    </div>
  )
}

export default LoaderSpinner
