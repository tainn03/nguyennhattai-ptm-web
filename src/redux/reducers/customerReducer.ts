import { Reducer } from "redux";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import {
  CUSTOMER_GROUP_UPDATE_AVAILABLE_CUSTOMER_SEARCH_CONDITIONS,
  CUSTOMER_UPDATE_CUSTOMER_ID,
  CUSTOMER_UPDATE_SEARCH_CONDITIONS,
  CUSTOMER_UPDATE_SEARCH_QUERY_STRING,
} from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type CustomerState = {
  searchConditions: FilterOptions;
  availableCustomerSearchConditions: FilterOptions;
  searchQueryString: string;
  customerId?: number;
};

const initialState: CustomerState = {
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
      sortLabel: "customer.code",
      filters: [
        {
          filterLabel: "customer.code",
          name: "code",
          type: "text",
          placeholder: "customer.code_placeholder",
          value: "",
        },
      ],
    },
    name: {
      sortLabel: "customer.name",
      filters: [
        {
          filterLabel: "customer.name",
          name: "name",
          type: "text",
          placeholder: "customer.name_placeholder",
          value: "",
        },
      ],
    },
    contactName: {
      sortLabel: "customer.representative",
      filters: [
        {
          filterLabel: "customer.representative",
          name: "contactName",
          type: "text",
          placeholder: "customer.representative_placeholder",
          value: "",
        },
      ],
    },
    phoneNumber: {
      sortLabel: "customer.phone_number",
      filters: [
        {
          filterLabel: "customer.phone_number",
          name: "phoneNumber",
          type: "number",
          placeholder: "customer.phone_number_placeholder",
          value: "",
        },
      ],
    },
    taxCode: {
      sortLabel: "customer.tax_code",
      filters: [
        {
          filterLabel: "customer.tax_code",
          name: "taxCode",
          type: "text",
          placeholder: "customer.tax_code_placeholder",
          value: "",
        },
      ],
    },
    isActive: {
      sortLabel: "customer.status",
      filters: [
        {
          filterLabel: "customer.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "customer.status_active", checked: true },
            { value: "false", label: "customer.status_inactive" },
          ],
        },
      ],
    },
  },
  availableCustomerSearchConditions: {
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
      sortLabel: "customer_group.code",
      filters: [
        {
          filterLabel: "customer_group.code",
          name: "code",
          type: "text",
          placeholder: "customer_group.code_placeholder",
          value: "",
        },
      ],
    },
    name: {
      sortLabel: "customer_group.name",
      filters: [
        {
          filterLabel: "customer_group.name",
          name: "name",
          type: "text",
          placeholder: "customer_group.name_placeholder",
          value: "",
        },
      ],
    },
    email: {
      sortLabel: "customer_group.email",
      filters: [
        {
          filterLabel: "customer_group.email",
          name: "email",
          type: "text",
          placeholder: "customer_group.email_placeholder",
          value: "",
        },
      ],
    },
    contactName: {
      sortLabel: "customer_group.representative",
      filters: [
        {
          filterLabel: "customer_group.representative",
          name: "contactName",
          type: "text",
          placeholder: "customer_group.representative_placeholder",
          value: "",
        },
      ],
    },
    phoneNumber: {
      sortLabel: "customer_group.phone_number",
      filters: [
        {
          filterLabel: "customer_group.phone_number",
          name: "phoneNumber",
          type: "number",
          placeholder: "customer_group.phone_number_placeholder",
          value: "",
        },
      ],
    },
  },
  searchQueryString: "",
};

const customerReducer: Reducer<CustomerState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case CUSTOMER_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case CUSTOMER_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    case CUSTOMER_UPDATE_CUSTOMER_ID:
      return {
        ...state,
        customerId: action.payload,
      };

    case CUSTOMER_GROUP_UPDATE_AVAILABLE_CUSTOMER_SEARCH_CONDITIONS:
      return {
        ...state,
        availableCustomerSearchConditions: { ...action.payload },
      };

    default:
      return state;
  }
};

export default customerReducer;
