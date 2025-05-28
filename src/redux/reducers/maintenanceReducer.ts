import { MaintenanceTypeType } from "@prisma/client";
import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { MAINTENANCE_UPDATE_SEARCH_CONDITIONS, MAINTENANCE_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type MaintenanceState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: MaintenanceState = {
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
    type: {
      sortLabel: "maintenance.transportation_type",
      filters: [
        {
          filterLabel: "maintenance.transportation_type",
          name: "typeOptions",
          type: "checkbox",
          value: [
            { value: MaintenanceTypeType.VEHICLE, label: "maintenance.vehicle" },
            { value: MaintenanceTypeType.TRAILER, label: "maintenance.trailer" },
          ],
        },
      ],
    },
    license: {
      sortLabel: "maintenance.license_plates",
      filters: [
        {
          filterLabel: "maintenance.license_plates",
          label: "maintenance.license_plates",
          name: "license",
          type: "text",
          placeholder: "maintenance.license_plates_placeholder",
          value: "",
        },
      ],
    },
    estimateCost: {
      sortLabel: "maintenance.cost",
      filters: [
        {
          filterLabel: "maintenance.estimate_cost_from",
          placeholder: "maintenance.cost_placeholder",
          label: "maintenance.estimate_cost_from",
          name: "estimateCostFrom",
          type: "number",
          value: "",
        },
        {
          filterLabel: "maintenance.estimate_cost_to",
          placeholder: "maintenance.cost_placeholder",
          label: "maintenance.estimate_cost_to",
          name: "estimateCostTo",
          type: "number",
          value: "",
        },
      ],
    },
    actualCost: {
      sortLabel: "maintenance.cost",
      filters: [
        {
          filterLabel: "maintenance.actual_cost_from",
          placeholder: "maintenance.cost_placeholder",
          label: "maintenance.actual_cost_from",
          name: "actualCostFrom",
          type: "number",
          value: "",
        },
        {
          filterLabel: "maintenance.actual_cost_to",
          placeholder: "maintenance.cost_placeholder",
          label: "maintenance.actual_cost_to",
          name: "actualCostTo",
          type: "number",
          value: "",
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

const maintenanceReducer: Reducer<MaintenanceState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case MAINTENANCE_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case MAINTENANCE_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default maintenanceReducer;
