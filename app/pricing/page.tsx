"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

const USD_MONTHLY = 3

type PlanId = "1m" | "6m" | "12m"

const PLANS: {
  id: PlanId
  label: string
  months: number
  discountPct: number
  badge?: string
}[] = [
  { id: "1m", label: "月付", months: 1, discountPct: 0 },
  { id: "6m", label: "6 個月", months: 6, discountPct: 20, badge: "省 20%" },
  { id: "12m", label: "12 個月", months: 12, discountPct: 30, badge: "省 30% · 最划算" },
]

function money(n: number) {
  return n.toFixed(2)
}

export default function PricingPage() {
  const [selected, setSelected] = useState<PlanId>("12m")

  const rows = useMemo(() => {
    return PLANS.map((p) => {
      const full = USD_MONTHLY * p.months
      const factor = 1 - p.discountPct / 100
      const total = full * factor
      const perMo = total / p.months
      return { ...p, full, total, perMo }
    })
  }, [])

  const current = rows.find((r) => r.id === selected) ?? rows[2]

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <div className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Premium</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">解鎖 AI 研究與每日機會</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
            參考 TradingView 式方案：以 USD 計價。金流即將串接藍新（NewebPay），目前僅展示方案與試算。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800"
            >
              返回看盤
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-violet-600 bg-violet-600/90 px-4 py-2 text-sm text-white hover:bg-violet-500"
            >
              已訂閱？前往登入
            </Link>
          </div>
        </div>

        <div className="mb-8 flex justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-1 sm:inline-flex">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                selected === r.id
                  ? "bg-zinc-100 text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className={`relative flex flex-col rounded-2xl border p-6 transition ${
                r.id === "12m"
                  ? "border-violet-500/80 bg-gradient-to-b from-violet-950/40 to-zinc-950 shadow-[0_0_40px_-12px_rgba(139,92,246,0.5)]"
                  : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              {r.badge ? (
                <span className="absolute right-4 top-4 rounded-full bg-violet-600/90 px-2.5 py-0.5 text-xs font-medium text-white">
                  {r.badge}
                </span>
              ) : null}
              <h2 className="text-lg font-semibold text-zinc-100">{r.label}</h2>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">${money(r.perMo)}</span>
                <span className="text-sm text-zinc-500">USD / 月</span>
              </div>
              {r.discountPct > 0 ? (
                <p className="mt-1 text-xs text-zinc-500">
                  原價 ${money(USD_MONTHLY)}/月 × {r.months} 個月 = ${money(r.full)}，折抵 {r.discountPct}% 後共{" "}
                  <span className="text-emerald-400">${money(r.total)}</span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-zinc-500">每 {r.months} 個月續扣一次 · 單期 ${money(r.total)}</p>
              )}
              <ul className="mt-6 flex-1 space-y-2 text-sm text-zinc-300">
                <li className="flex gap-2">
                  <span className="text-emerald-400">✓</span> AI 每日機會
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400">✓</span> 完整 AI 研究報告
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400">✓</span> 自選股 AI 深度分析
                </li>
              </ul>
              <button
                type="button"
                disabled
                className="mt-6 w-full rounded-xl border border-zinc-600 bg-zinc-800 py-3 text-sm font-medium text-zinc-400"
              >
                即將開放付款（藍新）
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 text-center text-sm text-zinc-500">
          已選方案試算：
          <span className="ml-2 text-zinc-200">
            {current.label} · 每期總計 <strong className="text-white">${money(current.total)} USD</strong>（約 $
            {money(current.perMo)} / 月）
          </span>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          實際扣款幣別與稅費以藍新結帳頁為準。訂閱開通後將與帳號方案（plan_code）綁定。
        </p>
      </div>
    </div>
  )
}
