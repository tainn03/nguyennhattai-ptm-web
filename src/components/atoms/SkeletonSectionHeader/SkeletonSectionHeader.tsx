const SkeletonSectionHeader = () => {
  return (
    <div className="w-full">
      <div className="mb-4 h-2.5 w-48 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="mb-2.5 h-2 max-w-[480px] rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="mb-2.5 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="h-2 max-w-[360px] rounded-full bg-gray-200 dark:bg-gray-700" />
    </div>
  );
};

export default SkeletonSectionHeader;
