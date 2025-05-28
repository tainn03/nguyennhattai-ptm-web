import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { MAINTENANCE_TYPE_UPDATE_SEARCH_CONDITIONS } from "@/redux/types";
import { FilterOptions } from "@/types/filter";

import { MAINTENANCE_TYPE_UPDATE_SEARCH_QUERY_STRING } from "./../types";

type MaintenanceTypeState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: MaintenanceTypeState = {
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
      sortLabel: "maintenance_type.name",
      filters: [
        {
          filterLabel: "maintenance_type.name",
          name: "name",
          type: "text",
          placeholder: "maintenance_type.name_placeholder",
          value: "",
        },
      ],
    },
    type: {
      sortLabel: "maintenance_type.unit_of_measure",
      filters: [
        {
          filterLabel: "maintenance_type.unit_of_measure",
          name: "typeOptions",
          type: "checkbox",
          value: [
            { value: "VEHICLE", label: "maintenance_type.vehicle" },
            { value: "TRAILER", label: "maintenance_type.trailer" },
          ],
        },
      ],
    },
    isActive: {
      sortLabel: "maintenance_type.status",
      filters: [
        {
          filterLabel: "maintenance_type.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "maintenance_type.status_active", checked: true },
            { value: "false", label: "maintenance_type.status_inactive" },
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
          type: "text",
          placeholder: "components.filter_status.keywords_placeholder",
        },
        {
          filterLabel: "components.filter_status.updated_from",
          label: "components.filter_status.updated_from",
          name: "updatedAtFrom",
          type: "date",
        },
        {
          filterLabel: "components.filter_status.updated_to",
          label: "components.filter_status.updated_to",
          name: "updatedAtTo",
          type: "date",
        },
      ],
    },
  },
  searchQueryString: "",
};

const maintenanceTypeReducer: Reducer<MaintenanceTypeState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case MAINTENANCE_TYPE_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case MAINTENANCE_TYPE_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default maintenanceTypeReducer;
