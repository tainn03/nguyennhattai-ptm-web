import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { DRIVER_EXPENSE_UPDATE_SEARCH_CONDITIONS, DRIVER_EXPENSE_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type DriverExpenseState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: DriverExpenseState = {
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
  },
  searchQueryString: "",
};

const driverExpenseReducer: Reducer<DriverExpenseState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case DRIVER_EXPENSE_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case DRIVER_EXPENSE_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default driverExpenseReducer;
