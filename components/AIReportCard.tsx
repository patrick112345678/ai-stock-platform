"use client"

/**
 * 專業 AI 研究報表卡片：支援新結構化 JSON、可信度區塊與舊格式
 */
type ConfidenceDetail = {
  overall?: string
  fundamental?: string
  technical?: string
  industry?: string
}

type AIReport = {
  one_line?: string
  summary?: string
  fundamental?: string
  industry?: string
  risk_opportunity?: string
  strategy?: string
  confidence_detail?: ConfidenceDetail
  technical?: {
    trend?: string
    ma_structure?: string
    rsi_macd_volume?: string
    support_resistance?: string
    technical_risk?: string
  } | string
  fundamental_detail?: {
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
  } | string
  action_detail?: {
    suggestion?: string
    watch_points?: string
    entry_conditions?: string
    risk_reminder?: string
  }
  trend?: string
  valuation?: string
  risk?: string
  action_short?: string
  confidence?: number
}

const CONF_LABEL: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
}

export function AIReportCard({ report }: { report: AIReport | null }) {
  if (!report) return null

  const actionObj = typeof report.action === "object" ? report.action : report.action_detail
  const hasStructured = report.technical || report.rating || actionObj
  const oneLine = report.one_line || report.summary
  const bias = report.rating?.bias || report.trend
  const riskLevel = report.rating?.risk_level || report.risk
  const actionShort = actionObj?.suggestion || report.action_short || (typeof report.action === "string" ? report.action : undefined)

  const techObj = typeof report.technical === "object" ? report.technical : null

  return (
    <div className="space-y-4">
      {report.confidence_detail && (
        <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4">
          <div className="text-sm font-semibold text-amber-300 mb-2">📊 AI 分析可信度</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="text-zinc-500">技術面：</span>
              <span className="text-white">{CONF_LABEL[report.confidence_detail.technical || ""] || report.confidence_detail.technical || "-"}</span>
            </div>
            <div>
              <span className="text-zinc-500">基本面：</span>
              <span className="text-white">{CONF_LABEL[report.confidence_detail.fundamental || ""] || report.confidence_detail.fundamental || "-"}</span>
              {report.confidence_detail.fundamental === "low" && (
                <span className="text-amber-400 text-xs ml-1">（資料不足）</span>
              )}
            </div>
            <div>
              <span className="text-zinc-500">產業分析：</span>
              <span className="text-white">{CONF_LABEL[report.confidence_detail.industry || ""] || report.confidence_detail.industry || "-"}</span>
            </div>
            <div>
              <span className="text-zinc-500">整體：</span>
              <span className="text-white">{CONF_LABEL[report.confidence_detail.overall || ""] || report.confidence_detail.overall || "-"}</span>
            </div>
          </div>
        </div>
      )}

      {oneLine && (
        <div className="rounded-xl border border-violet-800/50 bg-violet-950/20 p-4">
          <div className="text-xs text-violet-300 mb-1">一句話摘要</div>
          <div className="font-semibold text-white leading-relaxed">{oneLine}</div>
        </div>
      )}

      {(report.fundamental || report.industry || report.risk_opportunity || report.strategy) && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 space-y-2">
          {report.fundamental && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">基本面</div>
              <div className="text-sm text-zinc-200">{report.fundamental}</div>
            </div>
          )}
          {report.industry && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">產業分析</div>
              <div className="text-sm text-zinc-200">{report.industry}</div>
            </div>
          )}
          {report.risk_opportunity && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">風險與機會</div>
              <div className="text-sm text-zinc-200">{report.risk_opportunity}</div>
            </div>
          )}
          {report.strategy && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">操作策略</div>
              <div className="text-sm text-zinc-200">{report.strategy}</div>
            </div>
          )}
        </div>
      )}

      {hasStructured ? (
        <>
          {(techObj?.trend || techObj?.ma_structure || techObj?.rsi_macd_volume || (typeof report.technical === "string" && report.technical)) && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
              <div className="text-sm font-semibold text-zinc-300 mb-3">技術面分析</div>
              <div className="space-y-2 text-sm">
                {techObj?.trend && (
                  <div>
                    <span className="text-zinc-500">趨勢方向：</span>
                    <span className="text-white">{techObj.trend}</span>
                  </div>
                )}
                {techObj?.ma_structure && (
                  <div>
                    <span className="text-zinc-500">均線結構：</span>
                    <span className="text-zinc-200">{techObj.ma_structure}</span>
                  </div>
                )}
                {(techObj?.rsi_macd_volume || (typeof report.technical === "string" && report.technical)) && (
                  <div>
                    <span className="text-zinc-500">RSI / MACD / 量價：</span>
                    <span className="text-zinc-200">{techObj?.rsi_macd_volume || (typeof report.technical === "string" ? report.technical : "")}</span>
                  </div>
                )}
                {techObj?.support_resistance && (
                  <div>
                    <span className="text-zinc-500">支撐壓力：</span>
                    <span className="text-zinc-200">{techObj.support_resistance}</span>
                  </div>
                )}
                {techObj?.technical_risk && (
                  <div>
                    <span className="text-zinc-500">技術風險：</span>
                    <span className="text-amber-300">{techObj.technical_risk}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {((report.fundamental_detail?.pe_comment || report.fundamental_detail?.summary) || (typeof report.fundamental === "string" && report.fundamental)) && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
              <div className="text-sm font-semibold text-zinc-300 mb-3">基本面摘要</div>
              <div className="space-y-2 text-sm text-zinc-200">
                {report.fundamental_detail?.pe_comment && <div>{report.fundamental_detail.pe_comment}</div>}
                {report.fundamental_detail?.summary && <div>{report.fundamental_detail.summary}</div>}
                {typeof report.fundamental === "string" && !report.fundamental_detail && <div>{report.fundamental}</div>}
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

          {(actionShort || actionObj?.watch_points || actionObj?.entry_conditions || actionObj?.risk_reminder) && (
            <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 p-4">
              <div className="text-sm font-semibold text-blue-300 mb-3">操作建議</div>
              <div className="space-y-2 text-sm">
                {actionShort && (
                  <div>
                    <span className="text-zinc-500">建議：</span>
                    <span className="text-white font-medium">{actionShort}</span>
                  </div>
                )}
                {actionObj?.watch_points && (
                  <div>
                    <span className="text-zinc-500">觀察重點：</span>
                    <span className="text-zinc-200">{actionObj.watch_points}</span>
                  </div>
                )}
                {actionObj?.entry_conditions && (
                  <div>
                    <span className="text-zinc-500">進場條件：</span>
                    <span className="text-zinc-200">{actionObj.entry_conditions}</span>
                  </div>
                )}
                {actionObj?.risk_reminder && (
                  <div>
                    <span className="text-zinc-500">風險提醒：</span>
                    <span className="text-amber-300">{actionObj.risk_reminder}</span>
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
          <div><span className="text-zinc-500">建議：</span>{actionShort || (typeof report.action === "string" ? report.action : (actionObj as { suggestion?: string } | undefined)?.suggestion) || "-"}</div>
          {report.confidence != null && (
            <div><span className="text-zinc-500">信心度：</span>{report.confidence}</div>
          )}
        </div>
      )}
    </div>
  )
}
