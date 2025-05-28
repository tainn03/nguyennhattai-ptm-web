import clsx from "clsx";
import { HTMLAttributes } from "react";

export type CardContentProps = HTMLAttributes<HTMLDivElement> & {
  padding?: boolean;
};

const CardContent = ({ padding = true, className, ...otherProps }: CardContentProps) => {
  return (
    <div
      className={clsx(className, {
        "px-4 py-4 sm:px-6": padding,
      })}
      {...otherProps}
    />
  );
};

export default CardContent;
