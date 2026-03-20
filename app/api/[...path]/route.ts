/** 在 Render/Vercel 上避免誤用 Edge，proxy fetch 較穩 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * 代理 /api/* 到後端，並轉發 Authorization 等 headers（Next.js rewrite 預設不轉發）
 *
 * 部署重點：瀏覽器未設 NEXT_PUBLIC_API_BASE_URL 時會打同源 /api/*，此程式在「伺服器」上轉發。
 * 若只部署前端到 Vercel 等，務必在專案環境變數設定其一（指向 Render 後端，勿尾隨 /）：
 * - BACKEND_API_URL（建議，僅伺服器可見）或
 * - NEXT_PUBLIC_API_BASE_URL 或 NEXT_PUBLIC_API_URL（與 lib/api.ts 直連後端時一致）
 * 否則預設會連 127.0.0.1:8000，生產環境登入會失敗且回應體常為空 →「請稍後再試」。
 */
function backendBase(): string {
  const fromServer =
    process.env.BACKEND_API_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")
  return fromServer || "http://127.0.0.1:8000"
}

function pickForwardHeaders(request: Request): Headers {
  const headers = new Headers()
  request.headers.forEach((v, k) => {
    if (["authorization", "content-type", "accept"].includes(k.toLowerCase())) {
      headers.set(k, v)
    }
  })
  return headers
}

/** 代理連線失敗時回 JSON，避免瀏覽器收到空 body →「請稍後再試」無法排查 */
function proxyConnectionErrorResponse(err: unknown): Response {
  const base = backendBase()
  const reason = err instanceof Error ? err.message : String(err)
  const localhost =
    base.includes("127.0.0.1") || base.includes("localhost")
  const detail = localhost
    ? `前端 /api 代理目前指向本機 ${base}，在 Vercel／Render Static 等環境無法連到你的後端。請在「前端」專案設定環境變數 BACKEND_API_URL、NEXT_PUBLIC_API_BASE_URL 或 NEXT_PUBLIC_API_URL＝你的後端 HTTPS 根網址（無結尾 /），儲存後重新部署前端。連線錯誤：${reason}`
    : `無法連線後端 ${base}：${reason}。請確認後端已啟動、網址正確，且資料庫已設定。`
  return new Response(JSON.stringify({ detail }), {
    status: 502,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  })
}

async function forward(
  request: Request,
  path: string[],
  method: string,
  body?: string | null
): Promise<Response> {
  const url = new URL(request.url)
  const backendUrl = `${backendBase()}/${path.join("/")}${url.search}`
  const headers = pickForwardHeaders(request)
  let res: Response
  try {
    res = await fetch(backendUrl, {
      method,
      headers,
      body: method === "GET" || method === "DELETE" ? undefined : body || undefined,
    })
  } catch (e) {
    return proxyConnectionErrorResponse(e)
  }
  const text = await res.text()
  // 不可把上游 res.headers 整包丟進 new Response()：含 transfer-encoding、content-length 等
  // 在 Node/Next 會丟錯 → 客戶端只看到 500 text/plain「Internal Server Error」
  const outHeaders = new Headers()
  const ct = res.headers.get("content-type")
  if (ct) outHeaders.set("Content-Type", ct)
  return new Response(text, {
    status: res.status,
    statusText: res.statusText,
    headers: outHeaders,
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return forward(request, path, "GET")
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const body = await request.text()
  return forward(request, path, "POST", body)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return forward(request, path, "DELETE")
}
