import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface DataPaginationProps {
  ariaLabel?: string;
  count: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
}

export function DataPagination({
  ariaLabel = "Results pagination",
  count,
  itemLabel = "results",
  onPageChange,
  page,
  pageSize,
}: DataPaginationProps) {
  if (!count) return null;
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const firstResult = (currentPage - 1) * pageSize + 1;
  const lastResult = Math.min(currentPage * pageSize, count);
  const items = getPageItems(currentPage, pageCount);

  return (
    <footer className="mt-4 flex flex-col items-center gap-3 border-t border-line pt-4 sm:grid sm:grid-cols-[1fr_auto_1fr]">
      <span aria-hidden="true" className="hidden sm:block" />
      {pageCount > 1 ? (
        <Pagination aria-label={ariaLabel} className="w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                showLabel
              />
            </PaginationItem>
            {items.map((item, index) => item === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationButton
                  active={item === currentPage}
                  aria-label={`Page ${item}`}
                  className={item === currentPage ? "border-line bg-raised text-copy" : undefined}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </PaginationButton>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                aria-label="Next page"
                disabled={currentPage === pageCount}
                onClick={() => onPageChange(currentPage + 1)}
                showLabel
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : <span aria-hidden="true" />}
      <span className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted sm:justify-self-end">
        Showing {firstResult}–{lastResult} of {count} {itemLabel}
      </span>
    </footer>
  );
}

function getPageItems(page: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "ellipsis", pageCount];
  if (page >= pageCount - 3) {
    return [1, "ellipsis", pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  }
  return [1, "ellipsis", page - 1, page, page + 1, "ellipsis", pageCount];
}
