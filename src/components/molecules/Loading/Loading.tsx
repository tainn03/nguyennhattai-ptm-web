"use client";

import clsx from "clsx";
import { HTMLAttributes } from "react";

import { Spinner } from "@/components/atoms";

export type LoadingProps = HTMLAttributes<HTMLDivElement> & {
  size?: "small" | "medium" | "large";
  fullScreen?: boolean;
  backdrop?: boolean;
  label?: string;
};

const Loading = ({ size = "medium", fullScreen, backdrop, label, className }: LoadingProps) => {
  return (
    <div
      className={clsx("flex flex-col items-center justify-center", className, {
        "inset-0 h-full w-full": fullScreen,
        "bg-gray-600/20": backdrop,
      })}
    >
      <div className="flex flex-row items-center gap-3 p-8">
        <Spinner size={size} />
        {label && (
          <p
            className={clsx("text-gray-500", {
              "text-base": size === "large",
              "text-sm": size !== "large",
            })}
          >
            {label}
          </p>
        )}
      </div>
    </div>
  );
};

export default Loading;
