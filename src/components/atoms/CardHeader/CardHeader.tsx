import clsx from "clsx";
import { HTMLAttributes, ReactNode } from "react";

import { SkeletonCardHeader } from "@/components/atoms";

export type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  subTitle?: string;
  description?: ReactNode;
  actionComponent?: ReactNode;
  loading?: boolean;
};

const CardHeader = ({ title, subTitle, description, actionComponent, loading, className }: CardHeaderProps) => {
  return (
    <div
      className={clsx("-mx-px -mt-px border border-gray-200 bg-gray-50 px-4 py-3 sm:px-6", className, {
        "flex flex-wrap items-center justify-between sm:flex-nowrap": actionComponent,
      })}
    >
      {loading ? (
        <SkeletonCardHeader descriptionLoading={!!description} />
      ) : (
        <div>
          <div className="-ml-2 -mt-2 flex flex-wrap items-baseline">
            <h3 className="ml-2 mt-2 text-base font-semibold leading-6 text-gray-900">{title}</h3>
            {subTitle && <p className="ml-2 mt-1 truncate text-sm text-gray-600">{subTitle}</p>}
          </div>
          {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{description}</p>}
        </div>
      )}

      {actionComponent && !loading && <div className="mt-3 sm:ml-4 sm:mt-0">{actionComponent}</div>}
    </div>
  );
};

export default CardHeader;
