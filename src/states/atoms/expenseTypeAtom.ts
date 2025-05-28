import { atom } from "jotai";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { FilterOptions } from "@/types/filter";

type ExpenseTypeAtomType = {
  expenseTypeConditions: FilterOptions;
  expenseTypeSearchQueryString: string;
};

const initialValue: ExpenseTypeAtomType = {
  expenseTypeConditions: {
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
          placeholder: "components.filter_status.keywords_placeholder",
          name: "keywords",
          type: "text",
          value: "",
        },
      ],
    },
    key: {
      sortLabel: "expense_type.key",
      sortColumn: "key",
      filters: [
        {
          filterLabel: "expense_type.key",
          placeholder: "expense_type.key_placeholder",
          name: "key",
          type: "text",
          value: "",
        },
      ],
    },
    name: {
      sortLabel: "expense_type.name",
      sortColumn: "name",
      filters: [
        {
          filterLabel: "expense_type.name",
          placeholder: "expense_type.name_placeholder",
          name: "name",
          type: "text",
          value: "",
        },
      ],
    },
    status: {
      sortLabel: "expense_type.status",
      sortColumn: "isActive",
      filters: [
        {
          filterLabel: "expense_type.status",
          name: "isActive",
          type: "checkbox",
          value: [
            { value: "true", label: "expense_type.status_active", checked: true },
            { value: "false", label: "expense_type.status_inactive" },
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
  expenseTypeSearchQueryString: "",
};

export const expenseTypeAtom = atom<ExpenseTypeAtomType>(initialValue);
