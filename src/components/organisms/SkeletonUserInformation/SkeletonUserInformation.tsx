import clsx from "clsx";

export type SkeletonUserInformationProps = {
  background?: "light" | "dark";
  imageSize?: "sm" | "md" | "lg";
};

const SkeletonUserInformation = ({ background = "dark", imageSize = "md" }: SkeletonUserInformationProps) => {
  return (
    <div className="relative animate-pulse">
      <div
        className={clsx(
          "group relative -mx-6 -mt-5 flex items-start space-x-4  p-2 focus-within:ring-2 focus-within:ring-blue-500 ",
          { "bg-gray-800 hover:bg-gray-600": background === "dark" }
        )}
      >
        <div className="flex flex-shrink-0 items-center justify-center">
          <span className="ml-1 inline-flex h-16 w-16 items-center justify-center rounded-lg">
            <svg
              className={clsx(
                "text-gray-200 dark:text-gray-700",
                { "h-8 w-8": imageSize === "sm" },
                { "h-14 w-14": imageSize === "md" },
                { "h-20 w-20": imageSize === "lg" }
              )}
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z" />
            </svg>
          </span>
        </div>
        <div className="flex-1">
          <div className="flex h-16 flex-col justify-center gap-4">
            <div className="h-2 w-1/2 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonUserInformation;
