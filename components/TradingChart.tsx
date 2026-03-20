"use client"

import { useEffect, useRef } from "react"
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  UTCTimestamp
} from "lightweight-charts"

type Candle = {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

type Props = {
  data: Candle[]
}

function calculateMA(data: Candle[], period: number) {
  const result: any[] = []

  for (let i = 0; i < data.length; i++) {
    if (i < period) continue

    let sum = 0

    for (let j = 0; j < period; j++) {
      sum += data[i - j].close
    }

    result.push({
      time: Math.floor(new Date(data[i].time).getTime() / 1000) as UTCTimestamp,
      value: sum / period
    })
  }

  return result
}

export default function TradingChart({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !data?.length) return

    const chart = createChart(ref.current, {
      height: 520,
      layout: {
        background: { type: ColorType.Solid, color: "#18181b" },
        textColor: "#d4d4d8"
      },
      grid: {
        vertLines: { color: "#27272a" },
        horzLines: { color: "#27272a" }
      }
    })

    const candleSeries = chart.addSeries(CandlestickSeries)

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: ""
    })

    const ma20Series = chart.addSeries(LineSeries, {
      color: "#facc15",
      lineWidth: 2
    })

    const ma50Series = chart.addSeries(LineSeries, {
      color: "#60a5fa",
      lineWidth: 2
    })

    const formatted = data.map(d => ({
      time: Math.floor(new Date(d.time).getTime() / 1000) as UTCTimestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close
    }))

    candleSeries.setData(formatted)

    const volume = data.map(d => ({
      time: Math.floor(new Date(d.time).getTime() / 1000) as UTCTimestamp,
      value: d.volume || 0,
      color: d.close > d.open ? "#22c55e" : "#ef4444"
    }))

    volumeSeries.setData(volume)

    const ma20 = calculateMA(data, 20)
    const ma50 = calculateMA(data, 50)

    ma20Series.setData(ma20)
    ma50Series.setData(ma50)

    chart.timeScale().fitContent()

    return () => chart.remove()
  }, [data])

  return <div ref={ref} className="w-full h-[520px]" />
}