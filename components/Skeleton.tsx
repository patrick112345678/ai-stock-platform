"use client"

import type { HTMLAttributes } from "react"

type SkeletonBarProps = HTMLAttributes<HTMLDivElement> & {
  /** 例如 h-4 w-24 */
  className?: string
}

/** 單條 shimmer（數字、標題補位） */
export function SkeletonBar({ className = "", ...rest }: SkeletonBarProps) {
  return (
    <div
      role="presentation"
      className={`stock-skeleton-bar rounded-md ${className}`}
      {...rest}
    />
  )
}

/** 多行文字區塊 */
export function SkeletonLines({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBar key={i} className={`h-3 ${i === rows - 1 ? "w-[80%]" : "w-full"}`} />
      ))}
    </div>
  )
}

/** 右側技術面小卡片 */
export function SkeletonTechCard({ tall = false }: { tall?: boolean }) {
  return (
    <div className="bg-zinc-800/90 rounded-xl p-4 border border-zinc-700/50">
      <SkeletonBar className="h-3 w-16 mx-auto mb-2" />
      <SkeletonBar className={`${tall ? "h-16" : "h-6"} w-full max-w-[12rem] mx-auto`} />
    </div>
  )
}

/** 基本面網格單格 */
export function SkeletonMetricCell() {
  return (
    <div>
      <SkeletonBar className="h-3 w-10 mb-2" />
      <SkeletonBar className="h-6 w-16" />
    </div>
  )
}

/** 同業表格 placeholder */
export function SkeletonPeerTableRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-zinc-800/80 pb-3">
          <SkeletonBar className="h-4 w-20" />
          <SkeletonBar className="h-4 w-24 ml-auto" />
          <SkeletonBar className="h-4 w-16" />
          <SkeletonBar className="h-4 w-14" />
        </div>
      ))}
    </div>
  )
}

/** K 線區大塊 */
export function SkeletonChartBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden ${className}`}
      role="status"
      aria-label="載入圖表"
    >
      <SkeletonBar className="h-[520px] w-full rounded-none" />
    </div>
  )
}
