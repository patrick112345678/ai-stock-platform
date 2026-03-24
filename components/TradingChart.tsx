"use client"

import { memo, useEffect, useRef } from "react"
import type { IChartApi, ISeriesApi } from "lightweight-charts"
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  UTCTimestamp,
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
  const result: { time: UTCTimestamp; value: number }[] = []

  for (let i = 0; i < data.length; i++) {
    if (i < period) continue

    let sum = 0

    for (let j = 0; j < period; j++) {
      sum += data[i - j].close
    }

    result.push({
      time: Math.floor(new Date(data[i].time).getTime() / 1000) as UTCTimestamp,
      value: sum / period,
    })
  }

  return result
}

type SeriesBundle = {
  candle: ISeriesApi<"Candlestick">
  volume: ISeriesApi<"Histogram">
  ma20: ISeriesApi<"Line">
  ma50: ISeriesApi<"Line">
}

function TradingChartInner({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<SeriesBundle | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    if (!data?.length) {
      chartRef.current?.remove()
      chartRef.current = null
      seriesRef.current = null
      return
    }

    if (!chartRef.current) {
      const chart = createChart(el, {
        height: 520,
        layout: {
          background: { type: ColorType.Solid, color: "#18181b" },
          textColor: "#d4d4d8",
        },
        grid: {
          vertLines: { color: "#27272a" },
          horzLines: { color: "#27272a" },
        },
      })

      chartRef.current = chart
      seriesRef.current = {
        candle: chart.addSeries(CandlestickSeries),
        volume: chart.addSeries(HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "",
        }),
        ma20: chart.addSeries(LineSeries, {
          color: "#facc15",
          lineWidth: 2,
        }),
        ma50: chart.addSeries(LineSeries, {
          color: "#60a5fa",
          lineWidth: 2,
        }),
      }
    }

    const s = seriesRef.current
    if (!s) return

    const formatted = data.map((d) => ({
      time: Math.floor(new Date(d.time).getTime() / 1000) as UTCTimestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    s.candle.setData(formatted)

    const volume = data.map((d) => ({
      time: Math.floor(new Date(d.time).getTime() / 1000) as UTCTimestamp,
      value: d.volume || 0,
      color: d.close > d.open ? "#22c55e" : "#ef4444",
    }))

    s.volume.setData(volume)

    const ma20 = calculateMA(data, 20)
    const ma50 = calculateMA(data, 50)

    s.ma20.setData(ma20)
    s.ma50.setData(ma50)

    requestAnimationFrame(() => {
      chartRef.current?.timeScale().fitContent()
    })
  }, [data])

  useEffect(() => {
    return () => {
      chartRef.current?.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="w-full h-[520px]" />
}

export default memo(TradingChartInner)
