import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import {
  ROUTE_RESET_SEARCH_CONDITIONS,
  ROUTE_UPDATE_SEARCH_CONDITIONS,
  ROUTE_UPDATE_SEARCH_QUERY_STRING,
} from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type RouteState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: RouteState = {
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
    code: {
      sortLabel: "customer.route.id",
      filters: [
        {
          filterLabel: "customer.route.id",
          name: "code",
          type: "text",
          placeholder: "customer.route.id_placeholder",
          value: "",
        },
      ],
    },
    name: {
      sortLabel: "customer.route.name",
      filters: [
        {
          filterLabel: "customer.route.name",
          name: "name",
          type: "text",
          placeholder: "customer.route.name_placeholder",
          value: "",
        },
      ],
    },
    price: {
      sortLabel: "customer.route.route_cost",
      filters: [
        {
          filterLabel: "customer.route.route_cost_from",
          placeholder: "customer.route.route_cost_placeholder",
          label: "customer.route.route_cost_from",
          name: "priceFrom",
          type: "number",
          value: "",
        },
        {
          filterLabel: "customer.route.route_cost_to",
          placeholder: "customer.route.route_cost_placeholder",
          label: "customer.route.route_cost_to",
          name: "priceTo",
          type: "number",
          value: "",
        },
      ],
    },
    isActive: {
      sortLabel: "customer.route.status",
      filters: [
        {
          filterLabel: "customer.route.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "customer.route.status_active", checked: true },
            { value: "false", label: "customer.route.status_inactive" },
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

const routeReducer: Reducer<RouteState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case ROUTE_RESET_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: initialState.searchConditions,
      };

    case ROUTE_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case ROUTE_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default routeReducer;
