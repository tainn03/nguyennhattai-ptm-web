"use client";

import clsx from "clsx";
import { useParams } from "next/navigation";
import { usePathname } from "next-intl/client";
import { ReactNode, useMemo } from "react";

import { SkeletonPageHeader } from "@/components/atoms";
import { UserGuideTrigger } from "@/components/organisms";
import { DefaultReactProps } from "@/types";
import { transformPathnameToSlug } from "@/utils/string";

export type PageHeaderProps = Partial<DefaultReactProps> & {
  title: ReactNode;
  subTitle?: string;
  description?: ReactNode;
  showBorderBottom?: boolean;
  actionHorizontal?: boolean;
  actionComponent?: ReactNode;
  loading?: boolean;
  className?: string;
  descriptionClassName?: string;
};
const PageHeader = ({
  title,
  subTitle,
  description,
  showBorderBottom = true,
  children,
  actionHorizontal = false,
  actionComponent,
  loading,
  className,
  descriptionClassName = "max-w-3xl",
}: PageHeaderProps) => {
  const pathname = usePathname();
  const params = useParams();

  const renderActionComponent = useMemo(
    () =>
      actionComponent && (
        <div
          className={clsx("mt-4 flex flex-row justify-end gap-x-4", {
            "md:mt-0": !description,
          })}
        >
          {actionComponent}
        </div>
      ),
    [actionComponent, description]
  );

  return (
    <div
      className={clsx("mb-6 pb-4 max-sm:px-4 sm:mb-10 sm:pb-6", className, {
        "border-b border-gray-200": showBorderBottom,
        "md:flex md:justify-between md:gap-x-4": actionHorizontal,
      })}
    >
      {loading ? (
        <SkeletonPageHeader descriptionLoading={!!description} />
      ) : (
        <>
          <div>
            <div className="-ml-2 -mt-2 flex flex-wrap items-baseline">
              <h3 className="ml-2 mt-2 text-2xl font-bold leading-6 tracking-tight text-gray-900 sm:text-3xl">
                {title}
              </h3>
              <UserGuideTrigger targetPath={transformPathnameToSlug(params, pathname)} />
              {subTitle && <p className="text-md ml-2 mt-1 truncate text-gray-600">{subTitle}</p>}
            </div>
            {description && <div className={clsx("mt-4 text-gray-500", descriptionClassName)}>{description}</div>}
          </div>
        </>
      )}
      {actionHorizontal ? (
        renderActionComponent
      ) : (
        <div
          className={clsx("md:flex md:flex-wrap md:items-center md:justify-between md:gap-4", {
            "mt-4 sm:mt-6": children || actionComponent,
          })}
        >
          <div className="flex-1 max-sm:overflow-auto">{children}</div>
          {renderActionComponent}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
