"use client"

/**
 * 專業 AI 研究報表卡片：支援新結構化 JSON 與舊格式
 */
type AIReport = {
  one_line?: string
  technical?: {
    trend?: string
    ma_structure?: string
    rsi_macd_volume?: string
    support_resistance?: string
    technical_risk?: string
  }
  fundamental?: {
    pe_comment?: string
    summary?: string
  }
  rating?: {
    bias?: string
    risk_level?: string
    medium_term_view?: string
  }
  action?: {
    suggestion?: string
    watch_points?: string
    entry_conditions?: string
    risk_reminder?: string
  }
  trend?: string
  valuation?: string
  risk?: string
  summary?: string
  action_short?: string
  action?: string
  confidence?: number
}

export function AIReportCard({ report }: { report: AIReport | null }) {
  if (!report) return null

  const hasStructured = report.technical || report.rating || report.action
  const oneLine = report.one_line || report.summary
  const bias = report.rating?.bias || report.trend
  const riskLevel = report.rating?.risk_level || report.risk
  const actionShort = report.action?.suggestion || report.action_short || report.action

  return (
    <div className="space-y-4">
      {oneLine && (
        <div className="rounded-xl border border-violet-800/50 bg-violet-950/20 p-4">
          <div className="text-xs text-violet-300 mb-1">一句話摘要</div>
          <div className="font-semibold text-white leading-relaxed">{oneLine}</div>
        </div>
      )}

      {hasStructured ? (
        <>
          {(report.technical?.trend || report.technical?.ma_structure || report.technical?.rsi_macd_volume) && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
              <div className="text-sm font-semibold text-zinc-300 mb-3">技術面分析</div>
              <div className="space-y-2 text-sm">
                {report.technical.trend && (
                  <div>
                    <span className="text-zinc-500">趨勢方向：</span>
                    <span className="text-white">{report.technical.trend}</span>
                  </div>
                )}
                {report.technical.ma_structure && (
                  <div>
                    <span className="text-zinc-500">均線結構：</span>
                    <span className="text-zinc-200">{report.technical.ma_structure}</span>
                  </div>
                )}
                {report.technical.rsi_macd_volume && (
                  <div>
                    <span className="text-zinc-500">RSI / MACD / 量價：</span>
                    <span className="text-zinc-200">{report.technical.rsi_macd_volume}</span>
                  </div>
                )}
                {report.technical.support_resistance && (
                  <div>
                    <span className="text-zinc-500">支撐壓力：</span>
                    <span className="text-zinc-200">{report.technical.support_resistance}</span>
                  </div>
                )}
                {report.technical.technical_risk && (
                  <div>
                    <span className="text-zinc-500">技術風險：</span>
                    <span className="text-amber-300">{report.technical.technical_risk}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {(report.fundamental?.pe_comment || report.fundamental?.summary) && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
              <div className="text-sm font-semibold text-zinc-300 mb-3">基本面摘要</div>
              <div className="space-y-2 text-sm text-zinc-200">
                {report.fundamental.pe_comment && <div>{report.fundamental.pe_comment}</div>}
                {report.fundamental.summary && <div>{report.fundamental.summary}</div>}
              </div>
            </div>
          )}

          {(bias || riskLevel || report.rating?.medium_term_view) && (
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4">
              <div className="text-sm font-semibold text-emerald-300 mb-3">綜合評等</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {bias && (
                  <span className="px-2 py-1 rounded-md text-xs bg-zinc-800 border border-zinc-600">
                    偏多/中性/偏空：{bias}
                  </span>
                )}
                {riskLevel && (
                  <span className="px-2 py-1 rounded-md text-xs bg-amber-900/40 text-amber-300 border border-amber-700/50">
                    風險等級：{riskLevel}
                  </span>
                )}
                {report.confidence != null && (
                  <span className="px-2 py-1 rounded-md text-xs bg-zinc-800 border border-zinc-600">
                    信心度 {report.confidence}
                  </span>
                )}
              </div>
              {report.rating?.medium_term_view && (
                <div className="text-sm text-zinc-200">{report.rating.medium_term_view}</div>
              )}
            </div>
          )}

          {(actionShort || report.action?.watch_points || report.action?.entry_conditions || report.action?.risk_reminder) && (
            <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 p-4">
              <div className="text-sm font-semibold text-blue-300 mb-3">操作建議</div>
              <div className="space-y-2 text-sm">
                {actionShort && (
                  <div>
                    <span className="text-zinc-500">建議：</span>
                    <span className="text-white font-medium">{actionShort}</span>
                  </div>
                )}
                {report.action?.watch_points && (
                  <div>
                    <span className="text-zinc-500">觀察重點：</span>
                    <span className="text-zinc-200">{report.action.watch_points}</span>
                  </div>
                )}
                {report.action?.entry_conditions && (
                  <div>
                    <span className="text-zinc-500">進場條件：</span>
                    <span className="text-zinc-200">{report.action.entry_conditions}</span>
                  </div>
                )}
                {report.action?.risk_reminder && (
                  <div>
                    <span className="text-zinc-500">風險提醒：</span>
                    <span className="text-amber-300">{report.action.risk_reminder}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 space-y-2">
          <div><span className="text-zinc-500">趨勢：</span>{report.trend || "-"}</div>
          <div><span className="text-zinc-500">估值：</span>{report.valuation || "-"}</div>
          <div><span className="text-zinc-500">風險：</span>{report.risk || "-"}</div>
          <div><span className="text-zinc-500">建議：</span>{actionShort || report.action || "-"}</div>
          {report.confidence != null && (
            <div><span className="text-zinc-500">信心度：</span>{report.confidence}</div>
          )}
        </div>
      )}
    </div>
  )
}
