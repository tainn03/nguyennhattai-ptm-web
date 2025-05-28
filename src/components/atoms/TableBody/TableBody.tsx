import clsx from "clsx";
import React, { HTMLAttributes } from "react";

import { TableProvider } from "..";

export type TableBodyProps = HTMLAttributes<HTMLTableSectionElement>;

const TableBody = ({ className, ...otherProps }: TableBodyProps) => {
  return (
    <TableProvider isInHead={false}>
      <tbody className={clsx(className, "divide-y divide-gray-200")} {...otherProps} />
    </TableProvider>
  );
};
export default TableBody;
