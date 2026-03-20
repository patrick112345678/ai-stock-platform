/**
 * 將後端 FastAPI 錯誤 JSON 轉成使用者可讀中文（註冊／登入等）
 */
const REGISTER_DETAIL_ZH: Record<string, string> = {
  "Username already exists": "此帳號已被使用，請換其他使用者名稱。",
  "Email already exists": "此 Email 已被註冊，請直接登入或換一個信箱。",
}

const LOGIN_DETAIL_ZH: Record<string, string> = {
  "Invalid username or password": "帳號或密碼錯誤。",
}

function detailArrayToText(detail: unknown[]): string {
  return detail
    .map((item) => {
      if (item && typeof item === "object" && "msg" in item) {
        return String((item as { msg: string }).msg)
      }
      return null
    })
    .filter(Boolean)
    .join("；")
}

/**
 * @param raw - res.text() 原始內容
 * @param context - 決定預設語氣與對照表
 */
export function formatAuthApiError(
  raw: string,
  context: "register" | "login",
  httpStatus?: number
): string {
  const map = context === "register" ? REGISTER_DETAIL_ZH : LOGIN_DETAIL_ZH
  const prefix = context === "register" ? "註冊失敗：" : "登入失敗："
  const trimmed = raw.trim()
  try {
    const j = JSON.parse(trimmed) as { detail?: unknown }
    const d = j?.detail
    if (typeof d === "string") {
      if (map[d]) return map[d]
      return `${prefix}${d}`
    }
    if (Array.isArray(d) && d.length) {
      const joined = detailArrayToText(d)
      if (joined) return `${prefix}${joined}`
    }
  } catch {
    /* 非 JSON */
  }
  if (!trimmed) {
    const code = httpStatus != null ? `（HTTP ${httpStatus}）` : ""
    return `${prefix}伺服器未回傳說明${code}。若為線上版，請確認前端已設定 NEXT_PUBLIC_API_BASE_URL（或 NEXT_PUBLIC_API_URL）或 BACKEND_API_URL 指向後端，並重新部署；免費主機休眠時請多試一次。`
  }
  if (trimmed.length < 240 && !trimmed.startsWith("{")) {
    return `${prefix}${trimmed}`
  }
  return `${prefix}伺服器回應異常，請稍後再試。`
}
