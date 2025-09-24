"use client"

import { ChevronRight } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
          {item.href && !item.current ? (
            <a href={item.href} className="hover:text-sns-orange transition-colors">
              {item.label}
            </a>
          ) : (
            <span className={item.current ? "text-sns-orange font-medium" : ""}>{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
