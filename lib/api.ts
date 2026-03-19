const API_BASE = "http://127.0.0.1:8000"
export type MarketPool = "TW" | "US" | "CRYPTO"



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
  console.log("DEBUG getQuote market =", market)
  const res = await fetch(
    `${API_BASE}/market/quote?symbol=${symbol}&market=${market}`
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`quote API 錯誤: ${text}`)
  }

  return res.json()
}

export async function getChart(symbol: string, market: MarketPool) {
  const res = await fetch(
    `${API_BASE}/market/chart?symbol=${symbol}&market=${market}&interval=1d&period=3mo`
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
  market: MarketPool
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
      quick_only: true,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI 分析失敗: ${text}`)
  }

  return res.json()
}
export async function scanMarket(filter: any) {
  const res = await fetch(`${API_BASE}/scanner/filter`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(filter),
  })

  if (!res.ok) throw new Error("Scanner failed")
  return res.json()
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
  limit = 20
) {
  const params = new URLSearchParams()
  params.set("market", market)
  params.set("pool", pool)
  params.set("sort", sort)
  params.set("limit", String(limit))

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
  limit = 8
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
      force_refresh: false,
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
