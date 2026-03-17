const API_BASE = "http://127.0.0.1:8000"

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
  market: "stock" | "crypto"
  exchange: string
}

export async function searchMarket(
  q: string,
  market?: "stock" | "crypto"
): Promise<SearchItem[]> {
  const params = new URLSearchParams()
  params.set("q", q)
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

export async function addWatchlist(symbol: string, market: "stock" | "crypto") {
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

export async function getQuote(symbol: string, market: "stock" | "crypto") {
  const res = await fetch(
    `${API_BASE}/market/quote?symbol=${symbol}&market=${market}`
  )

  if (!res.ok) {
    throw new Error(`quote API 錯誤: ${res.status}`)
  }

  return res.json()
}

export async function getChart(symbol: string) {
  const res = await fetch(
    `${API_BASE}/market/chart?symbol=${symbol}&interval=1d&period=3mo`
  )

  if (!res.ok) {
    throw new Error(`chart API 錯誤: ${res.status}`)
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
  market: "stock" | "crypto"
): Promise<AIAnalyzeResponse> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null

  const apiMarket = market === "stock" ? "US" : "crypto"

  const res = await fetch(`${API_BASE}/ai/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      symbol,
      market: apiMarket,
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
export async function getScannerOpportunities(
  market: "stock" | "crypto" = "stock",
  limit = 20
) {
  const params = new URLSearchParams()
  params.set("market", market)
  params.set("limit", String(limit))

  const res = await fetch(`${API_BASE}/scanner/opportunities?${params.toString()}`)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`取得今日機會失敗: ${text}`)
  }

  return res.json()
}



export async function getScannerLeaderboard(
  market: "stock" | "crypto" = "stock",
  sort: "change_percent" | "volume" = "change_percent",
  limit = 20
) {
  const params = new URLSearchParams()
  params.set("market", market)
  params.set("sort", sort)
  params.set("limit", String(limit))

  const res = await fetch(`${API_BASE}/scanner/leaderboard?${params.toString()}`)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`取得排行榜失敗: ${text}`)
  }

  return res.json()
}
export type AIWatchlistDailyItem = {
  watchlist_id: number
  symbol: string
  market: "stock" | "crypto"
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
  market?: "stock" | "crypto",
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