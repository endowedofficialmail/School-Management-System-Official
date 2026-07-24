'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

interface BarcodeProps {
  value: string
  width?: number
  height?: number
  fontSize?: number
}

export default function Barcode({ value, width = 1.5, height = 40, fontSize = 12 }: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          fontSize,
          margin: 2,
          displayValue: true,
          fontOptions: 'bold',
        })
      } catch {
        // Invalid barcode value — leave empty
      }
    }
  }, [value, width, height, fontSize])

  return <svg ref={svgRef} style={{ maxWidth: '100%', height: 'auto' }} />
}
