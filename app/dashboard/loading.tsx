import { DashboardBootSkeleton } from "@/components/LoadingShell"

/** 從其他頁導向 /dashboard 時的瞬間骨架（與客戶端驗證骨架風格一致） */
export default function DashboardLoading() {
  return <DashboardBootSkeleton />
}
