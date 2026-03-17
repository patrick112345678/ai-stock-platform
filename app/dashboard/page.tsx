"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import TradingChart from "@/components/TradingChart"
import {
  addWatchlist,
  deleteWatchlist,
  getChart,
  getQuote,
  getWatchlist,
  clearToken,
  searchMarket,
  analyzeAI,
  getScannerOpportunities,
  getScannerLeaderboard,
  analyzeWatchlistDaily,
  type SearchItem,
  type AIAnalyzeResponse,
  type AIWatchlistDailyItem,
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
  market: "TW" | "US" | "CRYPTO"
}

export default function Home() {
  const router = useRouter()
  const [watchlistDaily, setWatchlistDaily] = useState<AIWatchlistDailyItem[]>([])
  const [loadingWatchlistDaily, setLoadingWatchlistDaily] = useState(false)
  const [scannerResult, setScannerResult] = useState<any[]>([])
  const [scanning, setScanning] = useState(false)
  const [scannerMode, setScannerMode] = useState<"opportunities" | "leaderboard">("opportunities")
  const [lang, setLang] = useState<"zh" | "en">("zh")
  const [aiData, setAiData] = useState<AIAnalyzeResponse | null>(null)
  const [checkedAuth, setCheckedAuth] = useState(false)
  const [marketPool, setMarketPool] = useState<"TW" | "US" | "CRYPTO">("US")
  const [symbolInput, setSymbolInput] = useState("AAPL")
  const [showChart, setShowChart] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [selected, setSelected] = useState<WatchItem>({
    symbol: "AAPL",
    market: "US",
  })

  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [chartData, setChartData] = useState<ChartCandle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [searchResults, setSearchResults] = useState<SearchItem[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement | null>(null)
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
    loadWatchlist()
  }, [router])
  async function runScanner(mode?: "opportunities" | "leaderboard") {
    const nextMode = mode ?? scannerMode

    try {
      setScanning(true)
      setScannerResult([])
      setError("")

      const result =
        nextMode === "opportunities"
          ? await getScannerOpportunities(marketPool, 20)
          : await getScannerLeaderboard(marketPool, "change_percent", 20)

      setScannerResult(Array.isArray(result) ? result : [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "掃描失敗")
    } finally {
      setScanning(false)
    }
  }
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
        market: (item.market || "US") as "TW" | "US" | "CRYPTO",
      }))

      setWatchlist(mapped)

      if (mapped.length > 0) {
        setSelected(mapped[0])
        setMarketPool(mapped[0].market)
        setSymbolInput(mapped[0].symbol)
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "載入 watchlist 失敗")
    }
  }
  async function runWatchlistDaily() {
    try {
      setLoadingWatchlistDaily(true)
      setError("")

      const result = await analyzeWatchlistDaily(marketPool, 20)
      setWatchlistDaily(Array.isArray(result.items) ? result.items : [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "自選股每日分析失敗")
    } finally {
      setLoadingWatchlistDaily(false)
    }
  }
  useEffect(() => {
    if (!checkedAuth) return
    runScanner(scannerMode)
  }, [checkedAuth, marketPool])

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError("")
        setAiData(null)
        const quoteJson = await getQuote(selected.symbol, selected.market)
        setQuote(quoteJson)

        const chartJson = await getChart(selected.symbol)
        setChartData(Array.isArray(chartJson.candles) ? chartJson.candles : [])

        const aiJson = await analyzeAI(selected.symbol, selected.market)
        setAiData(aiJson)
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

  useEffect(() => {
    if (!checkedAuth) return

    const keyword = symbolInput.trim()

    if (!keyword) {
      setSearchResults([])
      setShowSearchDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true)
        const items = await searchMarket(keyword, marketPool)
        setSearchResults(items)
        setShowSearchDropdown(true)


        
      } catch (err) {
        console.error("searchMarket error:", err)
        setSearchResults([])
        setShowSearchDropdown(false)
      } finally {
        setSearchLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [symbolInput, marketPool, checkedAuth])

  const filteredWatchlist = useMemo(() => {
    return watchlist.filter((w) => w.market === marketPool)
  }, [watchlist, marketPool])

  function handleSelectSearchItem(item: SearchItem) {
    setSymbolInput(item.symbol)
    setShowSearchDropdown(false)
    setSelected({
      symbol: item.symbol,
      market: item.market,
    })
    setMarketPool(item.market)
  }

  async function handleAddWatchlist() {
    try {
      const symbol = symbolInput.trim().toUpperCase()
      if (!symbol) return

      await addWatchlist(symbol, marketPool)
      await loadWatchlist()

      setSelected({ symbol, market: marketPool })
      setShowSearchDropdown(false)
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
      <div className="bg-zinc-900 p-3 border-r border-zinc-800 shrink-0 relative"style={{ width: sidebarWidth }}>
        <h2 className="text-2xl font-bold mb-6">Watchlist</h2>

        <div className="mb-4 space-y-2">      
            <div className="flex gap-2">
              <button
                onClick={() => setMarketPool("TW")}
                className={`flex-1 rounded-lg px-3 py-2 border ${
                  marketPool === "TW"
                    ? "bg-zinc-700 border-zinc-500"
                    : "bg-zinc-800 border-zinc-700"
                }`}
              >
                台股
              </button>

              <button
                onClick={() => setMarketPool("US")}
                className={`flex-1 rounded-lg px-3 py-2 border ${
                  marketPool === "US"
                    ? "bg-zinc-700 border-zinc-500"
                    : "bg-zinc-800 border-zinc-700"
                }`}
              >
                美股
              </button>

              <button
                onClick={() => setMarketPool("CRYPTO")}
                className={`flex-1 rounded-lg px-3 py-2 border ${
                  marketPool === "CRYPTO"
                    ? "bg-zinc-700 border-zinc-500"
                    : "bg-zinc-800 border-zinc-700"
                }`}
              >
                Crypto
              </button>
            </div>
          <div
            className="relative"
            ref={searchRef}
          >
            <input
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowSearchDropdown(true)
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowSearchDropdown(false), 150)
              }}
              placeholder={
                marketPool === "stock"
                  ? "搜尋股票代號或名稱"
                  : "搜尋幣種代號或名稱"
              }
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 outline-none"
            />

            {showSearchDropdown && (
              <div className="absolute z-20 top-full mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl max-h-64 overflow-y-auto">
                {searchLoading ? (
                  <div className="px-3 py-2 text-sm text-zinc-400">
                    搜尋中...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-zinc-400">
                    找不到結果
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <button
                      key={`${item.market}-${item.symbol}`}
                      type="button"
                      onClick={() => handleSelectSearchItem(item)}
                      className="w-full text-left px-3 py-2 hover:bg-zinc-800 border-b border-zinc-800 last:border-b-0"
                    >
                      <div className="font-semibold text-white">
                        {item.symbol}
                      </div>
                      <div className="text-sm text-zinc-400 truncate">
                        {item.name} · {item.exchange}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleAddWatchlist}
            className="w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2"
          >
            加入自選
          </button>
        </div>

        <div className="mt-3 max-h-[calc(100vh-220px)] overflow-y-auto space-y-1 pr-1">
          {filteredWatchlist.map((item) => {
            const active =
              selected.symbol === item.symbol && selected.market === item.market

            return (
              <div
                key={`${item.market}-${item.symbol}-${item.id ?? "x"}`}
                className={`group rounded-md border px-2 py-2 transition ${
                  active
                    ? "bg-zinc-700/80 border-zinc-500"
                    : "bg-zinc-900 border-transparent hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelected(item)
                      setSymbolInput(item.symbol)
                      setMarketPool(item.market)
                      setShowSearchDropdown(false)
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="text-sm font-semibold leading-5 truncate">
                      {item.symbol}
                    </div>
                    <div className="text-[11px] text-zinc-400 leading-4 uppercase">
                      {item.market}
                    </div>
                  </button>

                  <button
                    onClick={() => handleDeleteWatchlist(item)}
                    className="text-[11px] text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0"
                    title="移除"
                  >
                    刪除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMarketPool("TW")}
            className={`flex-1 rounded-md px-3 py-2 text-sm border ${
              marketPool === "TW"
                ? "bg-zinc-700 border-zinc-500"
                : "bg-zinc-800 border-zinc-700 text-zinc-300"
            }`}
          >
            TW
          </button>
          <button
            onClick={() => setMarketPool("US")}
            className={`flex-1 rounded-md px-3 py-2 text-sm border ${
              marketPool === "US"
                ? "bg-zinc-700 border-zinc-500"
                : "bg-zinc-800 border-zinc-700 text-zinc-300"
            }`}
          >
            US
          </button>
          <button
            onClick={() => setMarketPool("CRYPTO")}
            className={`flex-1 rounded-md px-3 py-2 text-sm border ${
              marketPool === "CRYPTO"
                ? "bg-zinc-700 border-zinc-500"
                : "bg-zinc-800 border-zinc-700 text-zinc-300"
            }`}
          >
            CRYPTO
          </button>
        </div>
      </div>

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

            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xl font-bold">
                    {lang === "zh" ? "AI 市場掃描" : "AI Market Scanner"}
                  </div>
                  <div className="mt-6 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-800">
                      <div className="text-xl font-bold">自選股每日分析</div>
                      <div className="text-sm text-zinc-400 mt-1">
                        依照目前自選股清單批次產生 AI 分析
                      </div>
                    </div>

                    <div className="p-4">
                      {loadingWatchlistDaily ? (
                        <div className="text-sm text-zinc-400">分析中...</div>
                      ) : watchlistDaily.length === 0 ? (
                        <div className="text-sm text-zinc-400">尚未執行自選股每日分析</div>
                      ) : (
                        <div className="space-y-3">
                          {watchlistDaily.map((item) => (
                            <div
                              key={`${item.watchlist_id}-${item.symbol}`}
                              className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="font-semibold text-white">{item.symbol}</div>
                                  <div className="text-sm text-zinc-400">{item.name || "-"}</div>
                                </div>
                                <div className="text-xs uppercase text-zinc-500">{item.market}</div>
                              </div>

                              {item.error ? (
                                <div className="mt-3 text-sm text-red-400">{item.error}</div>
                              ) : (
                                <div className="mt-3 space-y-1 text-sm text-zinc-300">
                                  <div><span className="text-zinc-500">趨勢：</span>{item.ai_report?.trend || "-"}</div>
                                  <div><span className="text-zinc-500">風險：</span>{item.ai_report?.risk || "-"}</div>
                                  <div><span className="text-zinc-500">摘要：</span>{item.ai_report?.summary || item.quick_summary?.one_line || "-"}</div>
                                  <div><span className="text-zinc-500">建議：</span>{item.ai_report?.action || "-"}</div>
                                  <div><span className="text-zinc-500">信心：</span>{item.ai_report?.confidence ?? "-"}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-zinc-400 mt-1">
                    {lang === "zh"
                      ? "快速查看今日機會與市場排行"
                      : "Quickly view opportunities and rankings"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setScannerMode("opportunities")
                      runScanner("opportunities")
                    }}
                    className={`px-3 py-2 rounded-md text-sm border ${
                      scannerMode === "opportunities"
                        ? "bg-zinc-700 border-zinc-500 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300"
                    }`}
                  >
                    {lang === "zh" ? "今日機會" : "Opportunities"}
                  </button>

                  <button
                    onClick={() => {
                      setScannerMode("leaderboard")
                      runScanner("leaderboard")
                    }}
                    className={`px-3 py-2 rounded-md text-sm border ${
                      scannerMode === "leaderboard"
                        ? "bg-zinc-700 border-zinc-500 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300"
                    }`}
                  >
                    {lang === "zh" ? "排行榜" : "Leaderboard"}
                  </button>
                  <button
                    onClick={runWatchlistDaily}
                    className="px-3 py-2 rounded-md text-sm bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {loadingWatchlistDaily ? "分析中..." : "自選股每日分析"}
                  </button>
                  <button
                    onClick={() => runScanner()}
                    className="px-3 py-2 rounded-md text-sm bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {scanning
                      ? lang === "zh" ? "掃描中..." : "Scanning..."
                      : lang === "zh" ? "重新整理" : "Refresh"}
                  </button>
                </div>
              </div>

              <div className="p-4">
                {scanning ? (
                  <div className="text-sm text-zinc-400">
                    {lang === "zh" ? "資料掃描中..." : "Scanning market data..."}
                  </div>
                ) : scannerResult.length === 0 ? (
                  <div className="text-sm text-zinc-400">
                    {lang === "zh" ? "目前沒有資料" : "No data available"}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scannerResult.map((item, idx) => (
                      <div
                        key={`${item.symbol}-${idx}`}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 hover:bg-zinc-800/70 transition"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-semibold text-white">{item.symbol}</div>
                            <div className="text-sm text-zinc-400 truncate">
                              {item.name || "-"}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-semibold text-white">
                              {item.price ?? "-"}
                            </div>
                            <div
                              className={`text-sm ${
                                Number(item.change_percent) >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {item.change_percent != null ? `${item.change_percent}%` : "-"}
                            </div>
                          </div>
                        </div>

                        {item.summary && (
                          <div className="mt-2 text-sm text-zinc-300 leading-6">
                            {item.summary}
                          </div>
                        )}

                        {Array.isArray(item.signals) && item.signals.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.signals.map((sig: string, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-1 rounded-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-200"
                              >
                                {sig}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="w-80 bg-zinc-900 p-4 border-l border-zinc-800 overflow-auto">
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
              {aiData?.quick_summary?.trend || "Loading..."}
            </div>
          </div>

          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-1">Valuation</div>
            <div className="font-semibold">
              {aiData?.quick_summary?.valuation || "Loading..."}
            </div>
          </div>

          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-1">Risk</div>
            <div className="font-semibold">
              {aiData?.quick_summary?.risk || "Loading..."}
            </div>
          </div>

          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-2">One-line Summary</div>
            <div className="text-sm leading-6">
              {aiData?.quick_summary?.one_line || "Loading..."}
            </div>
          </div>

          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-2">Bullish</div>
            <div className="space-y-2">
              {aiData?.quick_summary?.bullish?.length ? (
                aiData.quick_summary.bullish.map((item, idx) => (
                  <div key={idx} className="text-sm leading-5 text-green-300">
                    • {item}
                  </div>
                ))
              ) : (
                <div className="text-sm text-zinc-400">暫無明確偏多訊號</div>
              )}
            </div>
          </div>

          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-2">Bearish / Risk</div>
            <div className="space-y-2">
              {aiData?.quick_summary?.bearish?.length ? (
                aiData.quick_summary.bearish.map((item, idx) => (
                  <div key={idx} className="text-sm leading-5 text-red-300">
                    • {item}
                  </div>
                ))
              ) : (
                <div className="text-sm text-zinc-400">暫無明確風險訊號</div>
              )}
            </div>
          </div>

          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-2">Patterns</div>
            <div className="space-y-2">
              {aiData?.quick_summary?.patterns?.length ? (
                aiData.quick_summary.patterns.map((item, idx) => (
                  <div key={idx} className="text-sm leading-5">
                    • {item}
                  </div>
                ))
              ) : (
                <div className="text-sm text-zinc-400">暫無型態訊號</div>
              )}
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