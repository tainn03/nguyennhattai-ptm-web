"use client";

import { createContext, ReactNode } from "react";

export const TableContext = createContext<{ isInHead: boolean }>({
  isInHead: false,
});

export type TableProviderProps = {
  children: ReactNode;
  isInHead: boolean;
};

const TableProvider = ({ children, isInHead }: TableProviderProps) => {
  return <TableContext.Provider value={{ isInHead }}>{children}</TableContext.Provider>;
};

export default TableProvider;
