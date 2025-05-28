import { TruckIcon, UserIcon } from "@heroicons/react/24/outline";
import { memo } from "react";

type ClickableVehicleItemSkeletonProps = {
  visible?: boolean;
  count?: number;
};

const ClickableVehicleItemSkeleton = ({ visible = false, count = 9 }: ClickableVehicleItemSkeletonProps) => {
  return (
    <div className="space-y-1 divide-y divide-gray-200">
      {visible &&
        Array.from({ length: count }).map((_, index) => (
          <div key={`clickable-skeleton-item-${index}`} className="flex cursor-pointer flex-col gap-y-2 p-2">
            <div className="flex items-center gap-x-2">
              <TruckIcon className="h-5 w-5 flex-shrink-0 text-gray-500" />
              <div className="h-2 w-24 rounded-full bg-gray-300 " />
            </div>
            <div className="flex items-center gap-x-2">
              <UserIcon className="h-5 w-5 flex-shrink-0 text-gray-500" />
              <div className="h-2 w-32 rounded-full bg-gray-200" />
            </div>
            {/* <div className="flex items-center gap-x-2">
              <FaHourglassHalfIcon className="h-5 w-5 flex-shrink-0 text-gray-500" />
              <div className="h-2 w-32 rounded-full bg-gray-200" />
            </div> */}
          </div>
        ))}
    </div>
  );
};

export default memo(ClickableVehicleItemSkeleton);
