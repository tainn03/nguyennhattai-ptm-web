import { atom } from "jotai";

import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { FilterOptions } from "@/types/filter";

type WorkFlowAtomType = {
  workFlowConditions: FilterOptions;
  workFlowSearchQueryString: string;
};

const initialValue: WorkFlowAtomType = {
  workFlowConditions: {
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
    name: {
      sortLabel: "components.workflow.name",
      sortColumn: "name",
      filters: [
        {
          filterLabel: "components.workflow.name",
          placeholder: "components.workflow.name_placeholder",
          name: "name",
          type: "text",
          value: "",
        },
      ],
    },
    status: {
      sortLabel: "workflow.status",
      sortColumn: "isActive",
      filters: [
        {
          filterLabel: "workflow.status",
          name: "isActive",
          type: "checkbox",
          value: [
            { value: "true", label: "workflow.status_active", checked: true },
            { value: "false", label: "workflow.status_inactive" },
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
  workFlowSearchQueryString: "",
};

export const workFlowAtom = atom<WorkFlowAtomType>(initialValue);
