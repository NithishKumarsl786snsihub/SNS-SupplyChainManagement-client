"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const items = [
  { name: "XGBoost", slug: "xgboost" },
  { name: "LightGBM", slug: "lightgbm" },
  { name: "CatBoost", slug: "catboost" },
  { name: "Random Forest", slug: "random-forest" },
  { name: "Linear Regression", slug: "linear-regression" },
  { name: "LSTM", slug: "lstm" },
  { name: "TFT", slug: "tft" },
  { name: "ARIMA", slug: "arima" },
  { name: "SARIMA", slug: "sarima" },
  { name: "ARIMAX", slug: "arimax" },
  { name: "Prophet", slug: "prophet" },
]

export function ResultsSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen z-40">
      {/* Glass morph + orange gradient + curves */}
      <div className="w-[270px] h-screen bg-gradient-to-br from-[#D96F32] via-[#e5874c] to-[#ae5114] bg-opacity-90 text-white rounded-r-3xl shadow-xl backdrop-blur-md border-r border-[#d96f32]/20 flex flex-col">
        <div className="px-7 py-5 border-b border-white/15 flex items-center gap-2">
          <p className="text-base font-bold tracking-widest opacity-90">Models</p>
        </div>
        <nav className="flex-1 py-7 px-4 transition-all">
          {items.map((item) => {
            const href = `/results/${item.slug}`
            const active = pathname === href
            return (
              <div key={item.slug}>
                <Link
                  href={href}
                  className={`mb-2 block rounded-xl px-5 py-3 text-base transition-all duration-200 ring-1 ring-transparent ${
                    active
                      ? "bg-white/90 text-[#D96F32] font-semibold shadow-inner ring-[#D96F32]/30 scale-105"
                      : "text-white/95 hover:bg-white/10 hover:scale-105 hover:ring-white/20"
                  }`}
                  style={{
                    boxShadow: active
                      ? "0 2px 16px 0 rgba(217, 111, 50, 0.12)"
                      : undefined
                  }}
                >
                  {item.name}
                </Link>
              </div>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
