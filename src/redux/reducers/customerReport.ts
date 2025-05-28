import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { CUSTOMER_REPORT_UPDATE_SEARCH_CONDITIONS, CUSTOMER_REPORT_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";
import { endOfMonth, startOfMonth } from "@/utils/date";

type customerReportState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: customerReportState = {
  searchQueryString: "",
  searchConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "createdAt:desc",
      filters: [],
    },
    customerId: {
      filters: [{ label: "report.customers.customer_name", name: "customerId", type: "combobox" }],
    },
    startDate: {
      filters: [
        {
          label: "report.customers.from_date",
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
          label: "report.customers.to_date",
          name: "endDate",
          value: endOfMonth(new Date())!,
          type: "date",
          isShowBtnDelete: false,
        },
      ],
    },
    tripStatus: {
      filters: [
        {
          label: "report.customers.trip_status",
          name: "tripStatus",
          type: "dropdown",
          value: [],
        },
      ],
    },
  },
};

const customerReportReducer: Reducer<customerReportState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case CUSTOMER_REPORT_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case CUSTOMER_REPORT_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default customerReportReducer;
