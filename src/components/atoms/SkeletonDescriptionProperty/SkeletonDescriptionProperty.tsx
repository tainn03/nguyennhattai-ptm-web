import clsx from "clsx";
import { HTMLAttributes } from "react";

export type SkeletonDescriptionPropertyProps = HTMLAttributes<HTMLDivElement> & {
  type?: "text" | "image" | "profile" | "chart";
  size?: "short" | "medium" | "long";
  count?: number;
};

const SkeletonDescriptionProperty = ({
  type = "text",
  size = "medium",
  count = 1,
}: SkeletonDescriptionPropertyProps) => {
  return (
    <div role="status" className="animate-pulse space-y-2.5 py-3">
      {type === "text" && (
        <div
          className={clsx({
            "max-w-sm": size === "short",
            "max-w-lg": size === "medium",
            "max-w-3xl": size === "long",
          })}
        >
          <div className="flex w-full items-center space-x-2">
            <div className="h-2.5 w-40 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-2.5 w-full rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>
        </div>
      )}

      {type === "profile" && (
        <>
          <div className="mb-4 h-2.5 w-40 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="mt-4 flex items-center space-x-3">
            <svg
              className="h-10 w-10 text-gray-200 dark:text-gray-700"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z" />
            </svg>
            <div>
              <div className="mb-2 h-2.5 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-2 w-48 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </>
      )}

      {type === "image" && (
        <>
          <div className="mb-4 h-2.5 w-40 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex gap-x-4">
            {Array.from({ length: count }).map((_, index) => (
              <div
                key={`image-skeleton-${index}`}
                className="flex h-36 w-full items-center justify-center rounded bg-gray-300 dark:bg-gray-700 sm:w-56"
              >
                <svg
                  className="h-6 w-6 text-gray-200 dark:text-gray-600"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 18"
                >
                  <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z" />
                </svg>
              </div>
            ))}
          </div>
        </>
      )}

      {type === "chart" && (
        <div
          className={clsx({
            "max-w-sm": size === "short",
            "max-w-lg": size === "medium",
            "max-w-3xl": size === "long",
          })}
        >
          <div className="flex items-end space-x-4">
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

export default SkeletonDescriptionProperty;
