/**
 * 代理 /api/* 到後端，並轉發 Authorization 等 headers（Next.js rewrite 預設不轉發）
 *
 * 部署重點：瀏覽器未設 NEXT_PUBLIC_API_BASE_URL 時會打同源 /api/*，此程式在「伺服器」上轉發。
 * 若只部署前端到 Vercel 等，務必在專案環境變數設定其一（指向 Render 後端，勿尾隨 /）：
 * - BACKEND_API_URL（建議，僅伺服器可見）或
 * - NEXT_PUBLIC_API_BASE_URL（與 lib/api.ts 直連後端時一致）
 * 否則預設會連 127.0.0.1:8000，生產環境登入會失敗且回應體常為空 →「請稍後再試」。
 */
function backendBase(): string {
  const fromServer =
    process.env.BACKEND_API_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")
  return fromServer || "http://127.0.0.1:8000"
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const url = new URL(request.url)
  const backendUrl = `${backendBase()}/${path.join("/")}${url.search}`
  const headers = new Headers()
  request.headers.forEach((v, k) => {
    if (["authorization", "content-type", "accept"].includes(k.toLowerCase())) {
      headers.set(k, v)
    }
  })
  const res = await fetch(backendUrl, { headers })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const url = new URL(request.url)
  const backendUrl = `${backendBase()}/${path.join("/")}${url.search}`
  const headers = new Headers()
  request.headers.forEach((v, k) => {
    if (["authorization", "content-type", "accept"].includes(k.toLowerCase())) {
      headers.set(k, v)
    }
  })
  const body = await request.text()
  const res = await fetch(backendUrl, {
    method: "POST",
    headers,
    body: body || undefined,
  })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const url = new URL(request.url)
  const backendUrl = `${backendBase()}/${path.join("/")}${url.search}`
  const headers = new Headers()
  request.headers.forEach((v, k) => {
    if (["authorization", "content-type", "accept"].includes(k.toLowerCase())) {
      headers.set(k, v)
    }
  })
  const res = await fetch(backendUrl, { method: "DELETE", headers })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  })
}
