import clsx from "clsx";
import { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  allowOverflow?: boolean;
};

const Card = ({ allowOverflow, className, ...otherProps }: CardProps) => {
  return (
    <div
      className={clsx("bg-white shadow ring-1 ring-gray-200 sm:rounded-md", className, {
        "overflow-visible": allowOverflow,
        "overflow-hidden": !allowOverflow,
      })}
      {...otherProps}
    />
  );
};

export default Card;
