import { atom } from "jotai";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { FilterOptions } from "@/types/filter";

type OrderTripAtomType = {
  orderTripConditions: FilterOptions;
};

const initialValue: OrderTripAtomType = {
  orderTripConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "id:desc",
      filters: [],
    },
  },
};

export const orderTripAtom = atom<OrderTripAtomType>(initialValue);
