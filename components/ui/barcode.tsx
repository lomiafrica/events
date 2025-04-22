"use client"

import { useEffect, useRef } from "react"

export default function Barcode() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear canvas - REMOVED to make background transparent
    // ctx.fillStyle = "white"
    // ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw barcode with a lighter grey color
    ctx.fillStyle = "hsl(0, 0%, 70%)" // Changed from white to grey

    // Generate random barcode pattern
    let x = 0
    while (x < canvas.width) {
      // Random bar width between 1 and 4 pixels
      const barWidth = Math.floor(Math.random() * 4) + 1

      // Random decision to draw a bar or leave a gap
      if (Math.random() > 0.4) {
        ctx.fillRect(x, 0, barWidth, canvas.height)
      }

      // Move to next position with a small random gap
      x += barWidth + (Math.random() > 0.7 ? 1 : 0)
    }
  }, [])

  return (
    <div className="w-3/4 relative my-8 opacity-25 mx-auto select-none">
      <canvas ref={canvasRef} className="w-full h-26" />
      <div className="absolute top-2/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black px-4">
        <span className="text-sm tracking-widest font-medium text-white">M A D E &nbsp; I N &nbsp; B A B I</span>
      </div>
      <a
        href="https://github.com/lomiafrica/events"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute -bottom-6 right-0 text-xs text-white font-mono hover:underline">
        This website is open-source.
      </a>
    </div>
  )
}
