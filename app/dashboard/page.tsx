"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react"
import TradingChart from "@/components/TradingChart"
import {
  addWatchlist,
  analyzeAI,
  clearToken,
  deleteWatchlist,
  getAIOpportunities,
  getChart,
  getMultiTimeframe,
  getQuote,
  getScannerLeaderboard,
  getScannerOpportunities,
  getScannerWatchlist,
  getSignalTable,
  getWatchlist,
  searchMarket,
  type AIAnalyzeResponse,
  type AIOpportunityItem,
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
  const [radarCollapsed, setRadarCollapsed] = useState(true)
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(true)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false)

  const [aiMode, setAiMode] = useState<"daily" | "watchlist">("daily")

  const [rightPanelWidth, setRightPanelWidth] = useState(420)
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)
  const [isDraggingRightPanel, setIsDraggingRightPanel] = useState(false)

  const [aiData, setAiData] = useState<AIAnalyzeResponse | null>(null)
  const [multiTimeframe, setMultiTimeframe] = useState<any[]>([])
  const [signalTable, setSignalTable] = useState<any[]>([])
  const [watchlistTechItems, setWatchlistTechItems] = useState<any[]>([])
  const [loadingWatchlistTech, setLoadingWatchlistTech] = useState(false)
  const [aiReportCache, setAiReportCache] = useState<Record<string, { report: any; loading?: boolean }>>({})

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (isDraggingRightPanel && !isRightPanelCollapsed) {
        const nextWidth = Math.max(280, Math.min(720, window.innerWidth - e.clientX))
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

  async function runWatchlistTech(limit = 50) {
    try {
      setLoadingWatchlistTech(true)
      setError("")

      const result = await getScannerWatchlist(marketPool, limit)
      setWatchlistTechItems(Array.isArray(result) ? result : [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "自選股技術分析載入失敗")
    } finally {
      setLoadingWatchlistTech(false)
    }
  }

  async function runSingleAiAnalysis(symbol: string, market: "TW" | "US" | "CRYPTO") {
    const key = `${symbol}-${market}`
    setAiReportCache((prev) => ({ ...prev, [key]: { ...prev[key], loading: true } }))
    try {
      const result = await analyzeAI(symbol, market, { quick_only: false })
      setAiReportCache((prev) => ({
        ...prev,
        [key]: { report: result.ai_report, loading: false },
      }))
    } catch (err) {
      console.error(err)
      setAiReportCache((prev) => ({
        ...prev,
        [key]: { report: null, loading: false },
      }))
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
      void runWatchlistTech(50)
    }
  }, [aiMode, checkedAuth, marketPool])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError("")
      setAiData(null)
      setMultiTimeframe([])
      setSignalTable([])

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

      try {
        const [mtf, sig] = await Promise.all([
          getMultiTimeframe(selected.symbol, selected.market),
          getSignalTable(selected.symbol, selected.market),
        ])
        setMultiTimeframe(Array.isArray(mtf) ? mtf : [])
        setSignalTable(Array.isArray(sig) ? sig : [])
      } catch (err) {
        console.error("multi-timeframe/signal-table error:", err)
        setMultiTimeframe([])
        setSignalTable([])
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
      : "顯示自選股技術分析，按「AI 深度分析」才呼叫 AI"

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

          <div className="flex items-center gap-3" />
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

            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-lg mb-6 overflow-hidden">
              <button
                onClick={() => setShowChart((prev) => !prev)}
                className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-zinc-800/50 transition"
              >
                {showChart ? (
                  <ChevronDown className="shrink-0 text-zinc-400" size={20} />
                ) : (
                  <ChevronRight className="shrink-0 text-zinc-400" size={20} />
                )}
                <span className="text-lg font-semibold">圖表與關鍵摘要</span>
                <span className="text-sm text-zinc-500 ml-auto">
                  {showChart ? "縮起清單" : "展開清單"}
                </span>
              </button>
              {showChart && (
                <div className="p-4 border-t border-zinc-800">
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
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-lg overflow-hidden">
                <button
                  onClick={() => setRadarCollapsed((prev) => !prev)}
                  className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-zinc-800/50 transition"
                >
                  {radarCollapsed ? (
                    <ChevronRight className="shrink-0 text-zinc-400" size={20} />
                  ) : (
                    <ChevronDown className="shrink-0 text-zinc-400" size={20} />
                  )}
                  <span className="text-lg font-semibold">即時掃描雷達</span>
                  <span className="text-sm text-zinc-500 ml-auto">
                    {radarCollapsed ? "展開清單" : "縮起清單"}
                  </span>
                </button>
                {!radarCollapsed && (
                  <div className="p-4 border-t border-zinc-800 space-y-4">
                    <div className="text-sm text-zinc-400">
                      先用明確技術條件快速掃出值得先看的名單，不消耗 AI 額度。可切換掃描雷達與自選股分析，支援分數篩選與排序。
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
                        掃描雷達
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

                    {!techListCollapsed && (
                  <div className="p-4">
                    <div className="mb-3 text-sm text-zinc-500">
                      {scannerMode === "opportunities"
                        ? `依分數由高到低排序，低於 ${techScoreMin} 分的掃描結果不顯示。`
                        : `這裡顯示自選股中的技術分析結果，並依分數排序。`}
                    </div>

                    {scanning ? (
                      <div className="text-sm text-zinc-400">資料整理中...</div>
                    ) : (scannerMode === "opportunities" ? filteredScannerResult : watchlistScannerItems).length === 0 ? (
                      <div className="text-sm text-zinc-400">
                        {scannerMode === "opportunities"
                          ? "目前沒有符合分數門檻的掃描結果"
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
                )}
              </div>

              <div className="rounded-2xl border border-violet-800/70 bg-violet-950/20 overflow-hidden">
                <button
                  onClick={() => setAiPanelCollapsed((prev) => !prev)}
                  className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-violet-900/30 transition"
                >
                  {aiPanelCollapsed ? (
                    <ChevronRight className="shrink-0 text-violet-300" size={20} />
                  ) : (
                    <ChevronDown className="shrink-0 text-violet-300" size={20} />
                  )}
                  <span className="text-lg font-semibold text-violet-200">AI 分析（Premium）</span>
                  <span className="text-sm text-zinc-500 ml-auto">
                    {aiPanelCollapsed ? "展開清單" : "縮起清單"}
                  </span>
                </button>
                {!aiPanelCollapsed && (
                <div className="border-t border-violet-900/60">
                <div className="px-5 py-4 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      if (aiMode === "daily") {
                        void runAiOpportunities(8)
                      } else {
                        void runWatchlistTech(50)
                      }
                    }}
                    className="px-3 py-2 rounded-md text-sm bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {(aiMode === "daily" ? loadingAiOpportunities : loadingWatchlistTech)
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
                      void runWatchlistTech(50)
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

                <div className="px-5 py-3 border-b border-violet-900/60 text-xs text-zinc-500">
                  {aiPanelUpdatedText}
                </div>

                <div className="p-4">
                  {(aiMode === "daily" ? loadingAiOpportunities : loadingWatchlistTech) ? (
                    <div className="text-sm text-zinc-400">載入中...</div>
                  ) : (aiMode === "daily" ? aiOpportunityItems : watchlistTechItems).length === 0 ? (
                    <div className="text-sm text-zinc-400">
                      {aiMode === "daily"
                        ? "尚未載入 AI 每日機會，按上方按鈕後才會顯示。"
                        : "目前沒有自選股技術分析結果，請先加入自選股。"}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(aiMode === "daily" ? aiOpportunityItems : watchlistTechItems).map((item: any, idx) => {
                        const cacheKey = `${item.symbol}-${item.market || marketPool}`
                        const cached = aiReportCache[cacheKey]
                        const hasAiReport = cached?.report != null
                        const aiLoading = cached?.loading === true

                        return (
                          <div
                            key={`${item.symbol}-${idx}`}
                            className="rounded-xl border border-violet-900/50 bg-zinc-950/60 px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <button
                                onClick={() =>
                                  setSelected({
                                    symbol: normalizeWatchlistSymbol(String(item.symbol ?? ""), marketPool),
                                    market: (item.market || marketPool) as "TW" | "US" | "CRYPTO",
                                  })
                                }
                                className="flex-1 text-left min-w-0"
                              >
                                <div className="font-semibold text-white">
                                  {idx + 1}. {normalizeWatchlistSymbol(String(item.symbol ?? ""), marketPool)}
                                </div>
                                <div className="text-sm text-zinc-400">{item.name || "-"}</div>
                              </button>

                              <div className="text-right shrink-0">
                                {aiMode === "watchlist" && (
                                  <div className="text-white font-semibold">
                                    {item.price != null ? item.price : "-"}
                                  </div>
                                )}
                                <div className="text-emerald-300 font-semibold">
                                  {aiMode === "daily" ? `AI 分數 ${item.score ?? "-"}` : `技術分數 ${item.score ?? "-"}`}
                                </div>
                                <div className="text-sm text-zinc-400">
                                  {item.change_pct != null
                                    ? `${item.change_pct}%`
                                    : item.change_percent != null
                                    ? `${item.change_percent}%`
                                    : "-"}
                                </div>
                                {aiMode === "watchlist" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      void runSingleAiAnalysis(
                                        normalizeWatchlistSymbol(String(item.symbol ?? ""), marketPool),
                                        (item.market || marketPool) as "TW" | "US" | "CRYPTO"
                                      )
                                    }}
                                    disabled={aiLoading}
                                    className="mt-2 px-2 py-1 rounded text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white"
                                  >
                                    {aiLoading ? "AI 分析中..." : hasAiReport ? "已分析" : "AI 深度分析"}
                                  </button>
                                )}
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
                                    <span className="text-zinc-500">技術摘要：</span>
                                    {item.summary || "-"}
                                  </div>
                                  {Array.isArray(item.signals) && item.signals.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {item.signals.map((sig: string, i: number) => (
                                        <span
                                          key={i}
                                          className="px-2 py-0.5 rounded text-xs bg-zinc-800 border border-zinc-700 text-zinc-200"
                                        >
                                          {sig}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {hasAiReport && cached?.report && (
                                    <div className="mt-2 pt-2 border-t border-violet-900/50 space-y-1">
                                      <div>
                                        <span className="text-zinc-500">AI 趨勢：</span>
                                        {cached.report.trend || "-"}
                                      </div>
                                      <div>
                                        <span className="text-zinc-500">AI 風險：</span>
                                        {cached.report.risk || "-"}
                                      </div>
                                      <div>
                                        <span className="text-zinc-500">AI 建議：</span>
                                        {cached.report.action || "-"}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div
        className={`relative shrink-0 transition-all duration-200 z-20 ${
          isRightPanelCollapsed
            ? "bg-black border-l border-transparent"
            : "bg-zinc-900 border-l border-zinc-800"
        }`}
        style={{ width: isRightPanelCollapsed ? 64 : rightPanelWidth }}
      >
        <div
          className={`flex items-center ${isRightPanelCollapsed ? "justify-center pt-4" : "mb-4 justify-between gap-2"}`}
        >
          {!isRightPanelCollapsed && <h2 className="text-2xl font-bold">技術面</h2>}

          <button
            onClick={() => setIsRightPanelCollapsed((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
            title={isRightPanelCollapsed ? "展開右側欄" : "收合右側欄"}
          >
            {isRightPanelCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
          </button>
        </div>

        {!isRightPanelCollapsed && (
          <div className="p-4 overflow-auto relative h-[calc(100vh-80px)]">

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

              {multiTimeframe.length > 0 && (
                <div className="bg-zinc-800 rounded-xl p-4">
                  <div className="text-zinc-400 text-sm mb-2">多時間框架總覽</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-zinc-400 border-b border-zinc-700">
                          <th className="text-left py-1">週期</th>
                          <th className="text-left py-1">趨勢</th>
                          <th className="text-right py-1">價格</th>
                          <th className="text-right py-1">RSI</th>
                          <th className="text-right py-1">分數</th>
                        </tr>
                      </thead>
                      <tbody>
                        {multiTimeframe.map((row: any, i: number) => (
                          <tr key={i} className="border-b border-zinc-700/50">
                            <td className="py-1.5">{row.period}</td>
                            <td className="py-1.5">{row.trend}</td>
                            <td className="text-right py-1.5">{row.price}</td>
                            <td className="text-right py-1.5">{row.rsi}</td>
                            <td className="text-right py-1.5">{row.score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {signalTable.length > 0 && (
                <div className="bg-zinc-800 rounded-xl p-4">
                  <div className="text-zinc-400 text-sm mb-2">技術訊號總表</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-zinc-400 border-b border-zinc-700">
                          <th className="text-left py-1">訊號</th>
                          <th className="text-left py-1">狀態</th>
                          <th className="text-left py-1">說明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {signalTable.map((row: any, i: number) => (
                          <tr key={i} className="border-b border-zinc-700/50">
                            <td className="py-1.5">{row.signal}</td>
                            <td className="py-1.5">{row.status}</td>
                            <td className="py-1.5 text-zinc-300">{row.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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
              className="absolute top-0 left-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-zinc-500/80 active:bg-zinc-500"
              title="拖曳調整右側欄寬度"
            />
          </div>
        )}
      </div>
    </div>
  )
}