"use client";

import { TdHTMLAttributes } from "react";

import { useTableContext } from "@/hooks";
import { cn } from "@/utils/twcn";

export type TableCellProps = TdHTMLAttributes<HTMLTableDataCellElement> & {
  align?: "left" | "center" | "right";
  action?: boolean;
  nowrap?: boolean;
  loading?: boolean;
  skeletonType?: "profile" | "multiline" | "line";
};

const TableCell = ({
  align = "left",
  nowrap = false,
  action,
  loading,
  skeletonType = "line",
  className,
  ...otherProps
}: TableCellProps) => {
  const { isInHead } = useTableContext();

  return isInHead ? (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap py-3.5 font-semibold first:pl-4 first:pr-3",
        {
          "text-left": align === "left",
          "text-center": align === "center",
          "text-right": align === "right",
          "relative w-10 min-w-[40px] pl-4 pr-3": action,
        },
        className
      )}
      {...otherProps}
    />
  ) : (
    <>
      {loading ? (
        <td>
          <div className="w-full animate-pulse">
            {skeletonType === "profile" || skeletonType === "multiline" ? (
              <div className="flex items-center space-x-3">
                {skeletonType === "profile" && (
                  <svg
                    className="h-10 w-10 text-gray-200 dark:text-gray-700"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z" />
                  </svg>
                )}
                <div>
                  <div className="mb-2 h-2.5 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="h-2 w-40 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ) : (
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
            )}
          </div>
        </td>
      ) : (
        <td
          className={cn(
            "text-sm text-gray-500 first:pl-4 first:pr-3",
            {
              "text-left": align === "left",
              "text-center": align === "center",
              "text-right": align === "right",
              "whitespace-nowrap": nowrap,
            },
            className
          )}
          {...otherProps}
        />
      )}
    </>
  );
};

export default TableCell;
