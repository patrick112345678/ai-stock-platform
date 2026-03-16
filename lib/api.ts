const API_BASE = "http://localhost:8000"

export async function getQuote(symbol: string, market: "stock" | "crypto") {
  const res = await fetch(
    `${API_BASE}/market/quote?symbol=${symbol}&market=${market}`
  )
  if (!res.ok) throw new Error(`quote API 錯誤: ${res.status}`)
  return res.json()
}

export async function getChart(symbol: string) {
  const res = await fetch(
    `${API_BASE}/market/chart?symbol=${symbol}&interval=1d&period=3mo`
  )
  if (!res.ok) throw new Error(`chart API 錯誤: ${res.status}`)
  return res.json()
}

export async function getWatchlist(token?: string) {
  const res = await fetch(`${API_BASE}/watchlist`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  })
  if (!res.ok) throw new Error(`watchlist API 錯誤: ${res.status}`)
  return res.json()
}

export async function addWatchlist(
  symbol: string,
  market: "stock" | "crypto",
  token?: string
) {
  const res = await fetch(`${API_BASE}/watchlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ symbol, market }),
  })
  if (!res.ok) throw new Error(`新增 watchlist 失敗: ${res.status}`)
  return res.json()
}

export async function deleteWatchlist(id: number | string, token?: string) {
  const res = await fetch(`${API_BASE}/watchlist/${id}`, {
    method: "DELETE",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  })
  if (!res.ok) throw new Error(`刪除 watchlist 失敗: ${res.status}`)
  return true
}