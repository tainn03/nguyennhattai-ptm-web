import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { DRIVER_SALARY_UPDATE_SEARCH_CONDITIONS, DRIVER_SALARY_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";
import { endOfMonth, startOfMonth } from "@/utils/date";

type DriversReportState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: DriversReportState = {
  searchQueryString: "",
  searchConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "createdAt:desc",
      filters: [],
    },
    driverId: {
      filters: [{ label: "report.drivers.driver", name: "driverId", type: "combobox", value: "" }],
    },
    startDate: {
      filters: [
        {
          label: "report.drivers.detail.from_date",
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
          label: "report.drivers.detail.to_date",
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
          label: "report.drivers.detail.trip_status",
          name: "tripStatus",
          type: "dropdown",
          value: [],
        },
      ],
    },
  },
};

const driverSalaryReducer: Reducer<DriversReportState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case DRIVER_SALARY_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case DRIVER_SALARY_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default driverSalaryReducer;
