import React, { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  className?: string
}

export const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return <div className={`p-4 rounded-xl bg-white shadow ${className}`}>{children}</div>
}

export const CardHeader: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <div className="mb-2">{children}</div>
}

export const CardTitle: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <h2 className="text-lg font-bold">{children}</h2>
}

export const CardContent: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <div>{children}</div>
}
