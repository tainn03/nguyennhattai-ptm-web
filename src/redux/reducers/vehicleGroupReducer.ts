import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { VEHICLE_GROUP_UPDATE_SEARCH_CONDITIONS, VEHICLE_GROUP_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type VehicleGroupState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: VehicleGroupState = {
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
      sortLabel: "vehicle_group.name",
      filters: [
        {
          filterLabel: "vehicle_type.name",
          name: "name",
          type: "text",
          placeholder: "vehicle_type.name_placeholder",
          value: "",
        },
      ],
    },
    isActive: {
      sortLabel: "vehicle_group.status",
      filters: [
        {
          filterLabel: "vehicle_type.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "vehicle_type.status_active", checked: true },
            { value: "false", label: "vehicle_type.status_inactive" },
          ],
        },
      ],
    },
    manager: {
      sortLabel: "vehicle_group.manager",
      sortColumn: "manager.member.detail.lastName",
      filters: [
        {
          filterLabel: "vehicle_group.manager",
          placeholder: "vehicle_group.manager",
          label: "vehicle_group.manager",
          name: "managerName",
          type: "text",
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

const vehicleGroupReducer: Reducer<VehicleGroupState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case VEHICLE_GROUP_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case VEHICLE_GROUP_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default vehicleGroupReducer;
