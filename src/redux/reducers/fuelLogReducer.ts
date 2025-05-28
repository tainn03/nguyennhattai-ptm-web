import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { FUEL_LOG_UPDATE_SEARCH_CONDITIONS, FUEL_LOG_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";
import { endOfMonth, startOfMonth } from "@/utils/date";

type FuelLogState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: FuelLogState = {
  searchQueryString: "",
  searchConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "updatedAt:desc",
      filters: [],
    },
    driverId: {
      filters: [{ label: "report.fuel_log.vehicle", name: "driverId", type: "combobox", value: "" }],
    },
    vehicleId: {
      filters: [{ label: "report.fuel_log.vehicle", name: "vehicleId", type: "combobox", value: "" }],
    },
    gasStationId: {
      filters: [{ label: "report.fuel_log.gas_station", name: "gasStationId", type: "combobox", value: "" }],
    },
    startDate: {
      filters: [
        {
          label: "report.fuel_log.from_date",
          name: "startDate",
          value: startOfMonth(new Date())!,
          type: "date",
          isShowBtnDelete: false,
        },
      ],
    },
    endDate: {
      filters: [
        {
          label: "report.fuel_log.to_date",
          name: "endDate",
          value: endOfMonth(new Date())!,
          type: "date",
          isShowBtnDelete: false,
        },
      ],
    },
  },
};

const fuelLogReducer: Reducer<FuelLogState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case FUEL_LOG_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case FUEL_LOG_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default fuelLogReducer;
