"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import TradingChart from "@/components/TradingChart"
import {
  addWatchlist,
  deleteWatchlist,
  getChart,
  getQuote,
  getWatchlist,
  clearToken,
} from "@/lib/api"

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
  id?: number | string
  symbol: string
  market: "stock" | "crypto"
}

export default function Home() {
  const router = useRouter()

  const [checkedAuth, setCheckedAuth] = useState(false)
  const [marketMode, setMarketMode] = useState<"stock" | "crypto">("stock")
  const [symbolInput, setSymbolInput] = useState("AAPL")
  const [showChart, setShowChart] = useState(false)

  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [selected, setSelected] = useState<WatchItem>({
    symbol: "AAPL",
    market: "stock",
  })

  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [chartData, setChartData] = useState<ChartCandle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // 1. 先檢查有沒有登入
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null

    if (!token) {
      router.push("/login")
      return
    }

    setCheckedAuth(true)
  }, [router])

  // 2. 載入 watchlist
  async function loadWatchlist() {
    try {
      const data = await getWatchlist()

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : []

      const mapped: WatchItem[] = items.map((item: any) => ({
        id: item.id,
        symbol: String(item.symbol).toUpperCase(),
        market: (item.market || "stock") as "stock" | "crypto",
      }))

      setWatchlist(mapped)

      if (mapped.length > 0) {
        setSelected(mapped[0])
        setMarketMode(mapped[0].market)
        setSymbolInput(mapped[0].symbol)
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "載入 watchlist 失敗")
    }
  }

  useEffect(() => {
    if (!checkedAuth) return
    loadWatchlist()
  }, [checkedAuth])

  // 3. 載入 quote / chart
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError("")

        const quoteJson = await getQuote(selected.symbol, selected.market)
        setQuote(quoteJson)

        const chartJson = await getChart(selected.symbol)
        setChartData(Array.isArray(chartJson.candles) ? chartJson.candles : [])
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : "發生錯誤")
      } finally {
        setLoading(false)
      }
    }

    if (!checkedAuth) return
    if (selected.symbol) {
      fetchData()
    }
  }, [selected, checkedAuth])

  const filteredWatchlist = useMemo(() => {
    return watchlist.filter((w) => w.market === marketMode)
  }, [watchlist, marketMode])

  async function handleAddWatchlist() {
    try {
      const symbol = symbolInput.trim().toUpperCase()
      if (!symbol) return

      await addWatchlist(symbol, marketMode)
      await loadWatchlist()

      setSelected({ symbol, market: marketMode })
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "新增失敗")
    }
  }

  async function handleDeleteWatchlist(item: WatchItem) {
    try {
      if (item.id == null) {
        setWatchlist((prev) =>
          prev.filter(
            (w) => !(w.symbol === item.symbol && w.market === item.market)
          )
        )
        return
      }

      await deleteWatchlist(item.id)
      await loadWatchlist()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "刪除失敗")
    }
  }

  if (!checkedAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        驗證登入中...
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-black text-white">
      {/* 左側 */}
      <div className="w-64 bg-zinc-900 p-4 border-r border-zinc-800">
        <h2 className="text-2xl font-bold mb-6">Watchlist</h2>

        <div className="mb-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setMarketMode("stock")}
              className={`flex-1 rounded-lg px-3 py-2 border ${
                marketMode === "stock"
                  ? "bg-zinc-700 border-zinc-500"
                  : "bg-zinc-800 border-zinc-700"
              }`}
            >
              Stock
            </button>
            <button
              onClick={() => setMarketMode("crypto")}
              className={`flex-1 rounded-lg px-3 py-2 border ${
                marketMode === "crypto"
                  ? "bg-zinc-700 border-zinc-500"
                  : "bg-zinc-800 border-zinc-700"
              }`}
            >
              Crypto
            </button>
          </div>

          <input
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
            placeholder={marketMode === "stock" ? "AAPL / TSLA" : "BTC / ETH"}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 outline-none"
          />

          <button
            onClick={handleAddWatchlist}
            className="w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2"
          >
            加入自選
          </button>
        </div>

        <div className="space-y-3">
          {filteredWatchlist.map((item) => {
            const active =
              selected.symbol === item.symbol && selected.market === item.market

            return (
              <div
                key={`${item.market}-${item.symbol}-${item.id ?? "x"}`}
                className={`rounded-lg border p-3 ${
                  active
                    ? "bg-zinc-700 border-zinc-500"
                    : "bg-zinc-800 border-zinc-700"
                }`}
              >
                <button
                  onClick={() => {
                    setSelected(item)
                    setSymbolInput(item.symbol)
                  }}
                  className="w-full text-left"
                >
                  <div className="font-semibold">{item.symbol}</div>
                  <div className="text-xs text-zinc-400">{item.market}</div>
                </button>

                <button
                  onClick={() => handleDeleteWatchlist(item)}
                  className="mt-2 text-xs text-red-400 hover:text-red-300"
                >
                  移除
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* 中間 */}
      <div className="flex-1 p-6 overflow-auto">
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

        {error ? (
          <div className="text-red-400 text-lg">{error}</div>
        ) : (
          <>
            {quote && (
              <div className="grid grid-cols-2 gap-3 max-w-2xl mb-6">
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

            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 shadow-lg">
              <div className="text-2xl font-bold mb-4">Scanner</div>
              <div className="text-zinc-400">
                下一步把你 Streamlit 的「今日機會 / 排行榜 / 選股器」搬過來
              </div>
            </div>
          </>
        )}
      </div>

      {/* 右側 */}
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
              {quote
                ? `${Math.abs(quote.change_percent).toFixed(2)}% move`
                : "Loading..."}
            </div>
          </div>

          <button
            onClick={() => {
              clearToken()
              router.push("/login")
            }}
            className="w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2"
          >
            登出
          </button>
        </div>
      </div>
    </div>
  )
}