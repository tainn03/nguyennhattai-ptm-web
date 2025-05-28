import { Reducer } from "redux";

import { CUSTOM_FIELD_DATA_TYPE, CUSTOM_FIELD_TYPE } from "@/constants/custom-fields";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import { CUSTOM_FIELD_UPDATE_SEARCH_CONDITIONS, CUSTOM_FIELD_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type CustomFieldState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: CustomFieldState = {
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
    type: {
      sortLabel: "custom_field.feature",
      sortType: "desc",
      filters: [
        {
          filterLabel: "custom_field.feature",
          name: "typeOptions",
          type: "checkbox",
          value: CUSTOM_FIELD_TYPE,
        },
      ],
    },
    displayOrder: {
      sortLabel: "custom_field.display_order",
      filters: [
        {
          filterLabel: "custom_field.display_order",
          placeholder: "custom_field.display_order_placeholder",
          name: "displayOrder",
          type: "number",
        },
      ],
    },
    name: {
      sortLabel: "custom_field.name",
      filters: [
        {
          filterLabel: "custom_field.name",
          name: "name",
          type: "text",
          placeholder: "custom_field.name_placeholder",
          value: "",
        },
      ],
    },
    key: {
      sortLabel: "custom_field.key",
      filters: [
        {
          filterLabel: "custom_field.key",
          name: "key",
          type: "text",
          placeholder: "custom_field.key_placeholder",
          value: "",
        },
      ],
    },
    dataType: {
      sortLabel: "custom_field.data_type",
      filters: [
        {
          filterLabel: "custom_field.data_type",
          name: "dataTypeOptions",
          type: "checkbox",
          value: CUSTOM_FIELD_DATA_TYPE,
        },
      ],
    },
    isActive: {
      sortLabel: "custom_field.status",
      filters: [
        {
          filterLabel: "custom_field.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "custom_field.status_active", checked: true },
            { value: "false", label: "custom_field.status_inactive" },
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

const customFieldReducer: Reducer<CustomFieldState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case CUSTOM_FIELD_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case CUSTOM_FIELD_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default customFieldReducer;
