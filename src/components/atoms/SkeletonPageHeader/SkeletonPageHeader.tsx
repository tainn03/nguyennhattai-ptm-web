export type SkeletonPageHeaderProps = {
  descriptionLoading?: boolean;
};

const SkeletonPageHeader = ({ descriptionLoading }: SkeletonPageHeaderProps) => {
  return (
    <div className="w-full">
      <div className="mb-4 h-3.5 w-48 rounded-full bg-gray-200 dark:bg-gray-700" />
      {descriptionLoading && (
        <>
          <div className="mb-2.5 h-2 max-w-[480px] rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="mb-2.5 h-2 max-w-md rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-2 max-w-[360px] rounded-full bg-gray-200 dark:bg-gray-700" />
        </>
      )}
    </div>
  );
};

export default SkeletonPageHeader;
