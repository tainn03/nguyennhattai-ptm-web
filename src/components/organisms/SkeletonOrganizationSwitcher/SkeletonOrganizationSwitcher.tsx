const SkeletonOrganizationSwitcher = () => {
  return (
    <div className="relative animate-pulse">
      <div className="group relative -mx-6 -mt-5 flex items-start space-x-4 bg-gray-800 p-2 focus-within:ring-2 focus-within:ring-blue-500 hover:bg-gray-600">
        <div className="flex flex-shrink-0 items-center justify-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-lg border">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
              className="h-8 w-8 text-gray-200 dark:text-gray-700"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
              />
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

export default SkeletonOrganizationSwitcher;
