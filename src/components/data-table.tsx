"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type RowRecord = Record<string, unknown>

interface DataTableProps {
  data: Array<RowRecord>
  title?: string
}

export function DataTable({ data, title }: DataTableProps) {
  if (!data || data.length === 0) return null

  const columns = Object.keys(data[0])

  return (
    <Card className="w-full">
      {title && (
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-sns-cream/50">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">
                    {column.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-sns-cream/20"}>
                  {columns.map((column) => (
                    <td key={column} className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100">
                      {String((row as RowRecord)[column] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
