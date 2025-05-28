import { AdvanceStatus } from "@prisma/client";
import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { ADVANCE_UPDATE_SEARCH_CONDITIONS, ADVANCE_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";
import { endOfMonth, startOfMonth } from "@/utils/date";

type AdvanceState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: AdvanceState = {
  searchConditions: {
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      defaultSort: "updatedAt:desc",
      filters: [],
    },
    statusOptions: {
      sortLabel: "advance.status",
      sortColumn: "status",
      filters: [
        {
          filterLabel: "advance.status",
          name: "statusOptions",
          type: "checkbox",
          value: [
            { value: AdvanceStatus.PENDING, label: "advance.status_pending" },
            { value: AdvanceStatus.PAYMENT, label: "advance.status_paid" },
            { value: AdvanceStatus.REJECTED, label: "advance.status_rejected" },
          ],
        },
      ],
    },
    driverId: {
      filters: [{ label: "advance.driver", name: "driverId", type: "combobox" }],
    },
    subcontractorId: {
      filters: [{ label: "advance.subcontractor", name: "subcontractorId", type: "combobox" }],
    },
    startDate: {
      filters: [
        {
          label: "advance.advance_from",
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
          label: "advance.advance_to",
          name: "endDate",
          value: endOfMonth(new Date())!,
          type: "date",
          isShowBtnDelete: false,
        },
      ],
    },
  },
  searchQueryString: "",
};

const advanceReducer: Reducer<AdvanceState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case ADVANCE_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case ADVANCE_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default advanceReducer;
