import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { SUBCONTRACTOR_UPDATE_SEARCH_CONDITIONS, SUBCONTRACTOR_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type SubcontractorState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: SubcontractorState = {
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
      sortLabel: "subcontractor.code",
      filters: [
        {
          filterLabel: "subcontractor.code",
          name: "code",
          type: "text",
          placeholder: "subcontractor.code_placeholder",
          value: "",
        },
      ],
    },
    name: {
      sortLabel: "subcontractor.name",
      filters: [
        {
          filterLabel: "subcontractor.name",
          name: "name",
          type: "text",
          placeholder: "subcontractor.name_placeholder",
          value: "",
        },
      ],
    },
    contactName: {
      sortLabel: "subcontractor.representative",
      filters: [
        {
          filterLabel: "subcontractor.representative",
          name: "contactName",
          type: "text",
          placeholder: "subcontractor.representative_placeholder",
          value: "",
        },
      ],
    },
    phoneNumber: {
      sortLabel: "subcontractor.phone_number",
      filters: [
        {
          filterLabel: "subcontractor.phone_number",
          name: "phoneNumber",
          type: "text",
          placeholder: "subcontractor.phone_number_placeholder",
          value: "",
        },
      ],
    },
    taxCode: {
      sortLabel: "subcontractor.tax_code",
      filters: [
        {
          filterLabel: "subcontractor.tax_code",
          name: "taxCode",
          type: "text",
          placeholder: "subcontractor.tax_code_placeholder",
          value: "",
        },
      ],
    },
    isActive: {
      sortLabel: "subcontractor.status",
      filters: [
        {
          filterLabel: "subcontractor.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "subcontractor.status_active", checked: true },
            { value: "false", label: "subcontractor.status_inactive" },
          ],
        },
      ],
    },
  },
  searchQueryString: "",
};

const subcontractorReducer: Reducer<SubcontractorState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case SUBCONTRACTOR_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case SUBCONTRACTOR_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default subcontractorReducer;
