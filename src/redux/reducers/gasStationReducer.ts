import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { GAS_STATION_UPDATE_SEARCH_CONDITIONS, GAS_STATION_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type GasStationState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: GasStationState = {
  searchConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "updatedAt:desc",
      filters: [],
    },
    keywords: {
      filters: [
        {
          filterLabel: "components.filter_status.keywords",
          name: "keywords",
          type: "text",
          value: "",
        },
      ],
    },
    name: {
      sortLabel: "gas_station.name",
      filters: [
        {
          filterLabel: "gas_station.name",
          name: "name",
          type: "text",
          placeholder: "gas_station.name_placeholder",
          value: "",
        },
      ],
    },
    fuelCapacity: {
      sortLabel: "gas_station.fuel_capacity",
      filters: [
        {
          filterLabel: "gas_station.fuel_capacity_from",
          label: "gas_station.fuel_capacity_from",
          name: "fuelCapacityMin",
          value: "",
          type: "number",
        },
        {
          filterLabel: "gas_station.fuel_capacity_to",
          label: "gas_station.fuel_capacity_to",
          name: "fuelCapacityMax",
          value: "",
          type: "number",
        },
      ],
    },
    isActive: {
      sortLabel: "gas_station.status",
      filters: [
        {
          filterLabel: "gas_station.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "gas_station.status_active", checked: true },
            { value: "false", label: "gas_station.status_inactive" },
          ],
        },
      ],
    },
    createdAt: {
      sortLabel: "components.filter_status.created_at",
      filters: [
        {
          label: "components.filter_status.created_by",
          name: "createdByUser",
          value: "",
          type: "text",
          placeholder: "components.filter_status.keywords_placeholder",
        },
        {
          filterLabel: "components.filter_status.created_from",
          label: "components.filter_status.created_from",
          name: "createdAtFrom",
          value: "",
          type: "date",
        },
        {
          filterLabel: "components.filter_status.created_to",
          label: "components.filter_status.created_to",
          name: "createdAtTo",
          value: "",
          type: "date",
        },
      ],
    },
    updatedAt: {
      sortLabel: "components.filter_status.updated_at",
      sortType: "desc",
      filters: [
        {
          label: "components.filter_status.updated_by",
          name: "updatedByUser",
          placeholder: "components.filter_status.keywords_placeholder",
          value: "",
          type: "text",
        },
        {
          filterLabel: "components.filter_status.updated_from",
          label: "components.filter_status.updated_from",
          name: "updatedAtFrom",
          value: "",
          type: "date",
        },
        {
          filterLabel: "components.filter_status.updated_to",
          label: "components.filter_status.updated_to",
          name: "updatedAtTo",
          value: "",
          type: "date",
        },
      ],
    },
  },
  searchQueryString: "",
};

const gasStationReducer: Reducer<GasStationState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case GAS_STATION_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case GAS_STATION_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default gasStationReducer;
