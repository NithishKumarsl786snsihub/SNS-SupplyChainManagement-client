"use client";
import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullscreen?: boolean;
  message?: string;
}

const LoaderSpinner: React.FC<LoaderProps> = ({ 
  size = 'md', 
  className = '', 
  fullscreen = false, 
  message = 'Loading...' 
}) => {
  const sizeClasses: Record<string, string> = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const loaderContent = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} border-2 border-[#D96F32] border-t-transparent rounded-full animate-spin`} />
      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
};

export default LoaderSpinner;
