"use client"

import Link from "next/link"
import { useCallback, useState } from "react"
import type { CurrentUser } from "@/lib/api"
import { changePassword } from "@/lib/api"

function avatarLetter(username: string) {
  const c = (username || "?").trim().charAt(0)
  return c.toUpperCase()
}

function planDisplayName(code: string) {
  const c = (code || "free").toLowerCase()
  if (c === "free") return "免費方案"
  return `方案：${code}`
}

function daysLine(u: CurrentUser | null): string {
  if (!u) return "—"
  if (u.membership_unlimited) return "會員無到期限制"
  if (u.membership_days_remaining != null) {
    if (u.membership_days_remaining === 0) return "付費已到期，請續費"
    return `付費剩餘 ${u.membership_days_remaining} 天`
  }
  if (u.plan_expires_at) {
    try {
      return `到期：${new Date(u.plan_expires_at).toLocaleDateString("zh-TW")}`
    } catch {
      return "到期日：—"
    }
  }
  return "尚未設定到期日（免費或待開通）"
}

function PasswordForm({
  onDone,
  compact,
}: {
  onDone: () => void
  compact?: boolean
}) {
  const [cur, setCur] = useState("")
  const [next1, setNext1] = useState("")
  const [next2, setNext2] = useState("")
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg("")
    if (next1.length < 6) {
      setMsg("新密碼至少 6 字元")
      return
    }
    if (next1 !== next2) {
      setMsg("兩次新密碼不一致")
      return
    }
    setLoading(true)
    try {
      await changePassword(cur, next1)
      setMsg("已更新密碼")
      setCur("")
      setNext1("")
      setNext2("")
      onDone()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "變更失敗")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className={compact ? "space-y-2" : "space-y-3"}>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">目前密碼</label>
        <input
          type="password"
          value={cur}
          onChange={(e) => setCur(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm outline-none"
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">新密碼</label>
        <input
          type="password"
          value={next1}
          onChange={(e) => setNext1(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm outline-none"
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">確認新密碼</label>
        <input
          type="password"
          value={next2}
          onChange={(e) => setNext2(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm outline-none"
          autoComplete="new-password"
        />
      </div>
      {msg ? (
        <p className={`text-xs ${msg.includes("已更新") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-violet-600 py-2 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
      >
        {loading ? "送出中…" : "更新密碼"}
      </button>
    </form>
  )
}

export function AccountTopBar({
  user,
  menuOpen,
  onMenuOpenChange,
  onRefreshUser,
  onLogout,
}: {
  user: CurrentUser | null
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  onRefreshUser: () => Promise<void>
  onLogout: () => void
}) {
  const [showPwd, setShowPwd] = useState(false)
  const refresh = useCallback(async () => {
    await onRefreshUser()
  }, [onRefreshUser])

  return (
    <>
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[60] cursor-default bg-black/40"
          aria-label="關閉選單"
          onClick={() => onMenuOpenChange(false)}
        />
      ) : null}
      <header className="relative z-[65] flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/95 px-4 py-2">
        <span className="truncate text-sm text-zinc-500">看盤工作台</span>
        <div className="relative">
          <button
            type="button"
            onClick={() => onMenuOpenChange(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-600 bg-gradient-to-br from-violet-600 to-fuchsia-700 text-sm font-bold text-white shadow-md hover:opacity-90"
            title="會員選單"
          >
            {avatarLetter(user?.username ?? "")}
          </button>
          {menuOpen ? (
            <div className="fixed right-4 top-14 z-[80] w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl sm:right-6">
              <div className="mb-3 border-b border-zinc-800 pb-3">
                <div className="font-semibold text-white">{user?.username ?? "—"}</div>
                <div className="mt-1 text-xs text-zinc-400">{user?.email || "未綁定 Email"}</div>
                <div className="mt-2 text-xs text-zinc-300">{planDisplayName(user?.plan_code ?? "free")}</div>
                <div className="mt-1 text-xs text-amber-200/90">{daysLine(user)}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  AI 權限：{user?.ai_access ? <span className="text-emerald-400">已開通</span> : <span>未開通</span>}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <Link
                  href="/pricing"
                  className="block rounded-lg border border-zinc-700 px-3 py-2 text-center text-violet-200 hover:bg-zinc-800"
                  onClick={() => onMenuOpenChange(false)}
                >
                  付費方案
                </Link>
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-zinc-200 hover:bg-zinc-800"
                >
                  {showPwd ? "收合變更密碼" : "變更密碼"}
                </button>
                {showPwd ? (
                  <div className="pt-2">
                    <PasswordForm
                      compact
                      onDone={() => {
                        void refresh()
                      }}
                    />
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    onMenuOpenChange(false)
                    onLogout()
                  }}
                  className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-zinc-200 hover:bg-zinc-700"
                >
                  登出
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>
    </>
  )
}

export function AccountSidebarCard({
  user,
  collapsed,
  onOpenMenu,
  onRefreshUser,
  onLogout,
}: {
  user: CurrentUser | null
  collapsed: boolean
  onOpenMenu: () => void
  onRefreshUser: () => Promise<void>
  onLogout: () => void
}) {
  const [showPwd, setShowPwd] = useState(false)
  const refresh = useCallback(async () => {
    await onRefreshUser()
  }, [onRefreshUser])

  if (collapsed) {
    return (
      <div className="mb-3 flex justify-center">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-600 bg-gradient-to-br from-violet-600 to-fuchsia-700 text-sm font-bold text-white shadow-md hover:opacity-90"
          title="會員選單"
        >
          {avatarLetter(user?.username ?? "")}
        </button>
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-xl border border-zinc-700/80 bg-zinc-900/80 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-gradient-to-br from-violet-600 to-fuchsia-700 text-sm font-bold text-white">
          {avatarLetter(user?.username ?? "")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-white">{user?.username ?? "—"}</div>
          <div className="truncate text-xs text-zinc-500">{user?.email || ""}</div>
          <div className="mt-1 text-xs text-zinc-300">{planDisplayName(user?.plan_code ?? "free")}</div>
          <div className="text-xs text-amber-200/90">{daysLine(user)}</div>
          <div className="text-xs text-zinc-500">
            AI：{user?.ai_access ? <span className="text-emerald-400">已開通</span> : <span>未開通</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowPwd((v) => !v)}
          className="flex-1 rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
        >
          {showPwd ? "收合密碼" : "變更密碼"}
        </button>
        <Link
          href="/pricing"
          className="flex-1 rounded-lg border border-violet-700/50 bg-violet-950/40 px-2 py-1.5 text-center text-xs text-violet-200 hover:bg-violet-900/50"
        >
          付費
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-zinc-600 px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
        >
          登出
        </button>
      </div>
      {showPwd ? (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <PasswordForm
            compact
            onDone={() => {
              void refresh()
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
