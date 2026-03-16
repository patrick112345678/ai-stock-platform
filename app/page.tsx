"use client"

import { useEffect, useState } from "react"
import TradingChart from "@/components/TradingChart"

type QuoteData = {
  symbol: string
  name: string
  exchange: string
  price: number
  change: number
  change_percent: number
}

type ChartCandle = {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

type WatchItem = {
  symbol: string
  market: "stock" | "crypto"
}

type ScannerItem = {
  symbol: string
  price: number
  change_percent: number
}

export default function Home() {
  const watchlist: WatchItem[] = [
    { symbol: "AAPL", market: "stock" },
    { symbol: "TSLA", market: "stock" },
    { symbol: "NVDA", market: "stock" },
  ]

  const [selected, setSelected] = useState<WatchItem>(watchlist[0])
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [chartData, setChartData] = useState<ChartCandle[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showChart, setShowChart] = useState(false)

  const [scanner] = useState<ScannerItem[]>([
    { symbol: "NVDA", price: 0, change_percent: 2.84 },
    { symbol: "TSLA", price: 0, change_percent: -1.42 },
    { symbol: "AAPL", price: 0, change_percent: -2.21 },
  ])

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError("")

        const quoteRes = await fetch(
          `http://localhost:8000/market/quote?symbol=${selected.symbol}&market=${selected.market}`
        )

        if (!quoteRes.ok) {
          throw new Error(`quote API 錯誤: ${quoteRes.status}`)
        }

        const quoteJson = await quoteRes.json()
        setQuote(quoteJson)

        const chartRes = await fetch(
          `http://localhost:8000/market/chart?symbol=${selected.symbol}&interval=1d&period=3mo`
        )

        if (!chartRes.ok) {
          throw new Error(`chart API 錯誤: ${chartRes.status}`)
        }

        const chartJson = await chartRes.json()
        setChartData(Array.isArray(chartJson.candles) ? chartJson.candles : [])
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : "發生錯誤")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selected])

  return (
    <div className="flex h-screen bg-black text-white">
      {/* 左側 Watchlist */}
      <div className="w-64 bg-zinc-900 p-4 border-r border-zinc-800">
        <h2 className="text-2xl font-bold mb-6">Watchlist</h2>

        <div className="space-y-3">
          {watchlist.map((item) => {
            const active =
              selected.symbol === item.symbol && selected.market === item.market

            return (
              <button
                key={`${item.market}-${item.symbol}`}
                onClick={() => setSelected(item)}
                className={`w-full text-left p-3 rounded-lg transition ${
                  active
                    ? "bg-zinc-700 border border-zinc-500"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                <div className="font-semibold">{item.symbol}</div>
                <div className="text-xs text-zinc-400">{item.market}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 中間主區 */}
      <div className="flex-1 p-6 overflow-auto">
        {error ? (
          <div className="text-red-400 text-lg">{error}</div>
        ) : (
          <>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold">
                  {quote ? `${quote.symbol} ${quote.price}` : "Loading..."}
                </h1>
                <div className="mt-2 text-zinc-400">
                  {quote?.name || "Loading company name..."}
                </div>
              </div>

              <button
                onClick={() => setShowChart((prev) => !prev)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
              >
                {showChart ? "隱藏圖表" : "顯示圖表"}
              </button>
            </div>

            {quote && (
              <div className="mt-3 grid grid-cols-2 gap-3 max-w-2xl mb-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="text-zinc-400 text-sm">Name</div>
                  <div className="text-lg font-semibold">{quote.name}</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="text-zinc-400 text-sm">Exchange</div>
                  <div className="text-lg font-semibold">{quote.exchange}</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="text-zinc-400 text-sm">Change</div>
                  <div
                    className={`text-lg font-semibold ${
                      quote.change >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {quote.change}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="text-zinc-400 text-sm">Change %</div>
                  <div
                    className={`text-lg font-semibold ${
                      quote.change_percent >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {quote.change_percent}%
                  </div>
                </div>
              </div>
            )}

            {showChart ? (
              <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 shadow-lg mb-6">
                {loading && chartData.length === 0 ? (
                  <div className="h-[520px] flex items-center justify-center text-zinc-400">
                    K 線資料載入中...
                  </div>
                ) : chartData.length > 0 ? (
                  <TradingChart data={chartData} />
                ) : (
                  <div className="h-[520px] flex items-center justify-center text-zinc-400">
                    沒有 K 線資料
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 shadow-lg mb-6 text-zinc-400">
                圖表目前已隱藏
              </div>
            )}

            {/* Scanner */}
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 shadow-lg">
              <div className="text-2xl font-bold mb-4">Scanner</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {scanner.map((item) => (
                  <div
                    key={item.symbol}
                    className="rounded-xl border border-zinc-800 bg-zinc-800 p-4"
                  >
                    <div className="text-lg font-semibold">{item.symbol}</div>
                    <div className="text-zinc-400 text-sm mt-1">Today move</div>
                    <div
                      className={`mt-2 text-xl font-bold ${
                        item.change_percent >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {item.change_percent}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 右側 AI 區 */}
      <div className="w-80 bg-zinc-900 p-4 border-l border-zinc-800">
        <h2 className="text-2xl font-bold mb-6">AI Analysis</h2>

        <div className="space-y-4">
          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-1">Symbol</div>
            <div className="font-semibold">{selected.symbol}</div>
          </div>

          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-1">Market</div>
            <div className="font-semibold">{selected.market}</div>
          </div>

          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-1">Trend</div>
            <div className="font-semibold">
              {quote
                ? quote.change_percent >= 0
                  ? "Bullish bias"
                  : "Bearish bias"
                : "Loading..."}
            </div>
          </div>

          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-1">Momentum</div>
            <div className="font-semibold">
              {quote ? `${Math.abs(quote.change_percent).toFixed(2)}% move` : "Loading..."}
            </div>
          </div>

          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-1">Risk Note</div>
            <div className="font-semibold text-sm text-zinc-300">
              先以資訊面板模式顯示，避免工作時畫面過於明顯。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}