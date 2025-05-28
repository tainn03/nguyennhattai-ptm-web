import { Spinner } from "@/components/atoms";

export type SkeletonOrderList = {
  isLoading?: boolean;
};

const SkeletonOrderList = ({ isLoading }: SkeletonOrderList) => {
  return isLoading && <Spinner size="large" />;
};

export default SkeletonOrderList;
