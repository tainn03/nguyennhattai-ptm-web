"use client";

import { HTMLAttributes, ReactNode, useCallback, useState } from "react";
import { RiFullscreenExitFill, RiFullscreenFill } from "react-icons/ri";

import { cn } from "@/utils/twcn";

export type TableContainerProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "paper" | "card";
  horizontalScroll?: boolean;
  verticalScroll?: boolean;
  maxHeight?: string;
  inside?: boolean;
  fullHeight?: boolean;
  stickyHeader?: boolean;
  autoHeight?: boolean;
  allowFullscreen?: boolean;
  footer?: ReactNode;
};

const TableContainer = ({
  variant = "card",
  inside = false,
  horizontalScroll = false,
  verticalScroll = false,
  maxHeight = "calc(100vh - 300px)",
  fullHeight = false,
  stickyHeader = false,
  autoHeight = false,
  allowFullscreen = false,
  footer,
  className,
  children,
}: TableContainerProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  return (
    <div
      className={cn(className, "group/table relative", {
        "h-full": fullHeight && !horizontalScroll,
        "mt-8": !inside && !isFullscreen,
        "fixed inset-0 z-50 flex flex-col bg-white": isFullscreen,
      })}
    >
      {(allowFullscreen || isFullscreen) && (
        <button
          type="button"
          onClick={handleFullscreenToggle}
          className={cn(
            "absolute right-2 top-2 z-20 rounded-lg p-1.5 transition-opacity",
            isFullscreen
              ? "bg-black/60 opacity-100 hover:bg-black/70"
              : "bg-black/60 opacity-0 hover:bg-black/70 group-hover/table:opacity-100"
          )}
        >
          {isFullscreen ? (
            <RiFullscreenExitFill className="h-5 w-5 text-white" />
          ) : (
            <RiFullscreenFill className="h-5 w-5 text-white" />
          )}
        </button>
      )}
      <div
        className={cn("flex min-h-0 flex-col", {
          "h-full": fullHeight || isFullscreen,
          "-mt-2 sm:-mx-6 lg:-mx-8": !horizontalScroll && !isFullscreen,
          "mx-0 mt-0": horizontalScroll || isFullscreen,
          "flex-1": isFullscreen,
        })}
      >
        <div
          className={cn("min-h-0 flex-1", {
            "sm:px-6 lg:px-8": !horizontalScroll && !isFullscreen,
            "py-2": !inside && !horizontalScroll && !isFullscreen,
            "pt-2": inside && !horizontalScroll && !isFullscreen,
            "p-4": isFullscreen,
            "p-0": horizontalScroll && !isFullscreen,
          })}
        >
          <div
            className={cn("h-full overflow-hidden", {
              "min-h-[25rem]": fullHeight && !autoHeight && !isFullscreen,
              "[&_td]:first:sm:pl-0 [&_th]:sm:pl-0": variant === "paper" && !inside && !isFullscreen,
              "overflow-hidden [&_tbody]:bg-white [&_td]:first:sm:pl-4 [&_th]:sm:pl-4 [&_thead]:bg-gray-50":
                variant === "card",
              "rounded-md shadow ring-1 ring-black ring-opacity-5": !inside && !isFullscreen,
              "overflow-auto": horizontalScroll || isFullscreen,
              "overflow-x-auto": horizontalScroll || isFullscreen,
              "overflow-y-auto": verticalScroll || autoHeight || isFullscreen,
              "[&>table]:w-full": true,
              "[&>table]:table-fixed": !horizontalScroll && !isFullscreen,
              "[&>table]:relative": stickyHeader,
              "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-gray-50": stickyHeader,
            })}
            style={{
              maxHeight: isFullscreen
                ? "none"
                : verticalScroll
                ? maxHeight
                : autoHeight
                ? "calc(100vh - var(--table-offset,300px) - var(--table-footer-height,0px))"
                : undefined,
              minHeight: !isFullscreen && !inside ? "var(--table-min-height, 25rem)" : undefined,
            }}
          >
            {children}
          </div>
        </div>

        {footer && (
          <div
            className={cn({
              "mt-4 sm:px-6 lg:px-8": !horizontalScroll && !isFullscreen,
              "mt-4 px-4 pb-4": isFullscreen,
            })}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default TableContainer;
