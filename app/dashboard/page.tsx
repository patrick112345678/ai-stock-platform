"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react"
import TradingChart from "@/components/TradingChart"
import {
  addWatchlist,
  analyzeAI,
  analyzeWatchlistDaily,
  clearToken,
  deleteWatchlist,
  getAIOpportunities,
  getChart,
  getQuote,
  getScannerLeaderboard,
  getScannerOpportunities,
  getScannerWatchlist,
  getWatchlist,
  searchMarket,
  type AIAnalyzeResponse,
  type AIOpportunityItem,
  type AIWatchlistDailyItem,
  type SearchItem,
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
  name?: string | null
}

function normalizeWatchlistSymbol(symbol: string, market: WatchItem["market"]) {
  const s = String(symbol ?? "")
    .trim()
    .toUpperCase()

  if (!s) return s

  if (market === "TW") {
    // scanner 输出多半是 "2330"；若使用者存了 "2330.TW"/"2330.TWO"，要统一去掉后缀
    return s.replace(/\.TWO$/i, "").replace(/\.TW$/i, "").split(".")[0]
  }

  if (market === "US") {
    // 保守处理：优先移除常见后缀 ".US"
    if (s.endsWith(".US")) return s.slice(0, -3)

    // 部分 tickers 可能用 "-" 表示（如 BRK-B），而你的 scanner/search 多半是 "BRK.B"
    if (s.includes("-") && !s.includes(".")) return s.replace(/-/g, ".")

    // 其余情况保持原样，避免破坏 BRK.B / 多段符号匹配
    return s
  }

  // CRYPTO
  // 统一成 Bybit 交易对格式：例如 BTC -> BTCUSDT、BTC-USDT -> BTCUSDT
  const cleaned = s.replace(/[-\s]/g, "")
  if (cleaned.endsWith("USDT")) return cleaned
  return `${cleaned}USDT`
}

export default function Home() {
  const router = useRouter()

  const [aiOpportunities, setAiOpportunities] = useState<AIOpportunityItem[]>([])
  const [aiOpportunitiesUpdatedAt, setAiOpportunitiesUpdatedAt] = useState<string | null>(null)
  const [loadingAiOpportunities, setLoadingAiOpportunities] = useState(false)

  const [scannerResult, setScannerResult] = useState<any[]>([])
  const [watchlistScannerResult, setWatchlistScannerResult] = useState<any[]>([])
  const [scanning, setScanning] = useState(false)
  const [scannerMode, setScannerMode] = useState<"opportunities" | "leaderboard">("opportunities")

  const [checkedAuth, setCheckedAuth] = useState(false)
  const [marketPool, setMarketPool] = useState<"TW" | "US" | "CRYPTO">("US")
  const [scanPool, setScanPool] = useState<"TOP30" | "TOP100" | "TOP800" | "ALL">("TOP30")
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

  const [techScoreMin, setTechScoreMin] = useState(60)
  const [techListCollapsed, setTechListCollapsed] = useState(false)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false)

  const [aiMode, setAiMode] = useState<"daily" | "watchlist">("daily")

  const [rightPanelWidth, setRightPanelWidth] = useState(320)
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)
  const [isDraggingRightPanel, setIsDraggingRightPanel] = useState(false)

  const [aiData, setAiData] = useState<AIAnalyzeResponse | null>(null)
  const [watchlistAiDaily, setWatchlistAiDaily] = useState<AIWatchlistDailyItem[]>([])
  const [loadingWatchlistAiDaily, setLoadingWatchlistAiDaily] = useState(false)

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (isDraggingRightPanel && !isRightPanelCollapsed) {
        const nextWidth = Math.max(260, Math.min(520, window.innerWidth - e.clientX))
        setRightPanelWidth(nextWidth)
      }

      if (isDraggingSidebar && !isSidebarCollapsed) {
        const nextWidth = Math.max(220, Math.min(420, e.clientX))
        setSidebarWidth(nextWidth)
      }
    }

    function onMouseUp() {
      setIsDraggingRightPanel(false)
      setIsDraggingSidebar(false)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)

    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [isDraggingRightPanel, isRightPanelCollapsed, isDraggingSidebar, isSidebarCollapsed])

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null

    if (!token) {
      router.push("/login")
      return
    }

    setCheckedAuth(true)
    void loadWatchlist()
  }, [router])

  async function runScanner(mode?: "opportunities" | "leaderboard") {
    const nextMode = mode ?? scannerMode

    try {
      setScanning(true)
      setError("")
      if (nextMode === "opportunities") {
        setScannerResult([])
        const result = await getScannerOpportunities(marketPool, scanPool, 20)
        setScannerResult(Array.isArray(result) ? result : [])
      } else {
        setWatchlistScannerResult([])
        const result = await getScannerWatchlist(marketPool, 50)
        setWatchlistScannerResult(Array.isArray(result) ? result : [])
      }
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
        : Array.isArray((data as any).items)
          ? (data as any).items
          : []

      const mapped: WatchItem[] = items.map((item: any) => ({
        id: item.id,
        market: (item.market || "US") as "TW" | "US" | "CRYPTO",
        name: item.name ?? null,
      }))

      const normalizedMapped: WatchItem[] = mapped.map((w) => ({
        ...w,
        symbol: normalizeWatchlistSymbol(String(items.find((x: any) => x.id === w.id)?.symbol ?? w.symbol), w.market),
      }))

      // 如果 items.find 因为 id 缺失失败，至少兜底用原 symbol
      const finalMapped: WatchItem[] = normalizedMapped.map((w, idx) => {
        const original = items[idx]
        const originalSymbol = original ? original.symbol : w.symbol
        return {
          ...w,
          symbol: normalizeWatchlistSymbol(String(originalSymbol ?? w.symbol), w.market),
          name: original?.name ?? w.name ?? null,
        }
      })

      setWatchlist(finalMapped)

      if (finalMapped.length > 0) {
        setSelected(finalMapped[0])
        setMarketPool(finalMapped[0].market)
        setSymbolInput(finalMapped[0].symbol)
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "載入 watchlist 失敗")
    }
  }

  async function runAiOpportunities(limit = 8) {
    try {
      setLoadingAiOpportunities(true)
      setError("")

      const result = await getAIOpportunities(marketPool, limit)
      setAiOpportunities(Array.isArray(result.items) ? result.items : [])
      setAiOpportunitiesUpdatedAt(result.updated_at || null)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "AI 分析載入失敗")
    } finally {
      setLoadingAiOpportunities(false)
    }
  }

  async function runWatchlistAiDaily(limit = 20) {
    try {
      setLoadingWatchlistAiDaily(true)
      setError("")

      const result = await analyzeWatchlistDaily(marketPool, limit)
      setWatchlistAiDaily(Array.isArray(result.items) ? result.items : [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "自選股 AI 分析載入失敗")
    } finally {
      setLoadingWatchlistAiDaily(false)
    }
  }

  useEffect(() => {
    if (!checkedAuth) return
    void runScanner(scannerMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedAuth, marketPool, scanPool])

  useEffect(() => {
    if (!checkedAuth) return
    void runAiOpportunities(8)
  }, [checkedAuth, marketPool])

  useEffect(() => {
    if (!checkedAuth) return
    if (aiMode === "watchlist") {
      void runWatchlistAiDaily(30)
    }
  }, [aiMode, checkedAuth, marketPool])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError("")
      setAiData(null)

      try {
        const quoteJson = await getQuote(selected.symbol, selected.market)
        setQuote(quoteJson)
      } catch (err) {
        console.error("getQuote error:", err)
        setQuote(null)
      }

      try {
        const chartJson = await getChart(selected.symbol, selected.market)
        setChartData(Array.isArray(chartJson.candles) ? chartJson.candles : [])
      } catch (err) {
        console.error("getChart error:", err)
        setChartData([])
      }

      try {
        const aiJson = await analyzeAI(selected.symbol, selected.market)
        setAiData(aiJson)
      } catch (err) {
        console.error("analyzeAI error:", err)
        setAiData(null)
      }

      setLoading(false)
    }

    if (!checkedAuth) return
    if (selected.symbol) {
      void fetchData()
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

  const filteredScannerResult = useMemo(() => {
    return [...scannerResult]
      .map((item) => ({
        ...item,
        uiScore: Number(item.score ?? 0),
      }))
      .filter((item) => item.uiScore >= techScoreMin)
      .sort((a, b) => {
        if (b.uiScore !== a.uiScore) return b.uiScore - a.uiScore
        return String(a.symbol ?? "").localeCompare(String(b.symbol ?? ""))
      })
  }, [scannerResult, techScoreMin])

  const aiOpportunityItems = useMemo(() => {
    return [...aiOpportunities].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
  }, [aiOpportunities])

  const watchlistSymbolSet = useMemo(() => {
    return new Set(filteredWatchlist.map((item) => item.symbol.toUpperCase()))
  }, [filteredWatchlist])

  const watchlistScannerItems = useMemo(() => {
    if (scannerMode === "leaderboard") {
      return [...watchlistScannerResult]
        .map((item) => ({
          ...item,
          uiScore: Number(item.score ?? 0),
        }))
        .filter((item) => item.uiScore >= techScoreMin)
        .sort((a, b) => {
          if (b.uiScore !== a.uiScore) return b.uiScore - a.uiScore
          return String(a.symbol ?? "").localeCompare(String(b.symbol ?? ""))
        })
    }
    return filteredScannerResult.filter((item) =>
      watchlistSymbolSet.has(
        normalizeWatchlistSymbol(String(item.symbol ?? ""), marketPool).toUpperCase()
      )
    )
  }, [scannerMode, watchlistScannerResult, filteredScannerResult, watchlistSymbolSet, marketPool, techScoreMin])

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

      const normalized = normalizeWatchlistSymbol(symbol, marketPool)
      await addWatchlist(normalized, marketPool)
      await loadWatchlist()

      setSelected({ symbol: normalized, market: marketPool })
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
          prev.filter((w) => !(w.symbol === item.symbol && w.market === item.market))
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

  const aiPanelUpdatedText =
    aiMode === "daily"
      ? aiOpportunitiesUpdatedAt
        ? `更新時間：${new Date(aiOpportunitiesUpdatedAt).toLocaleString("zh-TW")}`
        : "尚未載入 AI 今日機會"
      : "顯示目前市場的自選股 AI 分析"

  if (!checkedAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        驗證登入中...
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <div
        className={`p-3 shrink-0 relative transition-all duration-200 z-20 ${
          isSidebarCollapsed
            ? "bg-black border-r border-transparent"
            : "bg-zinc-900 border-r border-zinc-800"
        }`}
        style={{ width: isSidebarCollapsed ? 64 : sidebarWidth }}
      >
        <div
          className={`mb-4 flex items-center ${
            isSidebarCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!isSidebarCollapsed && <h2 className="text-2xl font-bold"></h2>}

          <button
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
            title={isSidebarCollapsed ? "展開左側欄" : "收合左側欄"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {!isSidebarCollapsed && (
          <>
            <div className="mb-4 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setMarketPool("TW")}
                  className={`flex-1 rounded-lg px-3 py-2 border ${
                    marketPool === "TW" ? "bg-zinc-700 border-zinc-500" : "bg-zinc-800 border-zinc-700"
                  }`}
                >
                  台股
                </button>

                <button
                  onClick={() => setMarketPool("US")}
                  className={`flex-1 rounded-lg px-3 py-2 border ${
                    marketPool === "US" ? "bg-zinc-700 border-zinc-500" : "bg-zinc-800 border-zinc-700"
                  }`}
                >
                  美股
                </button>

                <button
                  onClick={() => setMarketPool("CRYPTO")}
                  className={`flex-1 rounded-lg px-3 py-2 border ${
                    marketPool === "CRYPTO" ? "bg-zinc-700 border-zinc-500" : "bg-zinc-800 border-zinc-700"
                  }`}
                >
                  Crypto
                </button>
              </div>

              <div className="relative" ref={searchRef}>
                <input
                  value={symbolInput}
                  onChange={(e) => setSymbolInput(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchDropdown(true)
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSearchDropdown(false), 150)
                  }}
                  placeholder={marketPool === "CRYPTO" ? "搜尋幣種代號或名稱" : "搜尋股票代號或名稱"}
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 outline-none"
                />

                {showSearchDropdown && (
                  <div className="absolute z-20 top-full mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl max-h-64 overflow-y-auto">
                    {searchLoading ? (
                      <div className="px-3 py-2 text-sm text-zinc-400">搜尋中...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-zinc-400">找不到結果</div>
                    ) : (
                      searchResults.map((item) => (
                        <button
                          key={`${item.market}-${item.symbol}`}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectSearchItem(item)}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-800 border-b border-zinc-800 last:border-b-0"
                        >
                          <div className="font-semibold text-white">{item.symbol}</div>
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
                const active = selected.symbol === item.symbol && selected.market === item.market

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
                        <div className="text-sm font-semibold leading-5 truncate">{item.symbol}</div>
                        <div className="text-[11px] text-zinc-400 leading-4 truncate">
                          {item.market === "TW" && item.name ? item.name : item.market}
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
          </>
        )}

        {!isSidebarCollapsed && (
          <div
            onMouseDown={() => setIsDraggingSidebar(true)}
            className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent"
          />
        )}
      </div>

      <div className="flex-1 min-w-0 p-6 overflow-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">
              {quote ? `${quote.symbol} ${quote.price}` : "Loading..."}
            </h1>
            <div className="mt-2 text-zinc-400">{quote?.name || "Loading company name..."}</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowChart((prev) => !prev)}
              className="h-12 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white"
            >
              {showChart ? "隱藏圖表" : "顯示圖表"}
            </button>

            {isRightPanelCollapsed && (
              <button
                onClick={() => setIsRightPanelCollapsed(false)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
                title="展開右側欄"
              >
                <PanelRightOpen size={18} />
              </button>
            )}
          </div>
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
                  <div className={`text-lg font-semibold ${quote.change >= 0 ? "text-green-400" : "text-red-400"}`}>
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

            <div className="space-y-6">
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-2xl font-bold">技術分析</div>
                    <div className="text-sm text-zinc-400 mt-1">
                      這裡是技術分析區，可切換每日機會與自選股分析，支援分數篩選、排序與清單收合。
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">此區塊為技術分析結果，非 AI 生成。</div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => {
                        setScannerMode("opportunities")
                        void runScanner("opportunities")
                      }}
                      className={`px-3 py-2 rounded-md text-sm border ${
                        scannerMode === "opportunities"
                          ? "bg-zinc-700 border-zinc-500 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300"
                      }`}
                    >
                      技術每日機會
                    </button>

                    <button
                      onClick={() => {
                        setScannerMode("leaderboard")
                        void runScanner("leaderboard")
                      }}
                      className={`px-3 py-2 rounded-md text-sm border ${
                        scannerMode === "leaderboard"
                          ? "bg-zinc-700 border-zinc-500 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300"
                      }`}
                    >
                      自選股分析
                    </button>

                    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                      <span className="text-sm text-zinc-400 whitespace-nowrap">最低分數</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={techScoreMin}
                        onChange={(e) => setTechScoreMin(Number(e.target.value))}
                        className="w-36 accent-emerald-500"
                      />
                      <span className="text-sm font-semibold text-white w-8 text-right">{techScoreMin}</span>
                    </div>

                    <button
                      onClick={() => setTechListCollapsed((prev) => !prev)}
                      className="px-3 py-2 rounded-md text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white"
                    >
                      {techListCollapsed ? "展開清單" : "縮起清單"}
                    </button>
                  </div>
                </div>

                {!techListCollapsed && (
                  <div className="p-4">
                    <div className="mb-3 text-sm text-zinc-500">
                      {scannerMode === "opportunities"
                        ? `依分數由高到低排序，低於 ${techScoreMin} 分的技術每日機會不顯示。`
                        : `這裡顯示自選股中的技術分析結果，並依分數排序。`}
                    </div>

                    {scanning ? (
                      <div className="text-sm text-zinc-400">資料整理中...</div>
                    ) : (scannerMode === "opportunities" ? filteredScannerResult : watchlistScannerItems).length === 0 ? (
                      <div className="text-sm text-zinc-400">
                        {scannerMode === "opportunities"
                          ? "目前沒有符合分數門檻的技術每日機會"
                          : "目前沒有符合分數門檻的自選股分析結果"}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(scannerMode === "opportunities" ? filteredScannerResult : watchlistScannerItems).map((item, idx) => (
                          <button
                            key={`${item.symbol}-${idx}`}
                            onClick={() =>
                              setSelected({
                                symbol: normalizeWatchlistSymbol(
                                  String(item.symbol ?? ""),
                                  marketPool
                                ),
                                market: marketPool,
                              })
                            }
                            className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 hover:bg-zinc-800/70 transition"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="font-semibold text-white">
                                  {idx + 1}.{" "}
                                  {normalizeWatchlistSymbol(
                                    String(item.symbol ?? ""),
                                    marketPool
                                  )}
                                </div>
                                <div className="text-sm text-zinc-400 truncate">{item.name || "-"}</div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-emerald-300 font-semibold">分數 {item.uiScore}</div>
                                <div className="text-sm text-zinc-400">
                                  {item.change_percent != null ? `${item.change_percent}%` : "-"}
                                </div>
                              </div>
                            </div>

                            {item.summary && (
                              <div className="mt-2 text-sm text-zinc-300 leading-6">{item.summary}</div>
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
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-violet-800/70 bg-violet-950/20 overflow-hidden">
                <div className="px-5 py-4 border-b border-violet-900/60 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-2xl font-bold text-violet-200">AI 分析（Premium）</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      這裡是 AI 分析區，可切換 AI 每日機會與 AI 自選股分析。
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        if (aiMode === "daily") {
                          void runAiOpportunities(8)
                        } else {
                          void runWatchlistAiDaily(30)
                        }
                      }}
                      className="px-3 py-2 rounded-md text-sm bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      {(aiMode === "daily" ? loadingAiOpportunities : loadingWatchlistAiDaily)
                        ? "整理中..."
                        : "重新整理"}
                    </button>

                    <button
                      onClick={() => {
                        setAiMode("daily")
                        void runAiOpportunities(8)
                      }}
                      className={`px-3 py-2 rounded-md text-sm border ${
                        aiMode === "daily"
                          ? "bg-violet-600 border-violet-500 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300"
                      }`}
                    >
                      AI 每日機會
                    </button>

                    <button
                      onClick={() => {
                        setAiMode("watchlist")
                        void runWatchlistAiDaily(30)
                      }}
                      className={`px-3 py-2 rounded-md text-sm border ${
                        aiMode === "watchlist"
                          ? "bg-fuchsia-600 border-fuchsia-500 text-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300"
                      }`}
                    >
                      AI 自選股分析
                    </button>
                  </div>
                </div>

                <div className="px-5 py-3 border-b border-violet-900/60 text-xs text-zinc-500">
                  {aiPanelUpdatedText}
                </div>

                <div className="p-4">
                  {(aiMode === "daily" ? loadingAiOpportunities : loadingWatchlistAiDaily) ? (
                    <div className="text-sm text-zinc-400">AI 結果載入中...</div>
                  ) : (aiMode === "daily" ? aiOpportunityItems : watchlistAiDaily).length === 0 ? (
                    <div className="text-sm text-zinc-400">
                      {aiMode === "daily"
                        ? "尚未載入 AI 每日機會，按上方按鈕後才會顯示。"
                        : "目前沒有符合條件的 AI 自選股分析結果。"}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(aiMode === "daily" ? aiOpportunityItems : watchlistAiDaily).map((item: any, idx) => (
                        <button
                          key={`${item.symbol}-${idx}`}
                          onClick={() =>
                            setSelected({
                              symbol: item.symbol,
                              market: (item.market || marketPool) as "TW" | "US" | "CRYPTO",
                            })
                          }
                          className="w-full text-left rounded-xl border border-violet-900/50 bg-zinc-950/60 px-4 py-3 hover:bg-zinc-800/70 transition"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-semibold text-white">
                                {idx + 1}. {item.symbol}
                              </div>
                              <div className="text-sm text-zinc-400">{item.name || "-"}</div>
                            </div>

                            <div className="text-right">
                              <div className="text-violet-200 font-semibold">
                                {aiMode === "daily"
                                  ? `AI 分數 ${item.score ?? "-"}`
                                  : item.ai_report?.confidence != null
                                  ? `信心 ${item.ai_report.confidence}`
                                  : "已分析"}
                              </div>
                              <div className="text-sm text-zinc-400">
                                {aiMode === "daily"
                                  ? item.change_pct != null
                                    ? `${item.change_pct}%`
                                    : "-"
                                  : item.interval || "-"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 space-y-1 text-sm text-zinc-300">
                            {aiMode === "daily" ? (
                              <>
                                <div>
                                  <span className="text-zinc-500">AI 理由：</span>
                                  {item.reason || "-"}
                                </div>
                                <div>
                                  <span className="text-zinc-500">主要風險：</span>
                                  {item.risk || "-"}
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <span className="text-zinc-500">趨勢：</span>
                                  {item.quick_summary?.trend || "-"}
                                </div>
                                <div>
                                  <span className="text-zinc-500">估值：</span>
                                  {item.quick_summary?.valuation || "-"}
                                </div>
                                <div>
                                  <span className="text-zinc-500">風險：</span>
                                  {item.quick_summary?.risk || "-"}
                                </div>
                                <div>
                                  <span className="text-zinc-500">一句話：</span>
                                  {item.quick_summary?.one_line || item.error || "-"}
                                </div>
                              </>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="relative shrink-0">
        {!isRightPanelCollapsed && (
          <div
            className="bg-zinc-900 p-4 border-l border-zinc-800 overflow-auto relative transition-all duration-200 h-full"
            style={{ width: rightPanelWidth }}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-2xl font-bold">技術面摘要</h2>

              <button
                onClick={() => setIsRightPanelCollapsed(true)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                title="收合右側欄"
              >
                <PanelRightClose size={18} />
              </button>
            </div>

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
                <div className="text-zinc-400 text-sm mb-1">技術趨勢</div>
                <div className="font-semibold">{aiData?.quick_summary?.trend || "Loading..."}</div>
              </div>

              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="text-zinc-400 text-sm mb-1">估值 / 強弱</div>
                <div className="font-semibold">{aiData?.quick_summary?.valuation || "Loading..."}</div>
              </div>

              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="text-zinc-400 text-sm mb-1">技術風險</div>
                <div className="font-semibold">{aiData?.quick_summary?.risk || "Loading..."}</div>
              </div>

              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="text-zinc-400 text-sm mb-2">一句話技術摘要</div>
                <div className="text-sm leading-6">{aiData?.quick_summary?.one_line || "Loading..."}</div>
              </div>

              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="text-zinc-400 text-sm mb-2">偏多訊號</div>
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
                <div className="text-zinc-400 text-sm mb-2">偏空 / 風險訊號</div>
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
                <div className="text-zinc-400 text-sm mb-2">技術型態</div>
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

            <div
              onMouseDown={() => setIsDraggingRightPanel(true)}
              className="absolute top-0 left-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-zinc-600/70"
            />
          </div>
        )}
      </div>
    </div>
  )
}