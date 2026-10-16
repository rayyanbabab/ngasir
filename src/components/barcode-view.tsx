"use client";

import React from "react";
import { ean13ToBits } from "@/lib/barcode";

interface BarcodeViewProps {
  value: string;
  height?: number;
  showText?: boolean;
  className?: string;
}

export function BarcodeView({
  value,
  height = 50,
  showText = true,
  className = "",
}: BarcodeViewProps) {
  const bits = ean13ToBits(value);

  // If valid EAN-13, render precise 95-module SVG
  if (bits) {
    const moduleWidth = 2;
    const totalWidth = 95 * moduleWidth;

    return (
      <div className={`inline-flex flex-col items-center bg-white p-2 select-none ${className}`}>
        <svg
          viewBox={`0 0 ${totalWidth} ${height}`}
          width={totalWidth}
          height={height}
          className="overflow-visible"
        >
          {bits.split("").map((bit, idx) => {
            if (bit === "0") return null;
            // Guard bars (first 3, middle 5, last 3) are slightly longer
            const isGuard =
              idx < 3 ||
              (idx >= 45 && idx < 50) ||
              idx >= 92;
            const barHeight = isGuard ? height : height * 0.88;

            return (
              <rect
                key={idx}
                x={idx * moduleWidth}
                y={0}
                width={moduleWidth}
                height={barHeight}
                fill="#18181b"
              />
            );
          })}
        </svg>

        {showText && (
          <div className="flex justify-between w-full text-[11px] font-mono tracking-widest text-zinc-800 mt-1 px-1">
            <span>{value.slice(0, 1)}</span>
            <span>{value.slice(1, 7)}</span>
            <span>{value.slice(7, 13)}</span>
          </div>
        )}
      </div>
    );
  }

  // Fallback for non-EAN-13 barcodes: pseudo barcode SVG
  const chars = value.split("");
  const barCount = Math.max(chars.length * 5, 40);

  return (
    <div className={`inline-flex flex-col items-center bg-white p-2 select-none ${className}`}>
      <svg
        viewBox={`0 0 ${barCount * 3} ${height}`}
        width={barCount * 3}
        height={height}
        className="overflow-visible"
      >
        {Array.from({ length: barCount }).map((_, i) => {
          // Semi-random deterministic width based on char code
          const charCode = value.charCodeAt(i % value.length) || 65;
          const isThick = (charCode + i) % 3 === 0;
          const isSpace = (charCode * (i + 1)) % 4 === 0;

          if (isSpace && i > 3 && i < barCount - 3) return null;

          return (
            <rect
              key={i}
              x={i * 3}
              y={0}
              width={isThick ? 2.2 : 1.2}
              height={height * 0.9}
              fill="#18181b"
            />
          );
        })}
      </svg>

      {showText && (
        <span className="text-[11px] font-mono tracking-wider text-zinc-800 mt-1">
          {value}
        </span>
      )}
    </div>
  );
}
