"use client"

import { useState, useEffect } from "react"
import { ArrowRight, Play, Package, Truck, BarChart3, Target, TrendingUp, Boxes } from "lucide-react"
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

      {/* Background with supply chain themed elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200">
        
        {/* Supply Chain Flow Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 1200 800">
          <defs>
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.3"/>
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.3"/>
            </linearGradient>
          </defs>
          <path d="M100,200 Q300,150 500,200 T900,180 L1100,160" stroke="url(#flowGradient)" strokeWidth="3" fill="none" className="animate-pulse"/>
          <path d="M150,400 Q400,350 600,400 T950,380 L1150,360" stroke="url(#flowGradient)" strokeWidth="3" fill="none" className="animate-pulse" style={{animationDelay: '0.5s'}}/>
          <path d="M80,600 Q350,550 550,600 T850,580 L1050,560" stroke="url(#flowGradient)" strokeWidth="3" fill="none" className="animate-pulse" style={{animationDelay: '1s'}}/>
        </svg>

        {/* Floating Supply Chain Icons with Animation */}
        <div className="absolute top-24 left-16 w-16 h-16 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg animate-float" style={{animationDelay: '0s'}}>
          <Package className="w-8 h-8 text-orange-600" />
        </div>
        
        <div className="absolute top-32 right-32 w-20 h-20 bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl animate-float" style={{animationDelay: '0.5s'}}>
          <Truck className="w-10 h-10 text-orange-500" />
        </div>

        <div className="absolute bottom-40 left-24 w-18 h-18 bg-gradient-to-br from-orange-300/60 to-orange-400/40 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg animate-float" style={{animationDelay: '1s'}}>
          <BarChart3 className="w-9 h-9 text-white" />
        </div>

        <div className="absolute bottom-24 right-28 w-16 h-16 bg-white/75 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg animate-float" style={{animationDelay: '1.5s'}}>
          <Target className="w-8 h-8 text-orange-600" />
        </div>

        <div className="absolute top-1/3 left-20 w-14 h-14 bg-gradient-to-br from-orange-200/50 to-orange-300/30 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md animate-float" style={{animationDelay: '0.3s'}}>
          <TrendingUp className="w-7 h-7 text-orange-700" />
        </div>

        <div className="absolute top-1/2 right-20 w-22 h-22 bg-white/65 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-xl animate-float" style={{animationDelay: '0.8s'}}>
          <Boxes className="w-11 h-11 text-orange-500" />
        </div>

        {/* Warehouse/Factory Shapes */}
        <div className="absolute top-20 right-1/4 w-28 h-20 bg-gradient-to-r from-orange-300/25 to-orange-400/15 backdrop-blur-sm rounded-t-lg border-b-4 border-orange-300/30 animate-pulse">
          <div className="absolute top-2 left-2 w-4 h-4 bg-orange-400/40 rounded"></div>
          <div className="absolute top-2 right-2 w-4 h-4 bg-orange-400/40 rounded"></div>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-3 bg-orange-500/50 rounded-sm"></div>
        </div>

        {/* Container/Box Shapes */}
        <div className="absolute bottom-32 left-1/3 w-32 h-16 bg-gradient-to-r from-orange-200/40 to-orange-300/25 backdrop-blur-sm rounded-lg border-2 border-orange-300/20 animate-pulse" style={{animationDelay: '0.7s'}}>
          <div className="absolute inset-2 border border-dashed border-orange-400/30 rounded"></div>
        </div>

        <div className="absolute top-40 left-1/2 w-20 h-20 bg-gradient-to-br from-orange-300/30 to-orange-400/20 backdrop-blur-sm rounded-lg transform rotate-12 animate-pulse" style={{animationDelay: '1.2s'}}>
          <div className="absolute inset-2 bg-gradient-to-br from-white/20 to-transparent rounded"></div>
        </div>

        {/* Supply Chain Network Nodes */}
        <div className="absolute top-60 left-1/4 w-12 h-12 bg-orange-400/30 backdrop-blur-sm rounded-full flex items-center justify-center animate-ping" style={{animationDelay: '0.5s'}}>
          <div className="w-6 h-6 bg-orange-500/60 rounded-full"></div>
        </div>

        <div className="absolute bottom-40 right-1/4 w-10 h-10 bg-orange-300/40 backdrop-blur-sm rounded-full flex items-center justify-center animate-ping" style={{animationDelay: '1.5s'}}>
          <div className="w-4 h-4 bg-orange-600/70 rounded-full"></div>
        </div>

        {/* Inventory/Stock Indicators */}
        <div className="absolute top-1/2 left-1/4 flex space-x-1 animate-pulse" style={{animationDelay: '0.8s'}}>
          <div className="w-3 h-8 bg-orange-300/50 rounded-t"></div>
          <div className="w-3 h-12 bg-orange-400/60 rounded-t"></div>
          <div className="w-3 h-6 bg-orange-300/50 rounded-t"></div>
          <div className="w-3 h-10 bg-orange-400/60 rounded-t"></div>
        </div>

        {/* Moving Data Points */}
        <div className="absolute top-1/3 right-1/3 w-8 h-8 bg-gradient-to-br from-orange-500/40 to-orange-600/30 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}>
          <div className="absolute inset-1 bg-white/30 rounded-full"></div>
        </div>

        <div className="absolute bottom-1/3 left-1/2 w-6 h-6 bg-gradient-to-br from-orange-400/50 to-orange-500/40 rounded-full animate-bounce" style={{animationDelay: '1s'}}>
          <div className="absolute inset-1 bg-white/40 rounded-full"></div>
        </div>
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

      {/* Scroll indicator
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-orange-400/60 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-orange-400 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div> */}

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(1deg); }
          50% { transform: translateY(-5px) rotate(0deg); }
          75% { transform: translateY(-15px) rotate(-1deg); }
        }
        
        .animate-fade-in-up { 
          animation: fadeInUp 0.8s ease-out forwards; 
        }
        
        .animate-float { 
          animation: float 6s ease-in-out infinite; 
        }
      `}</style>
    </section>
  )
}