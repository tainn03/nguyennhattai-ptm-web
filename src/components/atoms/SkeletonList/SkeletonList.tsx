import clsx from "clsx";

export type SkeletonListProps = {
  count?: number;
  className?: string;
};

const SkeletonList = ({ count = 5, className }: SkeletonListProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className={clsx(className, "flex animate-pulse items-center justify-between px-4 py-5")}>
          <div>
            <div className="space-x-3">
              <div className="mb-2.5 inline-block h-2.5 w-20 rounded-full bg-gray-300 dark:bg-gray-600 sm:w-44" />
              <div className="mb-2.5 inline-block h-2.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600 sm:w-28" />
            </div>
            <div className="h-2 w-56 rounded-full bg-gray-200 dark:bg-gray-700 sm:w-96" />
          </div>
          <div className="space-x-3">
            <div className="hidden h-2.5 w-8 rounded-full bg-gray-300 dark:bg-gray-700 sm:inline-block" />
            <div className="hidden h-2.5 w-8 rounded-full bg-gray-300 dark:bg-gray-700 sm:inline-block" />
            <div className="hidden h-2.5 w-8 rounded-full bg-gray-300 dark:bg-gray-700 sm:inline-block" />
            <div className="hidden h-2.5 w-8 rounded-full bg-gray-300 dark:bg-gray-700 sm:inline-block" />
            <div className="inline-block h-2.5 w-4 rounded-full bg-gray-300 dark:bg-gray-700" />
          </div>
        </li>
      ))}
    </>
  );
};

export default SkeletonList;
