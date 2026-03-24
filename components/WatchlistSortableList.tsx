"use client"

import type { ReactNode } from "react"
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

type Market = "TW" | "US" | "CRYPTO"

export type WatchlistRow = {
  id?: number | string
  symbol: string
  market: Market
  name?: string | null
}

type Props = {
  items: WatchlistRow[]
  selected: { symbol: string; market: Market }
  formatLabel: (symbol: string, name: string | null | undefined, market: Market) => ReactNode
  watchlistOverview: { id: number; symbol: string; market: string; change_percent?: number | null }[]
  onSelectItem: (item: WatchlistRow) => void
  onDeleteItem: (item: WatchlistRow) => void
  onReorder: (newOrder: WatchlistRow[]) => void | Promise<void>
}

function SortableRow(props: {
  item: WatchlistRow
  active: boolean
  formatLabel: Props["formatLabel"]
  watchlistOverview: Props["watchlistOverview"]
  onSelect: () => void
  onDelete: () => void
}) {
  const { item, active, formatLabel, watchlistOverview, onSelect, onDelete } = props
  const id = item.id != null ? String(item.id) : `sym-${item.symbol}`
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: item.id == null,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-md border px-2 py-2 transition ${
        active ? "bg-zinc-700/80 border-zinc-500" : "bg-zinc-900 border-transparent hover:bg-zinc-800"
      }`}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-zinc-500 hover:text-zinc-300 active:cursor-grabbing"
          aria-label="拖曳排序"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 min-w-0 text-left"
        >
          <div className="text-sm font-semibold leading-5 truncate">
            {formatLabel(item.symbol, item.name, item.market)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 leading-4 truncate">{item.market}</span>
            {(() => {
              const ov = watchlistOverview.find((o) => o.id === item.id)
              const pct = ov?.change_percent
              if (pct == null) return null
              const isUp = (pct ?? 0) >= 0
              return (
                <span className={`text-[11px] font-medium ${isUp ? "text-green-400" : "text-red-400"}`}>
                  {isUp ? "+" : ""}
                  {Number(pct).toFixed(2)}%
                </span>
              )
            })()}
          </div>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="text-[11px] text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0"
          title="移除"
        >
          刪除
        </button>
      </div>
    </div>
  )
}

export function WatchlistSortableList({
  items,
  selected,
  formatLabel,
  watchlistOverview,
  onSelectItem,
  onDeleteItem,
  onReorder,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const ids = items.map((x) => (x.id != null ? String(x.id) : `sym-${x.symbol}`))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((x) => (x.id != null ? String(x.id) : `sym-${x.symbol}`) === active.id)
    const newIndex = items.findIndex((x) => (x.id != null ? String(x.id) : `sym-${x.symbol}`) === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const newOrder = arrayMove(items, oldIndex, newIndex)
    void Promise.resolve(onReorder(newOrder)).catch((e) => console.error("watchlist reorder:", e))
  }

  if (items.length === 0) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {items.map((item) => {
            const active = selected.symbol === item.symbol && selected.market === item.market
            return (
              <SortableRow
                key={item.id != null ? String(item.id) : `${item.symbol}-${item.market}`}
                item={item}
                active={active}
                formatLabel={formatLabel}
                watchlistOverview={watchlistOverview}
                onSelect={() => onSelectItem(item)}
                onDelete={() => onDeleteItem(item)}
              />
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
