import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'
import { Table } from 'react-bootstrap'
import Pagination from './Pagination'

const ReactTable = ({
  options,
  columns,
  data,
  pageSize,
  showPagination,
  rowsPerPageList,
  tableClass,
  theadClass,
  getRowDomId,
  rowDomIdPrefix = 'table-row-',
  highlightedRowId,
  highlightDismissing,
  getRowClassName,
  initialPageIndex,
  emptyState,
}) => {
  const [pagination, setPagination] = useState({
    pageIndex: initialPageIndex ?? 0,
    pageSize: pageSize ?? 5,
  })
  const scrollAttemptRef = useRef(0)

  useEffect(() => {
    if (initialPageIndex != null) {
      setPagination((prev) => ({ ...prev, pageIndex: initialPageIndex }))
    }
  }, [initialPageIndex])

  const table = useReactTable({
    ...options,
    data,
    columns,
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
    getCoreRowModel: getCoreRowModel(),
    ...(showPagination && {
      getPaginationRowModel: getPaginationRowModel(),
    }),
  })
  const rows = table.getRowModel().rows
  const columnCount = table.getAllColumns().length

  useEffect(() => {
    if (!highlightedRowId || highlightDismissing) return

    if (initialPageIndex != null && pagination.pageIndex !== initialPageIndex) {
      setPagination((prev) => ({ ...prev, pageIndex: initialPageIndex }))
      return
    }

    let cancelled = false
    scrollAttemptRef.current = 0

    const tryScrollToRow = () => {
      if (cancelled) return
      const el = document.getElementById(`${rowDomIdPrefix}${highlightedRowId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      if (scrollAttemptRef.current < 20) {
        scrollAttemptRef.current += 1
        window.setTimeout(tryScrollToRow, 50)
      }
    }

    tryScrollToRow()
    return () => {
      cancelled = true
    }
  }, [highlightedRowId, highlightDismissing, initialPageIndex, pagination.pageIndex, data, rowDomIdPrefix])

  return (
    <>
      <Table hover responsive className={tableClass}>
        <thead className={theadClass}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} colSpan={header.colSpan} className={header.column.columnDef.meta?.className}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length > 0
            ? rows.map((row) => {
                const rowDomId = getRowDomId?.(row.original)
                const isHighlighted = highlightedRowId && rowDomId && String(highlightedRowId) === String(rowDomId)
                const rowClassName = getRowClassName?.(row.original, { isHighlighted, isDismissing: highlightDismissing })
                return (
                  <tr key={row.id} id={rowDomId ? `${rowDomIdPrefix}${rowDomId}` : undefined} className={rowClassName || undefined}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={cell.column.columnDef.meta?.className}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })
            : emptyState && (
                <tr className="table-empty-state-row">
                  <td colSpan={columnCount} className="p-0 border-0">
                    {emptyState}
                  </td>
                </tr>
              )}
        </tbody>
      </Table>

      {showPagination && rows.length > 0 && (
        <Pagination
          table={table}
          currentPage={table.getState().pagination.pageIndex + 1}
          totalPages={table.getPageCount()}
          rowsPerPageList={rowsPerPageList}
          pagination={pagination}
        />
      )}
    </>
  )
}
export default ReactTable
