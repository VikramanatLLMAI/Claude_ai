"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table"
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Ban,
  Brain,
  Eye,
  Wrench,
  MoreHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "@/components/admin/data-table-column-header"
import { DataTablePagination } from "@/components/admin/data-table-pagination"
import { cn } from "@/lib/utils"

export interface ModelData {
  id: string
  modelId: string
  displayName: string
  generationGroup: string
  inputPricePerToken: string | number
  outputPricePerToken: string | number
  thinkingPricePerToken: string | number
  cacheWritePricePerToken: string | number
  cacheReadPricePerToken: string | number
  supportsThinking: boolean
  supportsVision: boolean
  supportsTools: boolean
  thinkingType: string | null
  maxOutputTokens: number
  contextWindow: number
  status: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface ModelRegistryTableProps {
  models: ModelData[]
  onEdit: (model: ModelData) => void
  onDeprecate: (model: ModelData) => void
  onDelete: (model: ModelData) => void
  onRefresh: () => void
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function formatPricePerMTok(pricePerToken: string | number): string {
  const perToken =
    typeof pricePerToken === "string" ? parseFloat(pricePerToken) : pricePerToken
  if (isNaN(perToken) || perToken === 0) return "$0"
  const perMTok = perToken * 1_000_000
  if (perMTok >= 1) return `$${perMTok.toFixed(0)}`
  return `$${perMTok.toFixed(2)}`
}

const GENERATION_ORDER = ["Claude 4.6", "Claude 4.5", "Claude 4"]

function getGenerationOrder(group: string): number {
  const idx = GENERATION_ORDER.indexOf(group)
  return idx === -1 ? GENERATION_ORDER.length : idx
}

export function ModelRegistryTable({
  models,
  onEdit,
  onDeprecate,
  onDelete,
}: ModelRegistryTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "sortOrder", desc: false },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    new Set(GENERATION_ORDER)
  )
  const [deleteTarget, setDeleteTarget] = React.useState<ModelData | null>(null)
  const [deprecateTarget, setDeprecateTarget] = React.useState<ModelData | null>(
    null
  )

  // Expand all groups when models first load
  React.useEffect(() => {
    if (models.length > 0) {
      const groups = new Set(models.map((m) => m.generationGroup || "Other"))
      setExpandedGroups(groups)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models.length])

  const columns = React.useMemo<ColumnDef<ModelData>[]>(
    () => [
      {
        accessorKey: "displayName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Model" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.getValue("displayName")}
          </span>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "modelId",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Model ID" enableFilter={false} />
        ),
        cell: ({ row }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
            {row.getValue("modelId")}
          </code>
        ),
        enableSorting: true,
        enableColumnFilter: false,
      },
      {
        accessorKey: "generationGroup",
        header: "Generation",
        enableSorting: true,
        enableColumnFilter: true,
        // Hidden as column; used for grouping only
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" enableFilter={false} />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as string
          return (
            <Badge
              variant={status === "ACTIVE" ? "default" : "secondary"}
              className={
                status === "ACTIVE"
                  ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
              }
            >
              {status === "ACTIVE" ? "Active" : "Deprecated"}
            </Badge>
          )
        },
        enableSorting: true,
        enableColumnFilter: false,
      },
      {
        id: "thinkingType",
        accessorKey: "thinkingType",
        header: "Thinking",
        cell: ({ row }) => {
          const thinkingType = row.getValue("thinkingType") as string | null
          if (!thinkingType) return <span className="text-xs text-muted-foreground">—</span>
          return (
            <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
              <Brain className="h-3 w-3" />
              {thinkingType}
            </Badge>
          )
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        id: "capabilities",
        header: "Capabilities",
        cell: ({ row }) => {
          const model = row.original
          return (
            <div className="flex flex-wrap gap-1">
              {model.supportsVision && (
                <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                  <Eye className="h-3 w-3" />
                  vision
                </Badge>
              )}
              {model.supportsTools && (
                <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                  <Wrench className="h-3 w-3" />
                  tools
                </Badge>
              )}
            </div>
          )
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        id: "maxOutputTokens",
        accessorKey: "maxOutputTokens",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Max Output" enableFilter={false} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatTokenCount(row.getValue("maxOutputTokens"))}
          </span>
        ),
        enableSorting: true,
        enableColumnFilter: false,
      },
      {
        id: "pricing",
        header: "Pricing ($/MTok)",
        cell: ({ row }) => {
          const model = row.original
          return (
            <span className="text-xs text-muted-foreground">
              In: {formatPricePerMTok(model.inputPricePerToken)}
              {" / "}
              Out: {formatPricePerMTok(model.outputPricePerToken)}
            </span>
          )
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        id: "sortOrder",
        accessorKey: "sortOrder",
        enableSorting: true,
        enableHiding: true,
        header: () => null,
        cell: () => null,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const model = row.original
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(model)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </DropdownMenuItem>
                  {model.status === "ACTIVE" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeprecateTarget(model)}
                        className="text-amber-600 focus:text-amber-600"
                      >
                        <Ban className="mr-2 h-3.5 w-3.5" />
                        Deprecate
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(model)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onEdit, onDeprecate, onDelete]
  )

  const table = useReactTable({
    data: models,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility: {
        generationGroup: false,
        sortOrder: false,
      },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  })

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      onDelete(deleteTarget)
      setDeleteTarget(null)
    }
  }

  const handleDeprecateConfirm = () => {
    if (deprecateTarget) {
      onDeprecate(deprecateTarget)
      setDeprecateTarget(null)
    }
  }

  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No models found.</p>
        <p className="text-xs mt-1">
          Click &ldquo;Add Model&rdquo; to register your first model.
        </p>
      </div>
    )
  }

  // Group rows by generationGroup for visual section headers (Option B)
  const allRows = table.getRowModel().rows

  // Build ordered list of generation groups
  const generationGroups = Array.from(
    new Set(models.map((m) => m.generationGroup || "Other"))
  ).sort((a, b) => getGenerationOrder(a) - getGenerationOrder(b))

  // Map rows by group
  const rowsByGroup = generationGroups.reduce<Record<string, Row<ModelData>[]>>(
    (acc, group) => {
      acc[group] = allRows.filter((r) => r.original.generationGroup === group)
      return acc
    },
    {}
  )

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  // Visible columns (excluding hidden ones)
  const visibleColumns = table
    .getAllColumns()
    .filter((col) => col.getIsVisible() && col.id !== "sortOrder")

  return (
    <>
      {/* Global search */}
      <div className="mb-3 flex items-center gap-2">
        <Input
          placeholder="Search models..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      {/* Grouped table */}
      <div className="space-y-2">
        {generationGroups.map((group) => {
          const groupRows = rowsByGroup[group] ?? []
          const isExpanded = expandedGroups.has(group)
          // Count models in original (not filtered) data for badge
          const totalInGroup = models.filter(
            (m) => (m.generationGroup || "Other") === group
          ).length

          return (
            <div
              key={group}
              className="rounded-lg border border-border overflow-hidden"
            >
              {/* Generation header */}
              <button
                onClick={() => toggleGroup(group)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold text-foreground">
                  {group}
                </span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {totalInGroup} model{totalInGroup !== 1 ? "s" : ""}
                </Badge>
                {globalFilter && groupRows.length !== totalInGroup && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {groupRows.length} matching
                  </span>
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-border overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr
                          key={headerGroup.id}
                          className="border-b border-border bg-muted/20"
                        >
                          {headerGroup.headers
                            .filter(
                              (h) =>
                                h.column.getIsVisible() &&
                                h.column.id !== "sortOrder"
                            )
                            .map((header) => (
                              <th
                                key={header.id}
                                className="px-4 py-2 text-left text-sm font-medium text-muted-foreground"
                              >
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </th>
                            ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {groupRows.length > 0 ? (
                        groupRows.map((row) => (
                          <tr
                            key={row.id}
                            className={cn(
                              "border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors",
                              row.original.status === "DEPRECATED" && "opacity-60"
                            )}
                          >
                            {row
                              .getVisibleCells()
                              .filter((cell) => cell.column.id !== "sortOrder")
                              .map((cell) => (
                                <td key={cell.id} className="px-4 py-3 text-sm">
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </td>
                              ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={visibleColumns.length}
                            className="h-16 text-center text-sm text-muted-foreground"
                          >
                            {globalFilter
                              ? "No models match your search."
                              : "No models in this generation."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      <div className="mt-3">
        <DataTablePagination table={table} />
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Model</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.displayName}</strong>? This action cannot
              be undone. If the model is referenced by any roles, deletion will
              fail &mdash; consider deprecating instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deprecate confirmation dialog */}
      <Dialog
        open={!!deprecateTarget}
        onOpenChange={(open) => !open && setDeprecateTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deprecate Model</DialogTitle>
            <DialogDescription>
              Are you sure you want to deprecate{" "}
              <strong>{deprecateTarget?.displayName}</strong>? The model will
              be marked as deprecated and hidden from new role assignments.
              Existing roles that reference this model will continue to work.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeprecateTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleDeprecateConfirm}
            >
              Deprecate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
