import type { AIReport } from "@/lib/api"

const TECH_LABELS: Record<string, string> = {
  trend: "趨勢結構",
  ma_structure: "均線結構",
  rsi_macd_volume: "RSI／MACD／量能",
  support_resistance: "支撐與壓力",
  technical_risk: "技術面風險",
}

const FUND_LABELS: Record<string, string> = {
  pe_comment: "估值說明",
  summary: "基本面摘要",
}

const ACTION_KEYS: { key: string; title: string }[] = [
  { key: "suggestion", title: "操作建議" },
  { key: "watch_points", title: "觀察重點" },
  { key: "entry_conditions", title: "進場條件" },
  { key: "risk_reminder", title: "風險提示" },
]

function confLabel(v: string | undefined) {
  const x = (v || "").toLowerCase()
  if (x === "high") return "高"
  if (x === "medium") return "中"
  if (x === "low") return "低"
  return v || "—"
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-zinc-700/70 bg-zinc-950/50 p-4">
      <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-300/90">{title}</h5>
      <div className="text-sm leading-7 text-zinc-200">{children}</div>
    </div>
  )
}

function Paragraph({ text }: { text: string }) {
  return <p className="whitespace-pre-wrap">{text}</p>
}

export function AiReportPanel({ report }: { report: AIReport }) {
  const r = report
  const tech = r.technical
  const fundDetail = r.fundamental_detail
  const actionDetail = r.action_detail
  const rating = r.rating as Record<string, string> | undefined
  const cd = r.confidence_detail

  const hasActionDetail =
    actionDetail &&
    typeof actionDetail === "object" &&
    ACTION_KEYS.some(({ key }) => {
      const raw = (actionDetail as Record<string, unknown>)[key]
      return raw != null && String(raw).trim() !== ""
    })

  return (
    <div className="space-y-4">
      {r.summary ? (
        <Section title="投資摘要">
          <Paragraph text={r.summary} />
        </Section>
      ) : null}

      {(rating?.bias || rating?.risk_level || rating?.medium_term_view) && (
        <Section title="綜合評級">
          <div className="flex flex-wrap gap-3 text-sm">
            {rating?.bias ? (
              <span className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-200">
                基調：<strong className="text-violet-300">{rating.bias}</strong>
              </span>
            ) : null}
            {rating?.risk_level ? (
              <span className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-200">
                風險：<strong className="text-amber-200/90">{rating.risk_level}</strong>
              </span>
            ) : null}
            {rating?.medium_term_view ? (
              <span className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-200">
                短中期：<span className="text-zinc-300">{rating.medium_term_view}</span>
              </span>
            ) : null}
          </div>
        </Section>
      )}

      {cd && (
        <Section title="結論可信度（模型自評）">
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            {[
              ["整體", cd.overall],
              ["基本面", cd.fundamental],
              ["技術面", cd.technical],
              ["產業面", cd.industry],
            ].map(([label, val]) => (
              <div key={label} className="rounded-md bg-zinc-900/80 px-2 py-1.5">
                <div className="text-zinc-500">{label}</div>
                <div className="font-medium text-zinc-200">{confLabel(val)}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {r.fundamental ? (
          <Section title="基本面">
            <Paragraph text={r.fundamental} />
          </Section>
        ) : null}

        {fundDetail && typeof fundDetail === "object" ? (
          <Section title="基本面（細項）">
            <ul className="list-none space-y-2">
              {Object.entries(fundDetail).map(([k, v]) => {
                if (v == null || String(v).trim() === "") return null
                const label = FUND_LABELS[k] || k
                return (
                  <li key={k}>
                    <span className="text-zinc-500">{label}：</span>
                    <span className="text-zinc-200">{String(v)}</span>
                  </li>
                )
              })}
            </ul>
          </Section>
        ) : null}
      </div>

      {typeof tech === "string" && tech.trim() ? (
        <Section title="技術面（綜述）">
          <Paragraph text={tech} />
        </Section>
      ) : null}

      {tech && typeof tech === "object" && !Array.isArray(tech) ? (
        <Section title="技術面（結構拆解）">
          <ul className="list-none space-y-3">
            {Object.entries(tech as Record<string, string>).map(([k, v]) => {
              if (v == null || String(v).trim() === "") return null
              const label = TECH_LABELS[k] || k
              return (
                <li key={k}>
                  <div className="text-xs font-medium text-violet-300/80">{label}</div>
                  <p className="mt-0.5 whitespace-pre-wrap text-zinc-200">{String(v)}</p>
                </li>
              )
            })}
          </ul>
        </Section>
      ) : null}

      {r.industry ? (
        <Section title="產業與同業環境">
          <Paragraph text={r.industry} />
        </Section>
      ) : null}

      {r.risk_opportunity ? (
        <Section title="風險與機會">
          <Paragraph text={r.risk_opportunity} />
        </Section>
      ) : null}

      {r.strategy ? (
        <Section title="策略與情境">
          <Paragraph text={r.strategy} />
        </Section>
      ) : null}

      {(r.trend || r.valuation || r.risk) && (
        <Section title="一覽標籤">
          <div className="flex flex-wrap gap-2 text-sm">
            {r.trend ? (
              <span className="rounded-md border border-zinc-600 px-2 py-1">趨勢：{r.trend}</span>
            ) : null}
            {r.valuation ? (
              <span className="rounded-md border border-zinc-600 px-2 py-1">估值：{r.valuation}</span>
            ) : null}
            {r.risk ? (
              <span className="rounded-md border border-zinc-600 px-2 py-1">風險：{r.risk}</span>
            ) : null}
          </div>
        </Section>
      )}

      {actionDetail && typeof actionDetail === "object" ? (
        <Section title="操作細節">
          <div className="space-y-3">
            {ACTION_KEYS.map(({ key, title }) => {
              const raw = (actionDetail as Record<string, unknown>)[key]
              if (raw == null || String(raw).trim() === "") return null
              return (
                <div key={key} className="border-l-2 border-violet-600/60 pl-3">
                  <div className="text-xs font-semibold text-violet-300">{title}</div>
                  <p className="mt-1 whitespace-pre-wrap text-zinc-200">{String(raw)}</p>
                </div>
              )
            })}
          </div>
        </Section>
      ) : null}

      {(r.action_short || (r.action && !hasActionDetail)) && (
        <Section title="重點結論">
          {r.action_short ? <Paragraph text={r.action_short} /> : null}
          {r.action && !hasActionDetail ? (
            <div className={r.action_short ? "mt-3 border-t border-zinc-700/60 pt-3" : ""}>
              <Paragraph text={r.action} />
            </div>
          ) : null}
        </Section>
      )}
    </div>
  )
}
