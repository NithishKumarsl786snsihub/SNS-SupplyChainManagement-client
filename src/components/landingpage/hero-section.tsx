"use client"

import { useState, useEffect } from "react"
import { ArrowRight, Play } from "lucide-react"
import { RoundNavbar } from "@/components/landingpage/navbar"

export function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Floating navbar (pill here, full width after scroll) */}
      <div className="absolute left-0 right-0 top-10 z-50">
        <RoundNavbar />
      </div>

      {/* Background with geometric shapes */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200">
        {/* Geometric background elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-orange-200/30 rounded-lg transform rotate-12 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-orange-300/40 rounded-full animate-bounce"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-20 bg-orange-200/25 rounded-full transform -rotate-6"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-orange-300/30 rounded-lg transform rotate-45 animate-pulse"></div>
        <div className="absolute top-1/3 left-1/2 w-16 h-16 bg-orange-400/20 rounded-full transform -translate-x-1/2"></div>
        {/* Additional decorative elements */}
        <div className="absolute top-60 right-40 w-20 h-20 bg-gradient-to-br from-orange-300/30 to-orange-400/20 rounded-lg transform rotate-12"></div>
        <div className="absolute bottom-40 left-20 w-36 h-18 bg-orange-200/40 rounded-full transform rotate-3"></div>
      </div>

      {/* Main content */}

      <div className="relative z-10 max-w-6xl mx-auto text-center px-6 sm:px-8 lg:px-12">
        <div
          className={`transform transition-all duration-1000 ease-out ${
            isLoaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-orange-600 mb-6 leading-tight">
            <span className="block mb-2">Advanced Supply Chain</span>
            <span className="block bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
              Forecasting with AI
            </span>
          </h1>

          <p
            className={`text-xl md:text-2xl text-orange-800/80 mb-12 max-w-4xl mx-auto leading-relaxed transform transition-all duration-1000 delay-200 ease-out ${
              isLoaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            Transform your operations with intelligent forecasting. Predict demand, optimize inventory, and make
            data-driven decisions with confidence.
          </p>

          <div
            className={`flex flex-col sm:flex-row gap-6 justify-center items-center transform transition-all duration-1000 delay-400 ease-out ${
              isLoaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <a href="/models" className="group relative inline-flex items-center justify-center">
              <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 blur opacity-30 group-hover:opacity-50 transition" />
              <span className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transform hover:scale-105 transition-all duration-300 ease-out">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </a>

            <a
              href="#features"
              className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-orange-700 bg-white/60 backdrop-blur-sm border border-orange-200 rounded-lg hover:bg-white/80 hover:border-orange-300 transform hover:scale-105 transition-all duration-300 ease-out shadow-lg"
            >
              <Play className="mr-2 h-5 w-5" />
              Learn More
            </a>
          </div>
        </div>

        {/* Floating elements for visual interest */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-orange-300/20 to-orange-400/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-gradient-to-tl from-orange-400/15 to-orange-300/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-orange-400/60 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-orange-400 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
      `}</style>
    </section>
  )
}
