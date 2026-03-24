/** 輕量骨架／轉場，減少整頁白字「載入中」的頓感 */

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block size-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200 ${className}`}
      aria-hidden
    />
  )
}

/** 進入看盤前驗證 session */
export function DashboardBootSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <div className="h-12 shrink-0 animate-pulse border-b border-zinc-800/80 bg-zinc-950/90" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:flex-row sm:p-6">
        <div className="hidden w-56 shrink-0 animate-pulse flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3 sm:flex">
          <div className="h-10 rounded-lg bg-zinc-800/80" />
          <div className="h-24 rounded-lg bg-zinc-800/60" />
          <div className="h-9 rounded-lg bg-zinc-800/70" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="h-8 w-2/3 max-w-sm animate-pulse rounded-lg bg-zinc-800/70" />
          <div className="h-4 w-1/2 max-w-xs animate-pulse rounded bg-zinc-800/50" />
          <div className="mt-2 min-h-[min(45vh,320px)] animate-pulse rounded-xl border border-zinc-800/50 bg-zinc-900/30" />
        </div>
      </div>
      <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-950/90 px-4 py-2 text-xs text-zinc-500 shadow-lg backdrop-blur-sm">
        <Spinner className="size-4 border-zinc-600 border-t-violet-400" />
        <span>載入工作區…</span>
      </div>
    </div>
  )
}

/** 登入／註冊頁 Suspense 用 */
export function AuthCardSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-8">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-8">
        <div className="mx-auto h-8 w-24 animate-pulse rounded-lg bg-zinc-800/70" />
        <div className="h-10 animate-pulse rounded-xl bg-zinc-800/50" />
        <div className="h-10 animate-pulse rounded-xl bg-zinc-800/50" />
        <div className="h-11 animate-pulse rounded-xl bg-zinc-800/60" />
      </div>
    </div>
  )
}

/** 內嵌區塊：取代大段「載入中…」純文字 */
export function InlineLoading({ label = "更新中…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-500">
      <Spinner className="size-4 border-zinc-600 border-t-zinc-300" />
      <span>{label}</span>
    </div>
  )
}
