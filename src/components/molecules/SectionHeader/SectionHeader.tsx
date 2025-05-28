"use client";

import clsx from "clsx";
import { ReactNode } from "react";

import { SkeletonSectionHeader } from "@/components/atoms";

export type SectionHeaderProps = {
  title: string;
  subTitle?: string;
  description?: ReactNode;
  showBorderBottom?: boolean;
  actionComponent?: ReactNode;
  loading?: boolean;
  className?: string;
};

const SectionHeader = ({
  title,
  subTitle,
  description,
  showBorderBottom = false,
  actionComponent,
  loading,
  className,
}: SectionHeaderProps) => {
  return loading ? (
    <SkeletonSectionHeader />
  ) : (
    <div
      className={clsx(className, {
        "border-b border-gray-200": showBorderBottom,
        "sm:flex sm:items-center sm:justify-between": actionComponent,
      })}
    >
      <div>
        <div className="-ml-2 -mt-2 flex flex-wrap items-baseline">
          <h3 className="ml-2 mt-2 text-base font-semibold leading-6 text-gray-900">{title}</h3>
          {subTitle && <p className="ml-2 mt-1 truncate text-sm text-gray-600">{subTitle}</p>}
        </div>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{description}</p>}
      </div>
      {actionComponent && <div className="mt-3 flex sm:ml-4 sm:mt-0">{actionComponent}</div>}
    </div>
  );
};

export default SectionHeader;
