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
import { formatStockLabel, StockLabel } from "@/components/StockLabel"
import {
  addWatchlist,
  analyzeAI,
  checkBackendHealth,
  clearToken,
  deleteWatchlist,
  handleAuthError,
  getAIOpportunities,
  getChart,
  getDetail,
  getMultiTimeframe,
  getPeers,
  getQuote,
  getScannerLeaderboard,
  getScannerOpportunities,
  getScannerWatchlist,
  getSignalTable,
  getWatchlist,
  getWatchlistOverview,
  scanMarket,
  searchMarket,
  type AIAnalyzeResponse,
  type AIOpportunityItem,
  type DetailData,
  type PeerItem,
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
  const [scannerMode, setScannerMode] = useState<"opportunities" | "leaderboard" | "ranking">("opportunities")

  const [checkedAuth, setCheckedAuth] = useState(false)
  const [marketPool, setMarketPool] = useState<"TW" | "US" | "CRYPTO">("US")
  const [scanPool, setScanPool] = useState<"TOP30" | "TOP100" | "TOP800" | "ALL">("TOP30")
  const [symbolInput, setSymbolInput] = useState("AAPL")
  const [showChart, setShowChart] = useState(false)
  const [chartInterval, setChartInterval] = useState<"1h" | "4h" | "1d" | "1wk">("1d")

  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [watchlistOverview, setWatchlistOverview] = useState<{ id: number; symbol: string; market: string; change_percent?: number | null }[]>([])
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
  const [screenerFilterResult, setScreenerFilterResult] = useState<any[]>([])
  const [screenerFilterLoading, setScreenerFilterLoading] = useState(false)
  const [filterMinPrice, setFilterMinPrice] = useState<number | "">("")
  const [filterMaxPrice, setFilterMaxPrice] = useState<number | "">("")
  const [filterMinVolume, setFilterMinVolume] = useState<number | "">("")
  const [filterMinChangePct, setFilterMinChangePct] = useState<number | "">("")
  const [filterMaxChangePct, setFilterMaxChangePct] = useState<number | "">("")
  const [filterRsiMin, setFilterRsiMin] = useState<number | "">("")
  const [filterRsiMax, setFilterRsiMax] = useState<number | "">("")
  const [filterAboveMa20, setFilterAboveMa20] = useState(false)
  const [filterAboveMa60, setFilterAboveMa60] = useState(false)
  const [filterMacdBullish, setFilterMacdBullish] = useState(false)
  const [filterOnlyBreakout, setFilterOnlyBreakout] = useState(false)
  const [filterOnlyBull, setFilterOnlyBull] = useState(false)
  const [filterVolumeRatio30d, setFilterVolumeRatio30d] = useState(false)
  const [filterBreakout30d, setFilterBreakout30d] = useState(false)
  const [filterMacdGolden, setFilterMacdGolden] = useState(false)
  const [filterMacdDeath, setFilterMacdDeath] = useState(false)
  const [screenerDataSource, setScreenerDataSource] = useState<"live" | "cache" | null>(null)
  const [leaderboardSortDir, setLeaderboardSortDir] = useState<"gainers" | "losers">("gainers")
  const [twLeaderboardItems, setTwLeaderboardItems] = useState<any[]>([])
  const [usLeaderboardItems, setUsLeaderboardItems] = useState<any[]>([])
  const [cryptoLeaderboardItems, setCryptoLeaderboardItems] = useState<any[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
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
  const [mtfError, setMtfError] = useState<string | null>(null)
  const [sigError, setSigError] = useState<string | null>(null)
  const [watchlistTechItems, setWatchlistTechItems] = useState<any[]>([])
  const [loadingWatchlistTech, setLoadingWatchlistTech] = useState(false)
  const [aiReportCache, setAiReportCache] = useState<Record<string, { report: any; loading?: boolean }>>({})

  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [detailData, setDetailData] = useState<DetailData | null>(null)
  const [peers, setPeers] = useState<PeerItem[]>([])
  const [loadingPeers, setLoadingPeers] = useState(false)
  const [activeTab, setActiveTab] = useState<
    "overview" | "fundamental" | "ranking" | "screener" | "ai" | "crypto" | "debug"
  >("overview")

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
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
        if (!token) {
          setError("自選股分析需先登入")
          return
        }
        try {
          const result = await getScannerWatchlist(marketPool, 50)
          setWatchlistScannerResult(Array.isArray(result) ? result : [])
        } catch (watchErr: any) {
          const msg = watchErr?.message || ""
          if (msg.includes("404") || msg.includes("Not Found")) {
            setError("後端路由未載入，請從 stock-platform/backend 重啟 uvicorn")
          } else {
            setError(msg || "自選股分析載入失敗")
          }
        }
      }
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : "掃描失敗"
      setError(msg.includes("fetch") || msg.includes("404") ? "無法連線後端，請確認從 stock-platform/backend 執行 uvicorn" : msg)
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

      // 背景載入自選股漲跌幅（供左側顯示）
      getWatchlistOverview()
        .then((r: any) => setWatchlistOverview(r?.items ?? []))
        .catch(() => setWatchlistOverview([]))

      if (finalMapped.length > 0) {
        setSelected(finalMapped[0])
        setMarketPool(finalMapped[0].market)
        setSymbolInput(finalMapped[0].symbol)
      }
    } catch (err) {
      console.error(err)
      setWatchlist([])
      if (handleAuthError(err)) {
        router.push("/login?msg=登入已過期，請重新登入")
        return
      }
      setError(err instanceof Error ? err.message : "載入 watchlist 失敗")
    }
  }

  async function runAiOpportunities(limit = 8, forceRefresh = false) {
    try {
      setLoadingAiOpportunities(true)
      setError("")

      const result = await getAIOpportunities(marketPool, limit, forceRefresh)
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

  async function runLeaderboard() {
    try {
      setLeaderboardLoading(true)
      setError("")
      const res = await getScannerLeaderboard(marketPool, scanPool, "change_percent", 20, leaderboardSortDir)
      const items = Array.isArray(res) ? res : []
      setTwLeaderboardItems(marketPool === "TW" ? items : [])
      setUsLeaderboardItems(marketPool === "US" ? items : [])
      setCryptoLeaderboardItems(marketPool === "CRYPTO" ? items : [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "排行榜載入失敗")
    } finally {
      setLeaderboardLoading(false)
    }
  }

  async function runScreenerFilter() {
    try {
      setScreenerFilterLoading(true)
      setError("")
      setScreenerDataSource(null)
      const filter: Record<string, unknown> = {
        market: marketPool,
        pool: scanPool,
        limit: 50,
      }
      if (filterMinPrice !== "") filter.min_price = filterMinPrice
      if (filterMaxPrice !== "") filter.max_price = filterMaxPrice
      if (filterMinVolume !== "") filter.min_volume = filterMinVolume
      if (filterMinChangePct !== "") filter.min_change_percent = filterMinChangePct
      if (filterMaxChangePct !== "") filter.max_change_percent = filterMaxChangePct
      if (filterRsiMin !== "") filter.rsi_min = filterRsiMin
      if (filterRsiMax !== "") filter.rsi_max = filterRsiMax
      if (filterAboveMa20) filter.above_ma20 = true
      if (filterAboveMa60) filter.above_ma60 = true
      if (filterMacdBullish) filter.macd_bullish = true
      if (filterOnlyBreakout) filter.only_breakout = true
      if (filterOnlyBull) filter.only_bull = true
      if (filterVolumeRatio30d) filter.volume_ratio_30d_min = 1.5
      if (filterBreakout30d) filter.breakout_30d = true
      if (filterMacdGolden) filter.macd_golden = true
      if (filterMacdDeath) filter.macd_death = true
      const result = await scanMarket(filter)
      if (result && "error" in result) {
        setError((result as { error: string }).error)
        setScreenerFilterResult([])
        setScreenerDataSource(null)
        return
      }
      const items = (result as { items: any[] }).items ?? []
      setScreenerFilterResult(items.map((i: any) => ({ ...i, uiScore: i.score ?? 0 })))
      setScreenerDataSource((result as { source?: "live" | "cache" }).source ?? "live")
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : "選股器執行失敗"
      setError(msg.includes("fetch") || msg === "Failed to fetch" ? "無法連線後端，請確認後端已啟動 (http://127.0.0.1:8000)" : msg)
      setScreenerFilterResult([])
    } finally {
      setScreenerFilterLoading(false)
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
    checkBackendHealth().then((r) => setBackendOk(r.ok))
  }, [])

  useEffect(() => {
    if (!checkedAuth) return
    if (activeTab === "ranking") {
      void runLeaderboard()
    } else if (scannerMode !== "ranking") {
      void runScanner(scannerMode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedAuth, marketPool, scanPool, scannerMode, leaderboardSortDir, activeTab])

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
      setDetailData(null)
      setMtfError(null)
      setSigError(null)

      const [quoteResult, detailResult] = await Promise.allSettled([
        getQuote(selected.symbol, selected.market),
        getDetail(selected.symbol, selected.market),
      ])
      setQuote(quoteResult.status === "fulfilled" ? quoteResult.value : null)
      setDetailData(detailResult.status === "fulfilled" ? detailResult.value : null)
      if (quoteResult.status === "rejected") console.warn("getQuote:", quoteResult.reason?.message)
      if (detailResult.status === "rejected") console.warn("getDetail:", detailResult.reason?.message)

      try {
        const chartJson = await getChart(selected.symbol, selected.market, chartInterval)
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

      const [mtfResult, sigResult] = await Promise.allSettled([
        getMultiTimeframe(selected.symbol, selected.market),
        getSignalTable(selected.symbol, selected.market),
      ])
      setMultiTimeframe(mtfResult.status === "fulfilled" && Array.isArray(mtfResult.value) ? mtfResult.value : [])
      setSignalTable(sigResult.status === "fulfilled" && Array.isArray(sigResult.value) ? sigResult.value : [])
      setMtfError(mtfResult.status === "rejected" ? (mtfResult.reason?.message ?? "未知錯誤") : null)
      setSigError(sigResult.status === "rejected" ? (sigResult.reason?.message ?? "未知錯誤") : null)

      setLoading(false)
    }

    if (!checkedAuth) return
    if (selected.symbol) {
      void fetchData()
    }
  }, [selected, checkedAuth, chartInterval])

  useEffect(() => {
    if (activeTab !== "fundamental" || (selected.market !== "TW" && selected.market !== "US")) return
    setLoadingPeers(true)
    getPeers(selected.symbol, selected.market, 6)
      .then((r) => setPeers(r.peers || []))
      .catch(() => setPeers([]))
      .finally(() => setLoadingPeers(false))
  }, [activeTab, selected.symbol, selected.market])

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
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      if (!token) {
        router.push("/login?msg=請先登入後再新增自選股")
        return
      }
      const symbol = symbolInput.trim().toUpperCase()
      if (!symbol) return

      const normalized = normalizeWatchlistSymbol(symbol, marketPool)
      await addWatchlist(normalized, marketPool)
      await loadWatchlist()

      setSelected({ symbol: normalized, market: marketPool })
      setShowSearchDropdown(false)
    } catch (err) {
      console.error(err)
      if (handleAuthError(err)) {
        router.push("/login?msg=登入已過期，請重新登入")
        return
      }
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
      if (handleAuthError(err)) {
        router.push("/login?msg=登入已過期，請重新登入")
        return
      }
      alert(err instanceof Error ? err.message : "刪除失敗")
    }
  }

  async function handleAddScreenerToWatchlist(symbol: string, market: "TW" | "US" | "CRYPTO") {
    try {
      const normalized = normalizeWatchlistSymbol(symbol, market)
      await addWatchlist(normalized, market)
      await loadWatchlist()
    } catch (err) {
      console.error(err)
      if (handleAuthError(err)) {
        router.push("/login?msg=登入已過期，請重新登入")
        return
      }
      alert(err instanceof Error ? err.message : "新增自選失敗")
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
    <div className="flex h-screen bg-black text-white overflow-hidden flex-col">
      {backendOk === false && (
        <div className="bg-red-900/90 text-white px-4 py-3 text-center text-sm flex items-center justify-center gap-4 flex-wrap">
          <span>無法連線後端，搜尋、排行榜、選股器等將無法使用。</span>
          <span className="font-semibold">請確認：</span>
          <span>1) 後端已執行於 port 8000；2) 瀏覽器可直接開啟 <a href="http://127.0.0.1:8000/" target="_blank" rel="noopener noreferrer" className="underline">http://127.0.0.1:8000/</a></span>
          <code className="bg-black/40 px-2 py-1 rounded text-xs">cd stock-platform\backend 然後 uvicorn app.main:app --reload --host 0.0.0.0 --port 8000</code>
          <button onClick={() => checkBackendHealth().then((r) => setBackendOk(r.ok))} className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-xs">
            重試
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
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
                  placeholder={marketPool === "CRYPTO" ? "搜尋幣種代號或名稱" : marketPool === "TW" ? "搜尋代號或中文名稱（例：2330、台積電）" : "搜尋股票代號或名稱"}
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
                          <div className="font-semibold text-white">
                            {formatStockLabel(item.symbol, item.name, item.market as "TW" | "US" | "CRYPTO")}
                          </div>
                          <div className="text-sm text-zinc-400 truncate">
                            {item.exchange}
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
                        <div className="text-sm font-semibold leading-5 truncate">
                          {formatStockLabel(item.symbol, item.name, item.market)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-400 leading-4 truncate">{item.market}</span>
                          {(() => {
                            const ov = watchlistOverview.find((o) => o.id === item.id)
                            const pct = ov?.change_percent
                            if (pct == null) return null
                            const isUp = (pct ?? 0) >= 0
                            return (
                              <span className={`text-[11px] font-medium ${isUp ? "text-green-400" : "text-red-400"}`}>
                                {isUp ? "+" : ""}{Number(pct).toFixed(2)}%
                              </span>
                            )
                          })()}
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
            className="absolute top-0 right-0 h-full w-2 cursor-col-resize border-r border-zinc-700 hover:border-zinc-500 hover:bg-zinc-600/30 z-10"
            title="拖曳調整左側欄寬度"
          />
        )}
      </div>

      <div className="flex-1 min-w-0 p-6 overflow-auto">
        {/* Header & Metadata */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-white">
            {detailData?.name || quote?.name || "Loading..."}
          </h1>
          <div className="mt-1 text-sm text-zinc-400">
            代號: {detailData?.raw_symbol || selected.symbol} | 市場: {detailData?.market || "-"} | 產業: {detailData?.display_industry || detailData?.industry || "-"}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded-md text-xs bg-zinc-800 border border-zinc-700 text-zinc-300">
              資料品質 {detailData?.data_quality || "-"}
            </span>
            <span className="px-2 py-1 rounded-md text-xs bg-zinc-800 border border-zinc-700 text-zinc-300">
              顯示週期 {detailData?.interval || "1d"}
            </span>
            <span className="px-2 py-1 rounded-md text-xs bg-zinc-800 border border-zinc-700 text-zinc-300">
              抓取 period {detailData?.period || "-"}
            </span>
            <span className="px-2 py-1 rounded-md text-xs bg-zinc-800 border border-zinc-700 text-zinc-300">
              型態 {aiData?.quick_summary?.patterns?.[0] || "-"}
            </span>
          </div>
        </div>

        {/* Price & Market Metrics */}
        <div className="flex flex-wrap gap-6 mb-6">
          <div>
            <div className="text-2xl font-bold">現價 {detailData?.currency || "USD"} {detailData?.price ?? quote?.price ?? "-"}</div>
            <div className={`text-sm mt-1 ${(quote?.change ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
              {(quote?.change ?? 0) >= 0 ? "↑" : "↓"} {quote?.change ?? "-"} ({(quote?.change_percent ?? 0).toFixed(2)}%)
            </div>
          </div>
          <div className="border-l border-zinc-700 pl-6">
            <div className="text-zinc-400 text-sm">52週高 / 低</div>
            <div className="font-semibold">
              {detailData?.fifty_two_week_high != null ? detailData.fifty_two_week_high.toFixed(2) : "-"} / {detailData?.fifty_two_week_low != null ? detailData.fifty_two_week_low.toFixed(2) : "-"}
            </div>
          </div>
          <div className="border-l border-zinc-700 pl-6">
            <div className="text-zinc-400 text-sm">市值</div>
            <div className="font-semibold">
              {detailData?.market_cap != null
                ? detailData.market_cap >= 1e12
                  ? `${(detailData.market_cap / 1e12).toFixed(2)}T`
                  : detailData.market_cap >= 1e9
                  ? `${(detailData.market_cap / 1e9).toFixed(2)}B`
                  : detailData.market_cap >= 1e6
                  ? `${(detailData.market_cap / 1e6).toFixed(2)}M`
                  : detailData.market_cap.toFixed(0)
                : "-"}
            </div>
          </div>
        </div>

        {/* Technical & Fundamental Summary */}
        {aiData?.quick_summary && (
          <div className="mb-6 flex flex-col gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-zinc-400 text-xs">整體趨勢</div>
                <div className="font-semibold">{aiData.quick_summary.trend || "-"}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-zinc-400 text-xs">估值評級</div>
                <div className="font-semibold">{aiData.quick_summary.valuation || "-"}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-zinc-400 text-xs">風險等級</div>
                <div className="font-semibold">{aiData.quick_summary.risk || "-"}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-zinc-400 text-xs">多方訊號</div>
                <div className="font-semibold">{aiData.quick_summary.bullish?.length ? "有" : "0.0%"}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-zinc-400 text-xs">空方訊號</div>
                <div className="font-semibold">{aiData.quick_summary.bearish?.length ? "有" : "0.0%"}</div>
              </div>
            </div>
            <div className="bg-blue-950/20 border border-blue-800/50 rounded-xl p-4 text-sm text-blue-100">
              {aiData.quick_summary.one_line || "-"}
            </div>
            {(() => {
              const q = aiData.quick_summary
              const patterns = (q.patterns ?? []).slice(0, 2).join(" / ") || "暫無明確型態"
              const bullish = (q.bullish ?? []).slice(0, 2).join(" ； ") || "資料不足"
              const bearish = (q.bearish ?? []).slice(0, 2).join(" ； ") || "資料不足"
              const aiBrief = `AI快評：${detailData?.name || selected.symbol}目前偏向${q.trend || "-"}，型態重點為${patterns}。主要優勢：${bullish}。主要風險：${bearish}。`
              return (
                <div className="mt-4 bg-violet-950/20 border border-violet-800/50 rounded-xl p-4 text-sm text-violet-100">
                  {aiBrief}
                </div>
              )
            })()}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-zinc-800 mb-6 overflow-x-auto">
          {(["overview", "fundamental", "ranking", "screener", "ai", "crypto", "debug"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeTab === tab
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              {tab === "overview" && "總覽"}
              {tab === "fundamental" && "基本面 / 同業"}
              {tab === "ranking" && "排行榜"}
              {tab === "screener" && "選股器"}
              {tab === "ai" && "AI研究"}
              {tab === "crypto" && "Crypto"}
              {tab === "debug" && "除錯 / 資料狀態"}
            </button>
          ))}
        </div>

        {error ? (
          <div className="text-red-400 text-lg">{error}</div>
        ) : (
          <>
            {activeTab === "overview" && quote && (
            <>
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
                  {showChart ? "縮起" : "展開"}
                </span>
              </button>
              {showChart && (
                <div className="p-4 border-t border-zinc-800">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(["1h", "4h", "1d", "1wk"] as const).map((iv) => (
                      <button
                        key={iv}
                        onClick={() => setChartInterval(iv)}
                        className={`px-3 py-1.5 rounded-md text-sm border ${
                          chartInterval === iv ? "bg-zinc-600 border-zinc-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {iv === "1h" ? "1 小時" : iv === "4h" ? "4 小時" : iv === "1d" ? "日線" : "週線"}
                      </button>
                    ))}
                  </div>
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
                    {radarCollapsed ? "展開" : "縮起"}
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
                    </div>

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
                                  {idx + 1}. {formatStockLabel(item.symbol, item.name, (item.market || marketPool) as "TW" | "US" | "CRYPTO")}
                                </div>
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
                    {aiPanelCollapsed ? "展開" : "縮起"}
                  </span>
                </button>
                {!aiPanelCollapsed && (
                <div className="border-t border-violet-900/60">
                <div className="px-5 py-4 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      if (aiMode === "daily") {
                        void runAiOpportunities(8, true)
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
                      {(aiMode === "daily" ? aiOpportunityItems : watchlistTechItems).map((item: any, idx) => (
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
                                  {idx + 1}. {formatStockLabel(item.symbol, item.name, (item.market || marketPool) as "TW" | "US" | "CRYPTO")}
                                </div>
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
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                </div>
                )}
              </div>
            </div>
            </>
            )}

            {activeTab === "fundamental" && (
              <div className="space-y-6">
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                  <h3 className="text-lg font-bold mb-4">基本面觀察</h3>
                  {selected.market === "CRYPTO" && (
                    <p className="text-sm text-zinc-400 mb-4">Crypto 無 PE/PB 等傳統基本面，以技術面判讀為主。右側「多時間框架總覽」與「技術訊號總表」為主要參考。</p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div><span className="text-zinc-400 text-sm">PE</span><div className="font-semibold">{detailData?.pe != null ? detailData.pe.toFixed(2) : "-"}</div></div>
                    <div><span className="text-zinc-400 text-sm">PB</span><div className="font-semibold">{detailData?.pb != null ? detailData.pb.toFixed(2) : "-"}</div></div>
                    <div><span className="text-zinc-400 text-sm">EPS</span><div className="font-semibold">{detailData?.eps != null ? detailData.eps.toFixed(2) : "-"}</div></div>
                    <div><span className="text-zinc-400 text-sm">ROE</span><div className="font-semibold">{detailData?.roe != null ? `${(detailData.roe * 100).toFixed(2)}%` : "-"}</div></div>
                    <div><span className="text-zinc-400 text-sm">毛利率</span><div className="font-semibold">{detailData?.gross != null ? `${(detailData.gross * 100).toFixed(2)}%` : "-"}</div></div>
                    <div><span className="text-zinc-400 text-sm">營收成長</span><div className="font-semibold">{detailData?.revenue != null ? `${(detailData.revenue * 100).toFixed(2)}%` : "-"}</div></div>
                    <div><span className="text-zinc-400 text-sm">負債比</span><div className="font-semibold">{detailData?.debt != null ? detailData.debt.toFixed(2) : "-"}</div></div>
                    <div><span className="text-zinc-400 text-sm">估值評級</span><div className="font-semibold">{aiData?.quick_summary?.valuation || detailData?.valuation || "-"}</div></div>
                  </div>
                  <div className="mt-3 text-sm text-zinc-400">產業：{detailData?.display_industry || detailData?.industry || "-"}</div>
                </div>
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                  <h3 className="text-lg font-bold mb-4">自動同業比較</h3>
                  {loadingPeers ? (
                    <div className="text-zinc-400">載入中...</div>
                  ) : peers.length === 0 ? (
                    <div className="text-zinc-400">目前無法取得有效同業資料（僅支援台股、美股）</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-zinc-400 border-b border-zinc-700">
                            <th className="text-left py-2">標的</th>
                            <th className="text-right py-2">價格</th>
                            <th className="text-right py-2">漲跌</th>
                            <th className="text-right py-2">漲跌幅</th>
                          </tr>
                        </thead>
                        <tbody>
                          {peers.map((p) => (
                            <tr key={p.symbol} className="border-b border-zinc-700/50">
                              <td className="py-2">
                                <button
                                  onClick={() => setSelected({ symbol: p.symbol, market: selected.market })}
                                  className="text-emerald-400 hover:underline"
                                >
                                  {formatStockLabel(p.symbol, p.name, selected.market)}
                                </button>
                              </td>
                              <td className="py-2 text-right">{p.price != null ? p.price.toFixed(2) : "-"}</td>
                              <td className={`py-2 text-right ${(p.change ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>{p.change != null ? p.change.toFixed(2) : "-"}</td>
                              <td className={`py-2 text-right ${(p.change_percent ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>{p.change_percent != null ? `${p.change_percent.toFixed(2)}%` : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "ranking" && (
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                <h3 className="text-lg font-bold mb-4">熱門排行榜</h3>
                <p className="text-zinc-500 text-sm mb-4">
                  {leaderboardSortDir === "gainers" ? "今日漲幅由高到低" : "今日跌幅由低到高"}，即時抓取失敗時 fallback 至 10 分鐘快取
                </p>
                <div className="flex gap-4 mb-4 flex-wrap items-center">
                  <button onClick={() => { setScannerMode("ranking"); void runLeaderboard() }} className="px-3 py-2 rounded-md border bg-zinc-700 border-zinc-500">
                    排行榜
                  </button>
                  <select value={leaderboardSortDir} onChange={(e) => { setLeaderboardSortDir(e.target.value as "gainers" | "losers"); void runLeaderboard() }} className="px-3 py-2 rounded-md border bg-zinc-800 border-zinc-700 text-sm">
                    <option value="gainers">漲幅排行榜</option>
                    <option value="losers">跌幅排行榜</option>
                  </select>
                </div>
                {leaderboardLoading ? (
                  <div className="text-zinc-400">載入中...</div>
                ) : (() => {
                    const marketLabel = marketPool === "TW" ? "台股" : marketPool === "US" ? "美股" : "虛擬貨幣"
                    const items = marketPool === "TW" ? twLeaderboardItems : marketPool === "US" ? usLeaderboardItems : cryptoLeaderboardItems
                    return (
                      <div>
                        <h4 className="font-semibold mb-2">{marketLabel} {leaderboardSortDir === "gainers" ? "漲幅榜" : "跌幅榜"}</h4>
                        <div className="overflow-x-auto max-h-[28rem]">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="text-zinc-400 border-b border-zinc-700">
                                <th className="text-center py-3 px-2 w-10">#</th>
                                <th className="text-center py-3 px-3 min-w-[4rem]">代號</th>
                                <th className="text-center py-3 px-3 min-w-[6rem]">名稱</th>
                                <th className="text-center py-3 px-3 min-w-[5rem]">價格</th>
                                <th className="text-center py-3 px-3 min-w-[5rem]">漲跌幅</th>
                                <th className="text-center py-3 px-3 min-w-[4rem]">訊號分數</th>
                                <th className="text-center py-3 px-3 min-w-[5rem]">整體趨勢</th>
                                <th className="text-center py-3 px-3 min-w-[4rem]">RSI</th>
                                <th className="text-center py-3 px-3 min-w-[4rem]">Vol 30D</th>
                                <th className="text-center py-3 px-3 min-w-[4rem]">Funding</th>
                                <th className="text-center py-3 px-3 min-w-[6rem]">型態</th>
                                <th className="text-center py-3 px-4 min-w-[10rem]">選股原因</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item, idx) => (
                                <tr key={`${marketPool}-${item.symbol}-${idx}`} className="border-b border-zinc-700/50 hover:bg-zinc-800/50">
                                  <td className="py-3 px-2 text-center text-zinc-500">{idx + 1}</td>
                                  <td className="py-3 px-3 text-center">
                                    <button onClick={() => setSelected({ symbol: marketPool === "TW" ? String(item.symbol ?? "").replace(".TW", "") : String(item.symbol ?? ""), market: marketPool })} className="text-emerald-400 hover:underline font-medium">
                                      {marketPool === "TW" ? String(item.symbol ?? "").replace(".TW", "") : String(item.symbol ?? "")}
                                    </button>
                                  </td>
                                  <td className="py-3 px-3 text-center text-zinc-200 whitespace-nowrap">{(item.name && String(item.name) !== String(item.symbol)) ? item.name : "-"}</td>
                                  <td className="py-3 px-3 text-center whitespace-nowrap">{item.price != null ? item.price.toFixed(2) : "-"}</td>
                                  <td className={`py-3 px-3 text-center whitespace-nowrap ${(item.change_percent ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>{item.change_percent != null ? `${Number(item.change_percent).toFixed(2)}%` : "-"}</td>
                                  <td className="py-3 px-3 text-center text-amber-300 whitespace-nowrap">{item.score != null ? Math.round(item.score) : "-"}</td>
                                  <td className="py-3 px-3 text-center text-zinc-300 whitespace-nowrap">{item.trend ?? "-"}</td>
                                  <td className="py-3 px-3 text-center text-zinc-400 whitespace-nowrap">{item.rsi != null ? Number(item.rsi).toFixed(2) : "-"}</td>
                                  <td className="py-3 px-3 text-center text-zinc-400 whitespace-nowrap">{item.volume_ratio_30d != null ? Number(item.volume_ratio_30d).toFixed(2) : "-"}</td>
                                  <td className="py-3 px-3 text-center text-zinc-500 whitespace-nowrap">{item.funding_rate != null ? Number(item.funding_rate).toFixed(4) : "-"}</td>
                                  <td className="py-3 px-3 text-center text-zinc-300">{item.pattern ?? "-"}</td>
                                  <td className="py-3 px-4 text-center text-zinc-400 text-xs max-w-[14rem]" title={item.summary ?? ""}>{item.summary ?? "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })()
                }
              </div>
            )}

            {activeTab === "screener" && (
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">選股器（技術條件篩選）</h3>
                  {screenerDataSource && (
                    <span className={`text-xs px-2 py-1 rounded ${screenerDataSource === "live" ? "bg-emerald-900/50 text-emerald-300" : "bg-amber-900/50 text-amber-300"}`}>
                      {screenerDataSource === "live" ? "即時資料" : "快取資料（背景掃描）"}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">最低價</label>
                    <input type="number" placeholder="例: 10" value={filterMinPrice} onChange={(e) => setFilterMinPrice(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">最高價</label>
                    <input type="number" placeholder="例: 500" value={filterMaxPrice} onChange={(e) => setFilterMaxPrice(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">最低成交量</label>
                    <input type="number" placeholder="例: 1000000" value={filterMinVolume} onChange={(e) => setFilterMinVolume(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">最低漲幅 %</label>
                    <input type="number" placeholder="例: 1" value={filterMinChangePct} onChange={(e) => setFilterMinChangePct(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">最高漲幅 %</label>
                    <input type="number" placeholder="例: 10" value={filterMaxChangePct} onChange={(e) => setFilterMaxChangePct(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">RSI 最低</label>
                    <input type="number" placeholder="例: 30" min={0} max={100} value={filterRsiMin} onChange={(e) => setFilterRsiMin(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">RSI 最高</label>
                    <input type="number" placeholder="例: 70" min={0} max={100} value={filterRsiMax} onChange={(e) => setFilterRsiMax(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filterAboveMa20} onChange={(e) => setFilterAboveMa20(e.target.checked)} className="rounded" />
                    <span className="text-sm">站上 MA20</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filterAboveMa60} onChange={(e) => setFilterAboveMa60(e.target.checked)} className="rounded" />
                    <span className="text-sm">均線多頭排列</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filterMacdBullish} onChange={(e) => setFilterMacdBullish(e.target.checked)} className="rounded" />
                    <span className="text-sm">MACD 柱體翻正</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filterOnlyBreakout} onChange={(e) => setFilterOnlyBreakout(e.target.checked)} className="rounded" />
                    <span className="text-sm">只看接近突破</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filterOnlyBull} onChange={(e) => setFilterOnlyBull(e.target.checked)} className="rounded" />
                    <span className="text-sm">只看多頭排列</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filterVolumeRatio30d} onChange={(e) => setFilterVolumeRatio30d(e.target.checked)} className="rounded" />
                    <span className="text-sm">30天內成交量爆量1.5倍以上</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filterBreakout30d} onChange={(e) => setFilterBreakout30d(e.target.checked)} className="rounded" />
                    <span className="text-sm">突破30天最高價</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filterMacdGolden} onChange={(e) => setFilterMacdGolden(e.target.checked)} className="rounded" />
                    <span className="text-sm">MACD 黃金交叉</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filterMacdDeath} onChange={(e) => setFilterMacdDeath(e.target.checked)} className="rounded" />
                    <span className="text-sm">MACD 死亡交叉</span>
                  </label>
                </div>
                <p className="text-xs text-zinc-500 mb-2">勾選的條件為「且」關係，須全部達標才會出現在結果中。</p>
                <button onClick={() => void runScreenerFilter()} disabled={screenerFilterLoading} className="mb-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium">
                  {screenerFilterLoading ? "執行中..." : "執行選股"}
                </button>
                <div className="mb-2 flex items-center gap-4">
                  <span className="text-sm text-zinc-400">最低分數</span>
                  <input type="range" min={0} max={100} step={5} value={techScoreMin} onChange={(e) => setTechScoreMin(Number(e.target.value))} className="w-36 accent-emerald-500" />
                  <span className="text-sm font-semibold">{techScoreMin}</span>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-zinc-400 border-b border-zinc-700">
                        <th className="text-center py-2">代號</th>
                        <th className="text-center py-2">名稱</th>
                        <th className="text-center py-2">價格</th>
                        <th className="text-center py-2">漲跌幅</th>
                        <th className="text-center py-2">訊號分數</th>
                        <th className="text-center py-2 min-w-[10rem]">原因</th>
                        <th className="text-center py-2 w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {screenerFilterResult.filter((i) => (i.uiScore ?? 0) >= techScoreMin).map((item, idx) => (
                        <tr key={`${item.symbol}-${idx}`} className="border-b border-zinc-700/50 hover:bg-zinc-800/50">
                          <td className="py-2 text-center">
                            <button
                              onClick={() => setSelected({ symbol: normalizeWatchlistSymbol(String(item.symbol ?? ""), marketPool), market: marketPool })}
                              className="text-emerald-400 hover:underline font-medium"
                            >
                              {item.symbol}
                            </button>
                          </td>
                          <td className="py-2 text-center text-zinc-300">{item.name || "-"}</td>
                          <td className="py-2 text-center">{item.price != null ? Number(item.price).toFixed(2) : "-"}</td>
                          <td className={`py-2 text-center ${(item.change_percent ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {item.change_percent != null ? `${Number(item.change_percent).toFixed(2)}%` : "-"}
                          </td>
                          <td className="py-2 text-center text-emerald-300">{item.uiScore ?? "-"}</td>
                          <td className="py-2 text-center text-zinc-400 text-xs max-w-[14rem]" title={Array.isArray(item.signals) ? item.signals.join("、") : (item.summary ?? "")}>
                            {Array.isArray(item.signals) && item.signals.length > 0 ? item.signals.join("、") : (item.summary || "-")}
                          </td>
                          <td className="py-2 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); void handleAddScreenerToWatchlist(String(item.symbol ?? ""), marketPool) }}
                              className="px-2 py-1 rounded text-xs bg-zinc-700 hover:bg-zinc-600 border border-zinc-600"
                            >
                              加入自選
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {screenerFilterResult.length === 0 && !screenerFilterLoading && (
                  <p className="text-sm text-zinc-500 mt-4">設定條件後按下「執行選股」即可篩選。台股 / 美股 / Crypto 皆支援。</p>
                )}
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-violet-800/70 bg-violet-950/20 p-5">
                  <h3 className="text-lg font-bold text-violet-200 mb-4">AI 分析（Premium）</h3>
                  <div className="flex gap-2 flex-wrap mb-4">
                    <button onClick={() => { setAiMode("daily"); void runAiOpportunities(8) }} className={`px-3 py-2 rounded-md text-sm border ${aiMode === "daily" ? "bg-violet-600 border-violet-500" : "bg-zinc-800 border-zinc-700"}`}>AI 每日機會</button>
                    <button onClick={() => { setAiMode("watchlist"); void runWatchlistTech(50) }} className={`px-3 py-2 rounded-md text-sm border ${aiMode === "watchlist" ? "bg-fuchsia-600 border-fuchsia-500" : "bg-zinc-800 border-zinc-700"}`}>AI 自選股分析</button>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {(aiMode === "daily" ? aiOpportunityItems : watchlistTechItems).map((item: any, idx) => (
                      <button
                        key={`${item.symbol}-${idx}`}
                        onClick={() => setSelected({ symbol: normalizeWatchlistSymbol(String(item.symbol ?? ""), marketPool), market: (item.market || marketPool) as "TW" | "US" | "CRYPTO" })}
                        className="w-full text-left rounded-xl border border-violet-900/50 bg-zinc-950/60 px-4 py-3 hover:bg-zinc-800/70"
                      >
                        <span className="font-semibold">{formatStockLabel(item.symbol, item.name, (item.market || marketPool) as "TW" | "US" | "CRYPTO")}</span>
                        <span className="float-right text-emerald-300">分數 {item.score ?? item.uiScore ?? "-"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "crypto" && (
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                <h3 className="text-lg font-bold mb-4">Crypto 市場</h3>
                <p className="text-zinc-400 text-sm mb-4">切換至 Crypto 市場後，在左側搜尋幣種即可查看。排行榜與選股器會顯示 Crypto 掃描結果。</p>
                <button onClick={() => setMarketPool("CRYPTO")} className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700">
                  切換至 Crypto
                </button>
              </div>
            )}

            {activeTab === "debug" && (
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                <h3 className="text-lg font-bold mb-4">資料狀態</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-4"><span className="text-zinc-500 w-32">實際使用代號</span><span>{detailData?.symbol || selected.symbol}</span></div>
                  <div className="flex gap-4"><span className="text-zinc-500 w-32">原始輸入代號</span><span>{detailData?.raw_symbol || selected.symbol}</span></div>
                  <div className="flex gap-4"><span className="text-zinc-500 w-32">資料來源</span><span>{selected.market === "CRYPTO" ? "Bybit API" : "Yahoo Finance"}</span></div>
                  <div className="flex gap-4"><span className="text-zinc-500 w-32">顯示週期</span><span>{detailData?.interval || "1d"}</span></div>
                  <div className="flex gap-4"><span className="text-zinc-500 w-32">抓取 interval</span><span>{detailData?.fetch_interval || "1d"}</span></div>
                  <div className="flex gap-4"><span className="text-zinc-500 w-32">抓取 period</span><span>{detailData?.period || "-"}</span></div>
                  <div className="flex gap-4"><span className="text-zinc-500 w-32">資料品質</span><span>{detailData?.data_quality || "-"}</span></div>
                  <div className="flex gap-4"><span className="text-zinc-500 w-32">Sector</span><span>{detailData?.sector || "-"}</span></div>
                  <div className="flex gap-4"><span className="text-zinc-500 w-32">Industry</span><span>{detailData?.industry || "-"}</span></div>
                </div>
              </div>
            )}
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
              <div className="bg-zinc-800 rounded-xl p-4 text-center">
                <div className="text-zinc-400 text-sm mb-1">Symbol</div>
                <div className="font-semibold">{selected.symbol}</div>
              </div>

              <div className="bg-zinc-800 rounded-xl p-4 text-center">
                <div className="text-zinc-400 text-sm mb-1">Market</div>
                <div className="font-semibold">{selected.market}</div>
              </div>

              <div className="bg-zinc-800 rounded-xl p-4 text-center">
                <div className="text-zinc-400 text-sm mb-1">技術趨勢</div>
                <div className="font-semibold">{aiData?.quick_summary?.trend || "Loading..."}</div>
              </div>

              <div className="bg-zinc-800 rounded-xl p-4 text-center">
                <div className="text-zinc-400 text-sm mb-1">估值 / 強弱</div>
                <div className="font-semibold">{aiData?.quick_summary?.valuation || "Loading..."}</div>
              </div>

              <div className="bg-zinc-800 rounded-xl p-4 text-center">
                <div className="text-zinc-400 text-sm mb-1">技術風險</div>
                <div className="font-semibold">{aiData?.quick_summary?.risk || "Loading..."}</div>
              </div>

              <div className="bg-zinc-800 rounded-xl p-4 text-center">
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

              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="text-zinc-400 text-sm mb-2">多時間框架總覽（1h / 4h / 1d / 1wk）</div>
                {multiTimeframe.length > 0 ? (
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
                ) : (
                  <div className="text-sm py-2">
                    <div className="text-zinc-500">載入中或後端未提供資料。</div>
                    {mtfError && <div className="text-amber-400 mt-1 text-xs">錯誤：{mtfError}</div>}
                    <div className="text-zinc-600 text-xs mt-1">請確認後端已啟動且從 stock-platform/backend 執行 uvicorn。</div>
                  </div>
                )}
              </div>

              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="text-zinc-400 text-sm mb-2">技術訊號總表</div>
                {signalTable.length > 0 ? (
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
                ) : (
                  <div className="text-sm py-2">
                    <div className="text-zinc-500">載入中或後端未提供資料。</div>
                    {sigError && <div className="text-amber-400 mt-1 text-xs">錯誤：{sigError}</div>}
                  </div>
                )}
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
              className="absolute top-0 left-0 h-full w-2 cursor-col-resize border-l border-zinc-700 hover:border-zinc-500 hover:bg-zinc-600/30 active:bg-zinc-500/50 z-10"
              title="拖曳調整右側欄寬度"
            />
          </div>
        )}
      </div>
      </div>
    </div>
  )
}