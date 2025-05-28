import clsx from "clsx";

import { DefaultReactProps, ReactTag } from "@/types";

export type DescriptionWrapperProps = DefaultReactProps & {
  loading?: boolean;
  as?: ReactTag;
  className?: string;
};

const DescriptionWrapper = ({ as: Tag = "div", className, loading, children }: DescriptionWrapperProps) => {
  return (
    <Tag
      className={clsx(className, {
        "gap-x-2": loading,
      })}
    >
      {children}
    </Tag>
  );
};

export default DescriptionWrapper;
