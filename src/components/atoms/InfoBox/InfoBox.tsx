import clsx from "clsx";
import { ReactNode } from "react";

import { ReactTag } from "@/types";
import { cn } from "@/utils/twcn";

type InfoBoxProps = {
  nowrap?: boolean;
  as?: ReactTag;
  label?: ReactNode | null;
  subLabel?: ReactNode | null;
  subLabel2?: ReactNode | null;
  href?: string | null;
  emptyLabel?: string | null;
  className?: string;
};

const InfoBox = ({
  as: Tag = "div",
  nowrap = true,
  href = "",
  label,
  subLabel,
  subLabel2,
  emptyLabel = "",
  className,
}: InfoBoxProps) => {
  return label || subLabel || subLabel2 ? (
    <Tag href={href} className={clsx("flex flex-col", className)}>
      <span
        className={cn("text-sm font-medium text-gray-700 group-hover:text-gray-900", {
          "whitespace-pre-wrap": !nowrap,
          "whitespace-nowrap": nowrap,
        })}
      >
        {label ? label : emptyLabel}
      </span>
      {subLabel && (
        <span
          className={cn("text-xs font-medium text-gray-500 group-hover:text-gray-700", {
            "whitespace-pre-wrap": !nowrap,
            "whitespace-nowrap": nowrap,
          })}
        >
          {subLabel}
        </span>
      )}
      {subLabel2 && (
        <span
          className={cn("text-xs font-medium text-gray-500 group-hover:text-gray-700", {
            "whitespace-pre-wrap": !nowrap,
            "whitespace-nowrap": nowrap,
          })}
        >
          {subLabel2}
        </span>
      )}
    </Tag>
  ) : (
    emptyLabel
  );
};

export default InfoBox;
