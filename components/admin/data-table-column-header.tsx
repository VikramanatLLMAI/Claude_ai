"use client"

import { Column } from "@tanstack/react-table"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  enableFilter?: boolean
  className?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  enableFilter = true,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const isSorted = column.getIsSorted()

  const SortIcon = isSorted === "asc"
    ? ChevronUp
    : isSorted === "desc"
      ? ChevronDown
      : ChevronsUpDown

  return (
    <div className={cn("flex flex-col gap-1 py-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-1 h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => column.toggleSorting(isSorted === "asc")}
      >
        {title}
        <SortIcon className="ml-1 size-3 shrink-0" />
      </Button>
      {enableFilter && column.getCanFilter() && (
        <Input
          className="h-7 text-xs"
          placeholder="Filter..."
          value={(column.getFilterValue() as string) ?? ""}
          onChange={(e) => column.setFilterValue(e.target.value)}
        />
      )}
    </div>
  )
}
