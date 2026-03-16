"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { loginUser, saveToken } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    try {
      setLoading(true)
      setError("")

      const data = await loginUser(username, password)
      saveToken(data.access_token)

      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <h1 className="text-3xl font-bold mb-6">登入</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm text-zinc-400">帳號</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 outline-none"
              placeholder="請輸入帳號"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm text-zinc-400">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 outline-none"
              placeholder="請輸入密碼"
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>

        <div className="mt-6 text-sm text-zinc-400">
          還沒有帳號？
          <a href="/register" className="ml-2 text-white underline">
            前往註冊
          </a>
        </div>
      </div>
    </div>
  )
}