import clsx from "clsx";
import React, { TableHTMLAttributes } from "react";

export type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  dense?: boolean;
  equalVerticalPaddingSmall?: boolean;
};

const Table = ({ dense, equalVerticalPaddingSmall, className, ...otherProps }: TableProps) => {
  return (
    <table
      className={clsx(className, "min-w-full divide-y divide-gray-300", {
        "[&_td]:py-1": equalVerticalPaddingSmall,
        "[&_td]:p-2 [&_th]:px-2": !equalVerticalPaddingSmall && dense,
        "[&_td]:px-3 [&_td]:py-4 [&_th]:px-3": !equalVerticalPaddingSmall && !dense,
      })}
      {...otherProps}
    />
  );
};

export default Table;
