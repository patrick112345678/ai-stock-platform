// 優先使用同源代理 /api，避免 CORS；若設了 NEXT_PUBLIC_API_BASE_URL 則直連後端
const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "/api")
    : (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000")
export type MarketPool = "TW" | "US" | "CRYPTO"

/** 檢查後端是否可連線且路由已載入 */
export async function checkBackendHealth(): Promise<{ ok: boolean; routes?: string[] }> {
  const urls: string[] = [`${API_BASE}/`]
  if (typeof window !== "undefined" && API_BASE.startsWith("/")) {
    urls.push("http://127.0.0.1:8000/")
  }
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: "no-store" })
      if (r.ok) return { ok: true }
    } catch {
      continue
    }
  }
  return { ok: false }
}



export async function registerUser(username: string,email: string,password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`註冊失敗: ${text}`)
  }

  return res.json()
}
export type SearchItem = {
  symbol: string
  name: string
  market: MarketPool
  exchange: string
}
export async function searchMarket(q: string, market?: MarketPool) {
  const keyword = q.trim()
  if (!keyword) return []

  const params = new URLSearchParams()
  params.set("q", keyword)
  if (market) params.set("market", market)

  const res = await fetch(`${API_BASE}/market/search?${params.toString()}`)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`搜尋失敗: ${text}`)
  }

  return res.json()
}
export async function loginUser(username: string, password: string) {
  const formData = new URLSearchParams()
  formData.append("username", username)
  formData.append("password", password)

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`登入失敗: ${text}`)
  }

  return res.json()
}

export function getToken() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("access_token") || ""
}

export function saveToken(token: string) {
  localStorage.setItem("access_token", token)
}

export function clearToken() {
  localStorage.removeItem("access_token")
}

/** 若為 401/403 認證錯誤，清除 token 並回傳 true，呼叫方應導向登入 */
export function handleAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes("401") || msg.includes("403") || msg.includes("Not authenticated") || msg.includes("無法驗證")) {
    clearToken()
    return true
  }
  return false
}
export async function getWatchlist() {
  const token = getToken()

  const res = await fetch(`${API_BASE}/watchlist`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    throw new Error(`watchlist API 錯誤: ${res.status}`)
  }

  return res.json()
}

export async function getWatchlistOverview() {
  const token = getToken()
  const res = await fetch(`${API_BASE}/watchlist/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`watchlist overview 錯誤: ${res.status}`)
  return res.json()
}

export async function addWatchlist(symbol: string, market: MarketPool) {
  const token = getToken()

  const res = await fetch(`${API_BASE}/watchlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      symbol,
      market,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`新增自選股失敗: ${text}`)
  }

  return res.json()
}

export async function deleteWatchlist(id: number | string) {
  const token = getToken()

  const res = await fetch(`${API_BASE}/watchlist/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`刪除 watchlist 失敗: ${text}`)
  }

  return true
}

export async function getQuote(symbol: string, market: MarketPool) {
  const res = await fetch(
    `${API_BASE}/market/quote?symbol=${symbol}&market=${market}`
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`quote API 錯誤: ${text}`)
  }

  return res.json()
}

export type DetailData = {
  symbol: string
  raw_symbol: string
  name: string | null
  market: string
  industry: string
  sector?: string
  display_industry?: string
  price: number | null
  change: number | null
  change_percent: number | null
  market_cap: number | null
  fifty_two_week_high: number | null
  fifty_two_week_low: number | null
  pe: number | null
  pb: number | null
  eps: number | null
  roe: number | null
  gross: number | null
  revenue: number | null
  debt: number | null
  valuation: string | null
  currency?: string
  exchange?: string
  interval?: string
  fetch_interval?: string
  period?: string
  data_quality?: string
  errors?: string[]
}

export async function getDetail(symbol: string, market: MarketPool): Promise<DetailData> {
  const res = await fetch(
    `${API_BASE}/market/detail?symbol=${encodeURIComponent(symbol)}&market=${market}`
  )
  if (!res.ok) throw new Error("取得詳細資料失敗")
  return res.json()
}

export type PeerItem = {
  symbol: string
  name: string | null
  price: number | null
  change: number | null
  change_percent: number | null
}

export async function getPeers(
  symbol: string,
  market: "TW" | "US",
  maxPeers = 6
): Promise<{ peers: PeerItem[] }> {
  const res = await fetch(
    `${API_BASE}/market/peers?symbol=${encodeURIComponent(symbol)}&market=${market}&max_peers=${maxPeers}`
  )
  if (!res.ok) throw new Error("取得同業資料失敗")
  return res.json()
}

export async function getMultiTimeframe(
  symbol: string,
  market: MarketPool,
  lang = "zh"
) {
  const params = new URLSearchParams()
  params.set("symbol", symbol)
  params.set("market", market)
  params.set("lang", lang)
  const res = await fetch(`${API_BASE}/market/multi-timeframe?${params.toString()}`)
  if (!res.ok) throw new Error("取得多時間框架失敗")
  return res.json()
}

export async function getSignalTable(
  symbol: string,
  market: MarketPool,
  lang = "zh"
) {
  const params = new URLSearchParams()
  params.set("symbol", symbol)
  params.set("market", market)
  params.set("lang", lang)
  const res = await fetch(`${API_BASE}/market/signal-table?${params.toString()}`)
  if (!res.ok) throw new Error("取得技術訊號表失敗")
  return res.json()
}

export async function getChart(
  symbol: string,
  market: MarketPool,
  interval: string = "1d",
  period?: string
) {
  const p = period ?? (interval === "1h" ? "1mo" : interval === "4h" ? "2mo" : interval === "1wk" ? "2y" : "3mo")
  const res = await fetch(
    `${API_BASE}/market/chart?symbol=${symbol}&market=${market}&interval=${interval}&period=${p}`
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`chart API 錯誤: ${text}`)
  }

  return res.json()
}
export type AIReport = {
  trend?: string
  valuation?: string
  risk?: string
  summary?: string
  action?: string
  confidence?: number
}

export type AIAnalyzeResponse = {
  symbol: string
  name: string
  market: string
  interval: string
  quick_summary: {
    trend: string
    valuation: string
    risk: string
    patterns: string[]
    bullish: string[]
    bearish: string[]
    one_line: string
  }
  ai_report: AIReport | null
}
export async function analyzeAI(
  symbol: string,
  market: MarketPool,
  options?: { quick_only?: boolean }
): Promise<AIAnalyzeResponse> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null

  const res = await fetch(`${API_BASE}/ai/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      symbol,
      market,
      interval: "1d",
      lang: "zh",
      quick_only: options?.quick_only ?? true,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI 分析失敗: ${text}`)
  }

  return res.json()
}
export type ScanFilterResult = {
  items: any[]
  source?: "live" | "cache"
}

export async function scanMarket(filter: any): Promise<ScanFilterResult | { items: any[]; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/scanner/filter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(filter),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`選股器失敗: ${text}`)
    }
    const data = await res.json()
    if (Array.isArray(data)) return { items: data, source: "live" }
    return data
  } catch (e) {
    const msg = e instanceof Error ? e.message : "選股器執行失敗"
    if (msg.includes("fetch") || msg === "Failed to fetch") {
      return { items: [], error: "無法連線後端，請確認後端已啟動 (http://127.0.0.1:8000)" }
    }
    throw e
  }
}
export type ScanPool = "TOP30" | "TOP100" | "TOP800" | "ALL"

export async function getScannerOpportunities(
  market: MarketPool,
  pool: ScanPool,
  limit = 20
) {
  const params = new URLSearchParams()
  params.set("market", market)
  params.set("pool", pool)
  params.set("limit", String(limit))

  const res = await fetch(`${API_BASE}/scanner/opportunities?${params.toString()}`)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`取得今日機會失敗: ${text}`)
  }

  return res.json()
}

export async function getScannerLeaderboard(
  market: MarketPool,
  pool: ScanPool,
  sort: "change_percent" | "volume" = "change_percent",
  limit = 20,
  sortDirection: "gainers" | "losers" = "gainers"
) {
  const params = new URLSearchParams()
  params.set("market", market)
  params.set("pool", pool)
  params.set("sort", sort)
  params.set("limit", String(limit))
  params.set("sort_direction", sortDirection)

  const res = await fetch(`${API_BASE}/scanner/leaderboard?${params.toString()}`)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`取得排行榜失敗: ${text}`)
  }

  return res.json()
}

export async function getScannerWatchlist(
  market: MarketPool,
  limit = 50
) {
  const token = getToken()
  const params = new URLSearchParams()
  params.set("market", market)
  params.set("limit", String(limit))

  const res = await fetch(`${API_BASE}/scanner/watchlist?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`取得自選股分析失敗: ${text}`)
  }

  return res.json()
}
export type AIOpportunityItem = {
  symbol: string
  name?: string | null
  score?: number | null
  price?: number | null
  change_pct?: number | null
  reason?: string | null
  risk?: string | null
}

export type AIOpportunitiesResponse = {
  market: MarketPool
  updated_at?: string | null
  source?: string
  items: AIOpportunityItem[]
}

export async function getAIOpportunities(
  market: MarketPool,
  limit = 8,
  forceRefresh = false
): Promise<AIOpportunitiesResponse> {
  const token = getToken()

  const res = await fetch(`${API_BASE}/ai/opportunities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      market,
      limit,
      lang: "zh",
      force_refresh: forceRefresh,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`取得 AI 今日機會失敗: ${text}`)
  }

  return res.json()
}

export type AIWatchlistDailyItem = {
  watchlist_id: number
  symbol: string
  market: MarketPool
  name?: string | null
  interval: string
  quick_summary: {
    trend?: string
    valuation?: string
    risk?: string
    patterns?: string[]
    bullish?: string[]
    bearish?: string[]
    one_line?: string
  }
  ai_report?: {
    trend?: string
    valuation?: string
    risk?: string
    summary?: string
    action?: string
    confidence?: number
  } | null
  error?: string | null
}

export async function analyzeWatchlistDaily(
  market?: MarketPool,
  limit = 20
): Promise<{ items: AIWatchlistDailyItem[] }> {
  const token = getToken()

  const res = await fetch(`${API_BASE}/ai/watchlist-daily`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      market: market ?? null,
      interval: "1d",
      lang: "zh",
      quick_only: false,
      limit,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`自選股每日分析失敗: ${text}`)
  }

  return res.json()
}
