"use client"

import * as React from "react"
import Link from "next/link"

// Full-width rectangular navbar (appears after scrolling past hero / features)
export function SiteNavbar() {
  const [visible, setVisible] = React.useState(false)
  const [atTop, setAtTop] = React.useState(true)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const features = document.getElementById("features")

    // Observer to reveal when features enters viewport
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry && entry.isIntersecting) setVisible(true)
        else if (window.scrollY < 120) setVisible(false)
      },
      { root: null, threshold: 0.05 },
    )

    if (features) observer.observe(features)

    const onScroll = () => {
      const show = window.scrollY > window.innerHeight * 0.45
      setVisible(show)
      setAtTop(window.scrollY < 8)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    return () => {
      window.removeEventListener("scroll", onScroll)
      if (features) observer.unobserve(features)
      observer.disconnect()
    }
  }, [])

  const navItems = [
    { name: "Models", link: "#models" },
    { name: "Features", link: "#features" },
    { name: "Workflow", link: "#workflow" },
  ]

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-[#F3E9DC] bg-white/95 backdrop-blur-md transition-all duration-500 ease-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-6 pointer-events-none"}`}
      aria-hidden={!visible}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#D96F32] text-white text-sm font-bold">S</span>
          <span className="font-semibold text-[#C75D2C]">SNS-SCM</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((n) => (
            <a key={n.name} href={n.link} className="text-sm font-medium text-[#C75D2C] hover:text-[#D96F32] transition-colors">
              {n.name}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a href="/models" className="px-4 py-2 rounded-md bg-[#D96F32] text-white text-sm font-semibold hover:bg-[#C75D2C] transition-colors">
            Get Started
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-controls="site-mobile-menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-[#C75D2C] hover:bg-[#F3E9DC] transition-colors"
        >
          {/* Icons without importing extra libs */}
          {open ? (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          ) : (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          )}
        </button>
      </div>
      {/* subtle shadow when not at top */}
      <div className={`h-px w-full bg-transparent ${atTop ? "" : "shadow-[0_6px_20px_rgba(0,0,0,0.06)]"}`} />

      {/* Mobile menu panel */}
      <div
        id="site-mobile-menu"
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-500 ease-out ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4">
          <div className="rounded-lg border border-[#F3E9DC] bg-white/95 backdrop-blur-md p-4 shadow-sm">
            <div className="flex flex-col gap-2">
              {navItems.map((n) => (
                <a
                  key={n.name}
                  href={n.link}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded-md text-[#C75D2C] hover:bg-[#F3E9DC] transition-colors"
                >
                  {n.name}
                </a>
              ))}
              <a
                href="/models"
                onClick={() => setOpen(false)}
                className="mt-2 px-3 py-2 rounded-md bg-[#D96F32] text-white font-semibold text-sm text-center"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

// Pill-shaped hero navbar shown inside the hero section
export function RoundNavbar() {
  const [open, setOpen] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    const id = setTimeout(() => setLoaded(true), 80)
    return () => clearTimeout(id)
  }, [])

  // Match SiteNavbar items for consistent responsive behavior
  const navItems = [
    { name: "Models", link: "#models" },
    { name: "Features", link: "#features" },
    { name: "Workflow", link: "#workflow" },
  ]

  return (
    <div className="sticky top-4 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Main"
          className={`relative mx-auto flex h-14 items-center justify-between px-6 
                     bg-white/95 backdrop-blur-lg border border-[#F3E9DC] 
                     rounded-full shadow-md transition-all duration-700 ease-out 
                     ${loaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
        >
          {/* Brand */}
          <Link href="/" className={`inline-flex items-center gap-2 transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#D96F32] text-white text-sm font-bold">S</span>
            <span className="font-semibold text-[#C75D2C]">SNS-SCM</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((n, i) => (
              <a
                key={n.name}
                href={n.link}
                className={`text-sm font-medium text-[#C75D2C] hover:text-[#D96F32] transition-all duration-500 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
                style={{ transitionDelay: `${150 + i * 60}ms` }}
              >
                {n.name}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="/models"
              className={`px-4 py-2 rounded-full bg-[#D96F32] text-white text-sm font-semibold hover:bg-[#C75D2C] transition-all duration-500 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
              style={{ transitionDelay: "330ms" }}
            >
              Get Started
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-controls="round-mobile-menu"
            aria-expanded={open}
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-[#C75D2C] hover:bg-[#F3E9DC] transition-colors"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <span className="sr-only">Close</span> : <span className="sr-only">Open</span>}
            {open ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      <div
        id="round-mobile-menu"
        className={`md:hidden mt-2 overflow-hidden transition-[max-height,opacity] duration-500 ease-out ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-[#F3E9DC] bg-white/95 backdrop-blur-md p-4 shadow-md">
            <div className="flex flex-col gap-3">
              {navItems.map((n) => (
                <a
                  key={n.name}
                  href={n.link}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded-md text-[#C75D2C] hover:bg-[#F3E9DC] transition-colors"
                >
                  {n.name}
                </a>
              ))}
              <a
                href="/models"
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md bg-[#D96F32] text-white font-semibold text-center"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
