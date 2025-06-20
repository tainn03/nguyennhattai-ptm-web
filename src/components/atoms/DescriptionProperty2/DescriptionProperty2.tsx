import clsx from "clsx";

import { SkeletonDescriptionProperty } from "@/components/atoms";
import { SkeletonDescriptionPropertyProps } from "@/components/atoms/SkeletonDescriptionProperty/SkeletonDescriptionProperty";
import { DefaultReactProps } from "@/types";

export type DescriptionProperty2Props = DefaultReactProps &
  SkeletonDescriptionPropertyProps & {
    label?: string;
    multiline?: boolean;
    loading?: boolean;
    className?: string;
    colons?: boolean;
    emptyContent?: string;
    showEmptyContent?: boolean;
  };

const DescriptionProperty2 = ({
  label,
  size,
  count,
  type,
  multiline,
  loading,
  className,
  children,
  colons = true,
  emptyContent = "-",
  showEmptyContent = true,
}: DescriptionProperty2Props) => {
  if (loading) {
    return <SkeletonDescriptionProperty className={className} type={type} size={size} count={count} />;
  }

  if (!showEmptyContent && !children) {
    return null;
  }

  return (
    <div className={clsx("flex flex-wrap gap-x-2 gap-y-1 py-1", className)}>
      <label
        className={clsx("whitespace-nowrap text-sm font-medium leading-6 text-gray-900", {
          "after:content-[':']": colons,
        })}
      >
        {label}
      </label>
      <div
        className={clsx("text-sm leading-6 text-gray-700", {
          "whitespace-pre-wrap": multiline,
        })}
      >
        {children || <span className="text-gray-500">{emptyContent}</span>}
      </div>
    </div>
  );
};

export default DescriptionProperty2;
