import { useContext } from "react";

import { TableContext } from "@/components/atoms/TableProvider/TableProvider";

const useTableContext = () => {
  return useContext(TableContext);
};

export default useTableContext;
