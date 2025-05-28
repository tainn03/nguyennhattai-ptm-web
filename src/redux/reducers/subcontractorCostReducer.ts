import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import {
  SUBCONTRACTOR_COST_UPDATE_SEARCH_CONDITIONS,
  SUBCONTRACTOR_COST_UPDATE_SEARCH_QUERY_STRING,
} from "@/redux/types";
import { FilterOptions } from "@/types/filter";
import { endOfMonth, startOfMonth } from "@/utils/date";

type SubcontractorReportState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: SubcontractorReportState = {
  searchQueryString: "",
  searchConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "createdAt:desc",
      filters: [],
    },
    subcontractorId: {
      filters: [{ label: "report.subcontractors.subcontractor", name: "subcontractorId", type: "combobox" }],
    },
    startDate: {
      filters: [
        {
          label: "report.subcontractors.from_date",
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
          label: "report.subcontractors.to_date",
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

const subcontractorCostReducer: Reducer<SubcontractorReportState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case SUBCONTRACTOR_COST_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case SUBCONTRACTOR_COST_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default subcontractorCostReducer;
