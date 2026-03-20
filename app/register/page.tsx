"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { registerUser } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    try {
      setLoading(true)
      setError("")

      await registerUser(username, email, password)
      router.push("/login")
    } catch (err) {
      setError(err instanceof Error ? err.message : "註冊失敗")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <h1 className="text-3xl font-bold mb-6">註冊</h1>

        <form onSubmit={handleRegister} className="space-y-4">
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
            <label className="block mb-2 text-sm text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 outline-none"
              placeholder="請輸入 Email"
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

          {error && <div className="text-red-400 text-sm break-words">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2"
          >
            {loading ? "註冊中..." : "註冊"}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-sm text-zinc-400">
          <div>
            已經有帳號？
            <a href="/login" className="ml-2 text-white underline">
              前往登入
            </a>
          </div>
          <div>
            <a href="/pricing" className="text-violet-400 underline hover:text-violet-300">
              查看付費方案（Premium）
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}