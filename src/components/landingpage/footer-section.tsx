"use client"

export function FooterSection() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-center">
        <p className="text-center text-gray-600 text-sm">
          <span className="font-semibold text-gray-800">Supply Chain Management</span> • © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
