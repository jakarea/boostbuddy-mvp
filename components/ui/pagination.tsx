import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: PaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Adjust start if end is at total pages
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startItem = (currentPage - 1) * (itemsPerPage || 10) + 1;
  const endItem = Math.min(currentPage * (itemsPerPage || 10), totalItems || 0);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 border-t border-zinc-200 dark:border-zinc-800">
      {/* Mobile/Desktop info text */}
      <div className="text-xs text-zinc-600 dark:text-zinc-400 text-center sm:text-left">
        {totalItems && itemsPerPage ? (
          <span>
            Showing <span className="font-semibold text-zinc-900 dark:text-white">{startItem}</span> to{" "}
            <span className="font-semibold text-zinc-900 dark:text-white">{endItem}</span> of{" "}
            <span className="font-semibold text-zinc-900 dark:text-white">{totalItems}</span> items
          </span>
        ) : (
          <span>
            Page <span className="font-semibold text-zinc-900 dark:text-white">{currentPage}</span> of{" "}
            <span className="font-semibold text-zinc-900 dark:text-white">{totalPages}</span>
          </span>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 px-2 text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        {/* Page Numbers - Hidden on very small mobile */}
        <div className="hidden xs:flex items-center gap-0.5">
          {/* First page link if not visible */}
          {pageNumbers[0] > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(1)}
                className="h-8 w-8 p-0 text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                1
              </Button>
              {pageNumbers[0] > 2 && (
                <span className="px-1 text-xs text-zinc-400">...</span>
              )}
            </>
          )}

          {/* Page numbers */}
          {pageNumbers.map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "ghost"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={`h-8 w-8 p-0 text-xs font-semibold ${
                page === currentPage
                  ? "bg-[#168BB0] hover:bg-[#0F7493] text-white dark:bg-[#45B0D2] dark:hover:bg-[#5BC4DD]"
                  : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {page}
            </Button>
          ))}

          {/* Last page link if not visible */}
          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="px-1 text-xs text-zinc-400">...</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                className="h-8 w-8 p-0 text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {totalPages}
              </Button>
            </>
          )}
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 px-2 text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </Button>
      </div>
    </div>
  );
}
