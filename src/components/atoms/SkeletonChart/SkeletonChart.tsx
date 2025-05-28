import clsx from "clsx";
import { HTMLAttributes } from "react";

export type SkeletonChartProps = HTMLAttributes<HTMLDivElement> & {
  type?: "bar" | "Line";
  size?: "short" | "medium" | "long";
};

const SkeletonChart = ({ type = "bar", size = "medium" }: SkeletonChartProps) => {
  return (
    <div role="status" className="flex animate-pulse justify-center space-y-2.5 py-3">
      {type === "bar" && (
        <div
          className={clsx({
            "max-w-sm": size === "short",
            "max-w-lg": size === "medium",
            "max-w-3xl": size === "long",
          })}
        >
          <div className="flex items-end justify-center space-x-4">
            <div className="h-24 w-14 bg-gray-300" />
            <div className="h-40 w-14 bg-gray-300" />
            <div className="h-32 w-14 bg-gray-300" />
            <div className="h-16 w-14 bg-gray-300" />
            <div className="h-32 w-14 bg-gray-300" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SkeletonChart;
