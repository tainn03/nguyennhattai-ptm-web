import clsx from "clsx";
import { TableHTMLAttributes } from "react";

import { TableProvider } from "@/components/atoms";

export type TableHeadProps = TableHTMLAttributes<HTMLTableSectionElement> & {
  uppercase?: boolean;
};

const TableHead = ({ uppercase, className, ...otherProps }: TableHeadProps) => {
  return (
    <TableProvider isInHead>
      <thead
        className={clsx(className, {
          "[&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-gray-500": uppercase,
          "[&_th]:text-sm [&_th]:text-gray-900": !uppercase,
        })}
        {...otherProps}
      />
    </TableProvider>
  );
};
export default TableHead;
