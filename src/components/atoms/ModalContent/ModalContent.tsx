import clsx from "clsx";
import { HTMLAttributes } from "react";

export type ModalContentProps = HTMLAttributes<HTMLDivElement> & {
  padding?: boolean;
};

const ModalContent = ({ padding = true, className, ...otherProps }: ModalContentProps) => {
  return (
    <div
      className={clsx(className, {
        "px-4 pb-4 pt-5 sm:p-6": padding,
      })}
      {...otherProps}
    />
  );
};

export default ModalContent;
