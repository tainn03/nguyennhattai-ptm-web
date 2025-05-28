import { atom } from "jotai";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { FilterOptions } from "@/types/filter";

type VehicleMonitoringAtomType = {
  vehicleMonitoringConditions: FilterOptions;
  searchQueryString: string;
};

const initialValue: VehicleMonitoringAtomType = {
  vehicleMonitoringConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "updatedAt:desc",
      filters: [],
    },
  },
  searchQueryString: "",
};

export const vehicleMonitoringAtom = atom<VehicleMonitoringAtomType>(initialValue);
