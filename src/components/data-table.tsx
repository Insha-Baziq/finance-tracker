"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  initialSorting?: SortingState;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  initialSorting = [],
  sorting,
  onSortingChange,
  pageSize = 10,
  onRowClick,
  emptyTitle = "No results found",
  emptyDescription = "Try changing your search or filters.",
  toolbar,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>(initialSorting);
  const currentSorting = sorting ?? internalSorting;
  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    if (onSortingChange) onSortingChange(updater);
    else setInternalSorting(updater);
  };

  // TanStack Table is an intentionally stateful table engine; the app renders its model directly.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting: currentSorting },
    onSortingChange: handleSortingChange,
    initialState: { pagination: { pageSize } },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;
  const pageIndex = table.getState().pagination.pageIndex;
  const start = rows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, data.length);
  const pageCount = table.getPageCount();
  const visiblePages = pageCount <= 5
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : Array.from(new Set([1, pageIndex, pageIndex + 1, pageIndex + 2, pageCount])).filter((page) => page > 0 && page <= pageCount).sort((a, b) => a - b);

  return (
    <Card className="w-full overflow-hidden py-0">
      {toolbar && <div className="border-b p-4">{toolbar}</div>}
      <div className="border-b">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => (
                  <TableHead key={header.id} className="h-14 whitespace-nowrap text-muted-foreground first:pl-4">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={onRowClick ? "cursor-pointer transition-colors" : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="first:pl-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-36 text-center">
                  <div className="space-y-1">
                    <p className="font-medium">{emptyTitle}</p>
                    <p className="text-sm text-muted-foreground">{emptyDescription}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col md:max-lg:flex-col">
        <p className="text-sm whitespace-nowrap text-muted-foreground" aria-live="polite">
          {data.length === 0 ? "Showing 0 to 0 of 0 entries" : <>Showing {start} to {end} of {data.length} entries</>}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="disabled:pointer-events-none disabled:opacity-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          {visiblePages.map((page, index) => {
            const previousPage = visiblePages[index - 1];
            const hasGap = previousPage != null && page - previousPage > 1;
            return (
              <span key={page} className="inline-flex items-center gap-1">
                {hasGap && <MoreHorizontal aria-hidden="true" className="size-4 text-muted-foreground" />}
                <Button
                  type="button"
                  size="icon"
                  className={page !== pageIndex + 1 ? "bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40" : undefined}
                  onClick={() => table.setPageIndex(page - 1)}
                  aria-current={page === pageIndex + 1 ? "page" : undefined}
                  aria-label={`Go to page ${page}`}
                >
                  {page}
                </Button>
              </span>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            className="disabled:pointer-events-none disabled:opacity-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Go to next page"
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function SortableColumnHeader<TData>({
  label,
  column,
}: {
  label: string;
  column: import("@tanstack/react-table").Column<TData, unknown>;
}) {
  const direction = column.getIsSorted();
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ChevronsUpDown;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 gap-1.5 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      onClick={column.getToggleSortingHandler()}
    >
      {label}
      <Icon className="size-3.5" />
    </Button>
  );
}
