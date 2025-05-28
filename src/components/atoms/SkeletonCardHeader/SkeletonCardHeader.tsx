export type SkeletonCardHeaderProps = {
  descriptionLoading?: boolean;
};

const SkeletonCardHeader = ({ descriptionLoading }: SkeletonCardHeaderProps) => {
  return (
    <div role="status" className="max-w-md animate-pulse space-y-2.5 py-3">
      <div className="flex w-full items-center space-x-2">
        <div className="h-2.5 w-40 rounded-full bg-gray-200 dark:bg-gray-700" />
        {descriptionLoading && <div className="h-2.5 w-full rounded-full bg-gray-300 dark:bg-gray-600" />}
      </div>
    </div>
  );
};

export default SkeletonCardHeader;
