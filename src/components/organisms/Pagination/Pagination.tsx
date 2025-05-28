"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo } from "react";

import { Button, Select } from "@/components/molecules";
import { SelectItem } from "@/components/molecules/Select/Select";
import { DISPLAYED_PAGE_COUNT, PAGE_SIZE_OPTIONS } from "@/constants/pagination";

export type PaginationProps = {
  page?: number;
  total?: number;
  pageSize?: number;
  pageOptions?: number[];
  showPaginationInfo?: boolean;
  showPageSizeOptions?: boolean;
  unit?: string;
  showBorderTop?: boolean;
  color?: "primary" | "secondary" | "info" | "success" | "warning" | "error";
  className?: string;
  onPageChange?: (_page: number) => void;
  onPageSizeChange?: (_pageSize: number) => void;
};

const Pagination = ({
  page = 1,
  total = 1,
  pageSize = PAGE_SIZE_OPTIONS[0],
  pageOptions = PAGE_SIZE_OPTIONS,
  showPaginationInfo = true,
  showPageSizeOptions = false,
  unit,
  showBorderTop = true,
  color = "primary",
  className,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) => {
  const t = useTranslations("components");

  const totalPage = useMemo(() => Math.ceil(total / pageSize), [pageSize, total]);

  const options: SelectItem[] = useMemo(
    () =>
      pageOptions.map((option) => ({
        value: String(option),
        label: String(option),
      })),
    [pageOptions]
  );

  useEffect(() => {
    if (page > totalPage) {
      onPageChange && onPageChange(totalPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPage]);

  const displayedPages = useMemo(() => {
    let startPage = Math.max(1, page - Math.floor(DISPLAYED_PAGE_COUNT / 2));
    const endPage = Math.min(startPage + DISPLAYED_PAGE_COUNT - 1, totalPage);
    if (endPage - startPage < DISPLAYED_PAGE_COUNT - 1) {
      startPage = Math.max(1, endPage - DISPLAYED_PAGE_COUNT + 1);
    }

    const pageList: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pageList.push(i);
    }

    // Always display the first page, add ellipsis
    if (startPage > 1) {
      if (startPage > 2) {
        pageList.unshift(-1);
      }
      pageList.unshift(1);
    }

    // Always display the last page, add ellipsis
    if (endPage < totalPage) {
      if (endPage < totalPage - 1) {
        pageList.push(-1);
      }
      pageList.push(totalPage);
    }

    return pageList;
  }, [page, totalPage]);

  /**
   * Emit selected page to parent component
   */
  const handlePageChange = useCallback(
    (page: number) => () => {
      onPageChange && onPageChange(page);
    },
    [onPageChange]
  );

  const handlePageSizeChange = useCallback(
    (value: string) => {
      onPageSizeChange && onPageSizeChange(Number(value));
    },
    [onPageSizeChange]
  );

  return (
    <>
      {totalPage > 0 && (
        <div
          className={clsx(className, "flex items-center justify-between bg-white py-4 max-sm:px-4", {
            "border-t border-gray-200": showBorderTop,
          })}
        >
          <div className="flex flex-1 justify-between sm:hidden">
            <Button variant="outlined" color={color} onClick={handlePageChange(page - 1)} disabled={page === 1}>
              {t("pagination.prev")}
            </Button>
            <Button variant="outlined" color={color} onClick={handlePageChange(page + 1)} disabled={page === totalPage}>
              {t("pagination.next")}
            </Button>
          </div>

          <div
            className={clsx("hidden sm:flex sm:flex-1 sm:items-center ", {
              "sm:justify-between": showPaginationInfo,
              "sm:justify-end": !showPaginationInfo,
            })}
          >
            {showPaginationInfo && (
              <p className="text-sm text-gray-700">
                {t.rich("pagination.displaying_results", {
                  strong: (chunks) => <span className="font-medium">{chunks}</span>,
                  from: page === 1 ? 1 : (page - 1) * pageSize + 1,
                  to: page === totalPage ? total : page * pageSize,
                  total,
                  results: unit || t("pagination.results"),
                })}
              </p>
            )}
            <div
              className={clsx({
                "flex items-center gap-x-2": showPageSizeOptions,
              })}
            >
              {showPageSizeOptions && (
                <div className="w-20">
                  <Select items={options} placement="top" value={String(pageSize)} onChange={handlePageSizeChange} />
                </div>
              )}

              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100 disabled:opacity-50"
                >
                  <span className="sr-only">{t("pagination.prev")}</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>

                {displayedPages.map((item, i) =>
                  item === -1 ? (
                    <span
                      key={i}
                      className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={i}
                      aria-current={page === item && "page"}
                      onClick={handlePageChange(item)}
                      className={clsx(
                        "relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20",
                        {
                          "z-10 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2":
                            page === item,

                          "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0":
                            page !== item,
                        },
                        {
                          "bg-blue-700 focus-visible:outline-blue-700": page === item && color === "primary",
                          "bg-gray-500 focus-visible:outline-gray-500": page === item && color === "secondary",
                          "bg-sky-500 focus-visible:outline-sky-500": page === item && color === "info",
                          "bg-green-600 focus-visible:outline-green-600": page === item && color === "success",
                          "bg-yellow-600 focus-visible:outline-yellow-600": page === item && color === "warning",
                          "bg-red-600 focus-visible:outline-red-600": page === item && color === "error",
                        }
                      )}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  onClick={handlePageChange(page + 1)}
                  disabled={page === totalPage}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100 disabled:opacity-50"
                >
                  <span className="sr-only">{t("pagination.next")}</span>
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Pagination;
