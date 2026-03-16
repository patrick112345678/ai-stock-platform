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