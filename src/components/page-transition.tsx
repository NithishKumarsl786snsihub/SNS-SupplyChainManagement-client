"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

type Props = {
  children: React.ReactNode
}

export default function PageTransition({ children }: Props) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(false)
    const id = setTimeout(() => setIsVisible(true), 0)
    return () => clearTimeout(id)
  }, [pathname])

  return (
    <div className={`transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}>
      {children}
    </div>
  )
}


