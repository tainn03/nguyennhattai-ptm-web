import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { DRIVER_UPDATE_SEARCH_CONDITIONS, DRIVER_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type DriverState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: DriverState = {
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
      sortLabel: "driver.name",
      sortColumn: "firstName",
      filters: [
        {
          filterLabel: "driver.name",
          name: "name",
          type: "text",
          placeholder: "driver.name_placeholder",
          value: "",
        },
      ],
    },
    vehicleNumber: {
      sortLabel: "driver.vehicle",
      sortColumn: "vehicle.vehicleNumber",
      filters: [
        {
          filterLabel: "driver.vehicle",
          name: "vehicleNumber",
          type: "text",
          placeholder: "components.filter_status.keywords_placeholder",
          value: "",
        },
      ],
    },
    phoneNumber: {
      sortLabel: "driver.phone",
      filters: [
        {
          filterLabel: "driver.phone",
          name: "phoneNumber",
          type: "text",
          placeholder: "driver.phone_placeholder",
          value: "",
        },
      ],
    },
    licenseType: {
      sortLabel: "driver.driver_license_type",
      sortColumn: "licenseType.name",
      filters: [
        {
          filterLabel: "driver.driver_license_type",
          name: "licenseType",
          type: "text",
          placeholder: "components.filter_status.keywords_placeholder",
          value: "",
        },
      ],
    },
    licenseNumber: {
      sortLabel: "driver.license_number_short",
      filters: [
        {
          filterLabel: "driver.license_number_short",
          name: "licenseNumber",
          type: "text",
          placeholder: "components.filter_status.keywords_placeholder",
          value: "",
        },
      ],
    },
    isActive: {
      sortLabel: "driver.status",
      filters: [
        {
          filterLabel: "driver.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "driver.status_active", checked: true },
            { value: "false", label: "driver.status_inactive" },
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

const driverReducer: Reducer<DriverState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case DRIVER_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case DRIVER_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default driverReducer;
