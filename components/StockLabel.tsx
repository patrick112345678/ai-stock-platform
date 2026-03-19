"use client"

/**
 * 統一顯示股票標籤：台股「中文名 (代號)」，美股/加密維持「代號」或「名稱 (代號)」
 */
type MarketPool = "TW" | "US" | "CRYPTO"

export function formatStockLabel(
  symbol: string,
  name?: string | null,
  market?: MarketPool
): string {
  const s = String(symbol ?? "").trim()
  const n = name ? String(name).trim() : ""
  const m = market ?? "US"

  if (!s) return "-"

  if (m === "TW") {
    // 台股：優先顯示中文名 (代號)
    if (n) return `${n} (${s})`
    return s
  }

  if (m === "US") {
    // 美股：有 name 時顯示 name (symbol)，否則只顯示 symbol
    if (n && n !== s) return `${n} (${s})`
    return s
  }

  // CRYPTO
  if (n && n !== s) return `${n} (${s})`
  return s
}

type StockLabelProps = {
  symbol: string
  name?: string | null
  market?: MarketPool
  className?: string
  /** 是否只顯示主標題（中文名/名稱），代號放副標 */
  showSymbolAsSub?: boolean
}

export function StockLabel({
  symbol,
  name,
  market = "US",
  className = "",
  showSymbolAsSub = false,
}: StockLabelProps) {
  const label = formatStockLabel(symbol, name, market)

  if (showSymbolAsSub && name && market === "TW") {
    return (
      <span className={className}>
        <span className="font-semibold">{name}</span>
        <span className="ml-1.5 text-zinc-400 text-sm">({symbol})</span>
      </span>
    )
  }

  return <span className={className}>{label}</span>
}
