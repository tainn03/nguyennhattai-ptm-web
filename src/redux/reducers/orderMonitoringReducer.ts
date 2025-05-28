import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { ORDER_MONITORING_UPDATE_SEARCH_CONDITIONS, ORDER_MONITORING_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";
import { endOfMonth, startOfMonth } from "@/utils/date";

type OrderMonitoringState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: OrderMonitoringState = {
  searchQueryString: "",
  searchConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "orderDate:asc",
      filters: [],
    },
    startDate: {
      filters: [
        {
          label: "order_monitoring.from_date",
          name: "startDate",
          value: startOfMonth(new Date())!,
          type: "date",
        },
      ],
    },
    endDate: {
      filters: [
        {
          label: "order_monitoring.to_date",
          name: "endDate",
          value: endOfMonth(new Date())!,
          type: "date",
        },
      ],
    },
    customerId: {
      filters: [{ label: "order_monitoring.customer_name", name: "customerId", type: "combobox" }],
    },
    orderCode: {
      filters: [{ label: "order_monitoring.order_code", name: "orderCode", type: "text" }],
    },
    orderStatus: {
      filters: [{ label: "order_monitoring.order_status", name: "orderStatus", type: "combobox" }],
    },
    driverId: {
      filters: [{ label: "order_monitoring.driver", name: "driverId", type: "combobox" }],
    },
    orderCodeSort: {
      sortLabel: "order_monitoring.list_item.order_code",
      sortColumn: "code",
      filters: [],
    },
    customer: {
      sortLabel: "order_monitoring.list_item.customer",
      sortColumn: "customer.code",
      filters: [],
    },
    orderDate: {
      sortLabel: "order_monitoring.list_item.order_date",
      sortColumn: "orderDate",
      sortType: "asc",
      filters: [],
    },
    lastStatusType: {
      sortLabel: "order_monitoring.list_item.order_monitoring",
      sortColumn: "lastStatusType",
      filters: [],
    },
  },
};

const orderMonitoringReducer: Reducer<OrderMonitoringState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case ORDER_MONITORING_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case ORDER_MONITORING_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default orderMonitoringReducer;
