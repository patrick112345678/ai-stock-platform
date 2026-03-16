"use client"

import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-16">
          <div className="text-2xl font-bold">AI 股票分析平台</div>

          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
            >
              登入
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200"
            >
              註冊
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-zinc-400 mb-4">AI Research / Stock / Crypto</div>
            <h1 className="text-5xl font-bold leading-tight mb-6">
              用更直覺的方式
              <br />
              看股票、看市場、看 AI 分析
            </h1>
            <p className="text-zinc-400 text-lg mb-8">
              整合股票、加密貨幣、自選股、K 線圖、AI 分析與排行榜，
              打造你的個人研究平台。
            </p>

            <div className="flex gap-4">
              <Link
                href="/register"
                className="px-5 py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200"
              >
                免費開始
              </Link>
              <Link
                href="/login"
                className="px-5 py-3 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700"
              >
                已有帳號登入
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-zinc-800 p-4">
                <div className="text-zinc-400 text-sm">AAPL</div>
                <div className="text-xl font-bold mt-2">250.12</div>
                <div className="text-red-400 mt-1">-2.20%</div>
              </div>
              <div className="rounded-xl bg-zinc-800 p-4">
                <div className="text-zinc-400 text-sm">NVDA</div>
                <div className="text-xl font-bold mt-2">...</div>
                <div className="text-green-400 mt-1">+1.84%</div>
              </div>
              <div className="rounded-xl bg-zinc-800 p-4">
                <div className="text-zinc-400 text-sm">BTC</div>
                <div className="text-xl font-bold mt-2">...</div>
                <div className="text-green-400 mt-1">+0.92%</div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-zinc-800 p-5">
              <div className="text-lg font-semibold mb-2">平台特色</div>
              <ul className="text-zinc-400 space-y-2">
                <li>• 股票 / Crypto 一站式研究</li>
                <li>• 自選股與個人化 Watchlist</li>
                <li>• AI 分析與市場摘要</li>
                <li>• 排行榜、Scanner、技術面整合</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}