import React, { useEffect, useMemo, useState } from "react"

interface LoaderSpinnerProps {
  fullscreen?: boolean
  size?: "sm" | "md" | "lg"
  message?: string
  // Stepper options (when used as processing page)
  showStepper?: boolean
  steps?: string[]
  // Controlled step (0-based). When provided, overrides internal auto-advance.
  step?: number
  autoAdvance?: boolean
  durationPerStepMs?: number
  onComplete?: () => void
  background?: string
}

// Unified animated squares loader with optional stepper
export const LoaderSpinner: React.FC<LoaderSpinnerProps> = ({
  fullscreen = false,
  size = "md",
  message = "",
  showStepper = false,
  steps = ["File Upload", "Data Validation", "Column Analysis", "Ready for Processing"],
  step,
  autoAdvance = false,
  durationPerStepMs = 1200,
  onComplete,
  background,
}) => {
  const squareSize = size === "sm" ? 8 : size === "md" ? 12 : 16
  const gap = size === "sm" ? 2 : 3
  const squares = useMemo(() => Array.from({ length: 9 }), [])
  const [internalStep, setInternalStep] = useState(0)
  const currentStep = typeof step === 'number' ? Math.max(0, Math.min(step, steps.length - 1)) : internalStep

  useEffect(() => {
    if (!showStepper || typeof step === 'number') return
    if (!autoAdvance) return
    if (internalStep >= steps.length - 1) {
      const t = setTimeout(() => onComplete && onComplete(), 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setInternalStep((prev: number) => Math.min(prev + 1, steps.length - 1)), durationPerStepMs)
    return () => clearTimeout(t)
  }, [showStepper, autoAdvance, internalStep, steps.length, durationPerStepMs, onComplete, step])

  return (
    <div
      className={`flex items-center justify-center ${fullscreen ? "fixed inset-0 z-50" : "min-h-screen"}`}
      style={{
        backgroundColor: fullscreen ? (background || "#fdfaf6") : undefined,
        backdropFilter: fullscreen ? undefined : undefined,
      }}
    >
      <div className="flex flex-col items-center gap-8 px-4" style={{ animation: "fadeInScale 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards", opacity: 0 }}>
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl" style={{ background: "radial-gradient(circle, rgba(216, 92, 40, 0.15) 0%, transparent 70%)", filter: "blur(20px)", animation: "pulse 2s ease-in-out infinite" }} />
          <div className="relative grid grid-cols-3 p-6 rounded-2xl" style={{ gap, background: "rgba(255, 255, 255, 0.05)", backdropFilter: "blur(10px)", border: "1px solid rgba(216, 92, 40, 0.1)" }}>
            {squares.map((_, i) => (
              <span key={i} style={{ width: squareSize, height: squareSize, backgroundColor: "#d85c28", display: "inline-block", borderRadius: 3, boxShadow: "0 0 15px rgba(216, 92, 40, 0.3)", animation: `squareWave 1.2s cubic-bezier(0.45, 0, 0.55, 1) ${(i % 9) * 100}ms infinite, squareRotate 3s linear infinite` as React.CSSProperties['animation'] }} />
            ))}
          </div>
        </div>

        {message && (
          <div className="text-center space-y-2">
            <p className="text-base font-medium" style={{ color: "#1f2937", animation: "fadeIn 600ms ease-out 200ms both" }}>{message}</p>
            <div className="flex gap-1 justify-center">
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#d85c28", display: "inline-block", animation: `dotPulse 1.4s ease-in-out ${i * 200}ms infinite` }} />
              ))}
            </div>
          </div>
        )}

        {showStepper && (
          <div className="mt-4 w-full max-w-5xl px-4">
            <div className="flex items-start justify-center gap-12">
              {steps.map((label, idx) => {
                const active = idx === currentStep
                const completed = idx < currentStep
                return (
                  <div key={label} className="flex-none flex flex-col items-center text-center" style={{ animation: `fadeIn 400ms ease-out ${idx * 80}ms both`, minWidth: 160 }}>
                    <p className="text-sm font-medium" style={{ color: active || completed ? '#1f2937' : '#6b7280', transition: 'color 300ms ease', whiteSpace: 'nowrap', margin: 0 }}>{label}</p>
                    <div className="relative mt-3 flex items-center justify-center" style={{ width: 40, height: 28 }}>
                      <div className={`w-6 h-6 rounded-full ${completed || active ? 'bg-[#d85c28]' : 'bg-gray-300'}`} />
                      {completed && (
                        <svg width="16" height="16" viewBox="0 0 20 20" className="absolute" style={{ animation: 'checkmark 300ms ease-out both' }}>
                          <path d="M4 10l4 4 8-8" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <style>{`
          @keyframes squareWave { 0%, 100% { transform: scale(1) translateY(0); opacity: 0.6; } 50% { transform: scale(1.3) translateY(-8px); opacity: 1; } }
          @keyframes squareRotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes fadeInScale { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes dotPulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
          @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes checkmark { 0% { stroke-dasharray: 0 100; } 100% { stroke-dasharray: 100 100; } }
          @keyframes progressBar { 0% { width: 0%; transform: translateX(0); } 50% { width: 70%; transform: translateX(0); } 100% { width: 100%; transform: translateX(100%); } }
          @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.9); } }
          @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        `}</style>
      </div>
    </div>
  )
}

export default LoaderSpinner
