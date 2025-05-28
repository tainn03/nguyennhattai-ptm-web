import clsx from "clsx";
import { HTMLAttributes } from "react";

export type ModalActionsProps = HTMLAttributes<HTMLDivElement> & {
  align?: "left" | "right" | "center";
};

const ModalActions = ({ align = "right", className, ...otherProps }: ModalActionsProps) => {
  return (
    <div
      className={clsx(className, "flex flex-row flex-wrap gap-x-4 gap-y-3 px-4 py-4 sm:px-6", {
        "justify-start": align === "left",
        "justify-end": align === "right",
        "justify-center": align === "center",
      })}
      {...otherProps}
    />
  );
};

export default ModalActions;
