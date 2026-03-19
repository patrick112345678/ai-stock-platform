/**
 * 代理 /api/* 到後端，並轉發 Authorization 等 headers（Next.js rewrite 預設不轉發）
 */
const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const url = new URL(request.url)
  const backendUrl = `${BACKEND}/${path.join("/")}${url.search}`
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
  const backendUrl = `${BACKEND}/${path.join("/")}${url.search}`
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
  const backendUrl = `${BACKEND}/${path.join("/")}${url.search}`
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
