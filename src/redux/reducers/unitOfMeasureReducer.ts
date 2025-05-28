import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { UNIT_OF_MEASURE_UPDATE_SEARCH_CONDITIONS, UNIT_OF_MEASURE_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type UnitOfMeasureState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: UnitOfMeasureState = {
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
      sortLabel: "unit_of_measure.code",
      filters: [
        {
          filterLabel: "unit_of_measure.code",
          name: "code",
          type: "text",
          placeholder: "unit_of_measure.name_placeholder",
          value: "",
        },
      ],
    },
    name: {
      sortLabel: "unit_of_measure.name",
      filters: [
        {
          filterLabel: "unit_of_measure.name",
          name: "name",
          type: "text",
          placeholder: "unit_of_measure.name_placeholder",
          value: "",
        },
      ],
    },
    isActive: {
      sortLabel: "unit_of_measure.status",
      filters: [
        {
          filterLabel: "unit_of_measure.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "unit_of_measure.status_active", checked: true },
            { value: "false", label: "unit_of_measure.status_inactive" },
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
          placeholder: "components.filter_status.keywords_placeholder",
          value: "",
          type: "text",
        },
        {
          filterLabel: "components.filter_status.updated_from",
          label: "components.filter_status.updated_from",
          name: "updatedAtFrom",
          value: "",
          type: "date",
        },
        {
          filterLabel: "components.filter_status.updated_to",
          label: "components.filter_status.updated_to",
          name: "updatedAtTo",
          value: "",
          type: "date",
        },
      ],
    },
  },
  searchQueryString: "",
};

const unitOfMeasureReducer: Reducer<UnitOfMeasureState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case UNIT_OF_MEASURE_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case UNIT_OF_MEASURE_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default unitOfMeasureReducer;
