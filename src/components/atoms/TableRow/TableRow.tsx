"use client";

import clsx from "clsx";
import { HTMLAttributes, useEffect, useState } from "react";

import { useTableContext } from "@/hooks";

export type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  highlight?: boolean;
  hover?: boolean;
  striped?: boolean;
  flash?: boolean;
  flashDuration?: number;
  onFlashed?: () => void;
};

const TableRow = ({
  highlight,
  hover = true,
  striped,
  flash,
  flashDuration = 5000,
  onFlashed,
  className,
  ...otherProps
}: TableRowProps) => {
  const { isInHead } = useTableContext();
  const [isFlashing, setIsFlashing] = useState(flash);

  useEffect(() => {
    if (flash) {
      setIsFlashing(flash);
      setTimeout(() => {
        setIsFlashing(false);
        onFlashed && onFlashed();
      }, flashDuration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash]);

  return (
    <tr
      className={clsx(className, {
        "bg-blue-50": !isInHead && highlight,
        "hover:bg-gray-50": !isInHead && hover,
        "even:bg-gray-50": !isInHead && striped,
        "animate-pulse !bg-green-600/10 duration-200": isFlashing,
      })}
      {...otherProps}
    />
  );
};

export default TableRow;
