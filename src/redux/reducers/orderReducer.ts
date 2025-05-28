import { Reducer } from "redux";

import { ORDER_STATUS_TYPE } from "@/constants/order";
import { PAGE_SIZE_ORDER_GRID_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import {
  ORDER_CLEAR_ORDER_DETAIL,
  ORDER_UPDATE_NEW_ORDER_DATE,
  ORDER_UPDATE_ORDER_DETAIL,
  ORDER_UPDATE_SEARCH_CONDITIONS,
  ORDER_UPDATE_SEARCH_QUERY_STRING,
} from "@/redux/types";
import { FilterOptions } from "@/types/filter";
import { OrderInfo } from "@/types/strapi";

type OrderState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
  order?: Partial<OrderInfo>;
  newOrderDate?: Date;
};

const initialState: OrderState = {
  searchConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_ORDER_GRID_OPTIONS[0],
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
    orderDate: {
      sortLabel: "order.order_date",
      sortColumn: "orderDate",
      filters: [
        {
          filterLabel: "order.order_date",
          name: "orderDate",
          type: "date",
          value: new Date(),
        },
      ],
    },
    updatedAt: {
      sortLabel: "order.updated_at",
      sortColumn: "updatedAt",
      filters: [],
    },
    createdAt: {
      sortLabel: "order.created_at",
      sortColumn: "createdAt",
      filters: [],
    },
    unitOfMeasureName: {
      filters: [
        {
          filterLabel: "order.unit_of_measure",
          name: "unitOfMeasureName",
          type: "text",
          value: "",
        },
      ],
    },
    merchandiseName: {
      filters: [
        {
          filterLabel: "order.merchandise_type",
          name: "merchandiseName",
          type: "text",
          value: "",
        },
      ],
    },
    customerName: {
      filters: [
        {
          filterLabel: "order.customer",
          name: "customerName",
          type: "text",
          value: "",
        },
      ],
    },
    orderDateFromFilter: {
      filters: [
        {
          filterLabel: "order.order_date_from",
          label: "order.order_date_from",
          name: "orderDateFromFilter",
          value: "",
          type: "date",
        },
      ],
    },
    orderDateToFilter: {
      filters: [
        {
          filterLabel: "order.order_date_to",
          label: "order.order_date_to",
          name: "orderDateToFilter",
          value: "",
          type: "date",
        },
      ],
    },
    orderStatus: {
      filters: [
        {
          filterLabel: "order.status.title",
          name: "orderStatus",
          type: "checkbox",
          value: ORDER_STATUS_TYPE,
        },
      ],
    },
  },
  searchQueryString: "",
};

const orderReducer: Reducer<OrderState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case ORDER_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case ORDER_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    case ORDER_UPDATE_ORDER_DETAIL:
      return {
        ...state,
        order: { ...action.payload },
      };

    case ORDER_CLEAR_ORDER_DETAIL:
      return {
        ...state,
        order: undefined,
      };

    case ORDER_UPDATE_NEW_ORDER_DATE:
      return {
        ...state,
        newOrderDate: action.payload,
      };

    default:
      return state;
  }
};

export default orderReducer;
