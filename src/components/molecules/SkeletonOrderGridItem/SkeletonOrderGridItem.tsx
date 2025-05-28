type SkeletonOrderGridItemProps = {
  count?: number;
};

const SkeletonOrderGridItem = ({ count = 2 }: SkeletonOrderGridItemProps) => {
  return (
    <li className="flex flex-row px-4 py-2 hover:bg-gray-50 sm:px-6">
      <div className="ml-3 flex-1 text-sm">
        <div role="status" className="max-w-sm animate-pulse">
          <div className="mb-4 h-2.5 w-40 rounded-full bg-gray-200 dark:bg-gray-700" />
          {count > 0 &&
            Array.from({ length: count }).map((_, index) => (
              <div key={index} className="mb-2.5 h-2 max-w-[360px] rounded-full bg-gray-200 dark:bg-gray-700" />
            ))}
        </div>
      </div>
    </li>
  );
};

export default SkeletonOrderGridItem;
