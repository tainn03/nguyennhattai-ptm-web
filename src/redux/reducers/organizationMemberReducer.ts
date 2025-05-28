import { OrganizationRoleType } from "@prisma/client";
import { Reducer } from "redux";

import { OWNER_ROLE } from "@/constants/organizationRole";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Action } from "@/redux/actions";
import {
  ORGANIZATION_MEMBER_UPDATE_SEARCH_CONDITIONS,
  ORGANIZATION_MEMBER_UPDATE_SEARCH_QUERY_STRING,
} from "@/redux/types";
import { FilterOptions } from "@/types/filter";

type OrganizationMemberState = {
  searchConditions: FilterOptions;
  searchQueryString: string;
};

const initialState: OrganizationMemberState = {
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
    fullName: {
      sortLabel: "org_setting_member.full_name",
      sortColumn: "member.detail.firstName",
      filters: [
        {
          filterLabel: "org_setting_member.full_name",
          name: "fullName",
          type: "text",
          placeholder: "org_setting_member.full_name_placeholder",
          value: "",
        },
      ],
    },
    role: {
      sortLabel: "org_setting_member.role",
      sortColumn: "role.name",
      filters: [
        {
          filterLabel: "org_setting_member.role",
          name: "role",
          type: "checkbox",
          value: [
            { value: OWNER_ROLE, label: "role.owner", checked: false },
            { value: OrganizationRoleType.ADMIN, label: "role.admin", checked: false },
            { value: OrganizationRoleType.MANAGER, label: "role.manager", checked: false },
            { value: OrganizationRoleType.DISPATCH_MANAGER, label: "role.dispatch_manager", checked: false },
            { value: OrganizationRoleType.DISPATCHER, label: "role.dispatcher", checked: false },
            { value: OrganizationRoleType.ACCOUNTANT, label: "role.accountant", checked: false },
            { value: OrganizationRoleType.CUSTOMER, label: "role.customer", checked: false },
            { value: OrganizationRoleType.DRIVER, label: "role.driver", checked: false },
          ],
        },
      ],
    },
    isActive: {
      sortLabel: "org_setting_member.status",
      filters: [
        {
          filterLabel: "org_setting_member.status",
          name: "isActiveOptions",
          type: "checkbox",
          value: [
            { value: "true", label: "org_setting_member.status_active", checked: true },
            { value: "false", label: "org_setting_member.status_inactive" },
          ],
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

const organizationMemberReducer: Reducer<OrganizationMemberState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case ORGANIZATION_MEMBER_UPDATE_SEARCH_CONDITIONS:
      return {
        ...state,
        searchConditions: { ...action.payload },
      };

    case ORGANIZATION_MEMBER_UPDATE_SEARCH_QUERY_STRING:
      return {
        ...state,
        searchQueryString: action.payload,
      };

    default:
      return state;
  }
};

export default organizationMemberReducer;
