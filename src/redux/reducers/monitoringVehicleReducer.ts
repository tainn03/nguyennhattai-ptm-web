import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import {
  MONITORING_VEHICLES_UPDATE_SEARCH_CONDITIONS,
  MONITORING_VEHICLES_UPDATE_SEARCH_QUERY_STRING,
} from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type MonitoringVehicleState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: MonitoringVehicleState = {
  searchQueryString: "",
  searchConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "createdAt:desc",
      filters: [],
    },
    vehicleId: {
      filters: [{ label: "vehicle_monitoring.vehicle", name: "vehicleId", type: "text", value: "" }],
    },
  },
};

const MonitoringVehicleReducer: Reducer<MonitoringVehicleState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case MONITORING_VEHICLES_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case MONITORING_VEHICLES_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default MonitoringVehicleReducer;
