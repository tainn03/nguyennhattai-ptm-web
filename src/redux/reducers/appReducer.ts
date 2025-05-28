import { Reducer } from "redux";

import { Action } from "@/redux/actions";
import {
  APP_ADD_NOTIFICATION,
  APP_CLEAR_BREADCRUMB_ITEMS,
  APP_CLEAR_NOTIFICATION,
  APP_DELETE_ORGANIZATION,
  APP_DELETE_USER_PROFILE,
  APP_END_LOADING,
  APP_REMOVE_NOTIFICATION,
  APP_SET_BREADCRUMB_ITEMS,
  APP_START_LOADING,
  APP_UPDATE_ORGANIZATION,
  APP_UPDATE_ORGANIZATION_MEMBER,
  APP_UPDATE_USER_GUIDE_MODAL,
  APP_UPDATE_USER_PROFILE,
} from "@/redux/types";
import { BreadcrumbItem, Notification } from "@/types";
import {
  OrganizationInfo,
  OrganizationMemberInfo,
  OrganizationRoleInfo,
  UserGuideInfo,
  UserInfo,
} from "@/types/strapi";
import { randomString } from "@/utils/string";

type AppState = {
  loading: boolean;
  userProfile?: UserInfo;
  organization?: OrganizationInfo;
  organizationMember?: OrganizationMemberInfo;
  authorizationData?: OrganizationRoleInfo;
  notifications: Notification[];
  breadcrumbItems: BreadcrumbItem[];
  userGuide: Partial<UserGuideInfo> & { open: boolean };
};

const initialState: AppState = {
  loading: false,
  notifications: [],
  breadcrumbItems: [],
  userGuide: {
    open: false,
  },
};

const appReducer: Reducer<AppState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case APP_START_LOADING:
      return {
        ...state,
        loading: true,
      };

    case APP_END_LOADING:
      return {
        ...state,
        loading: false,
      };

    case APP_ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            ...action.payload,
            id: action.payload.id || `notification_${randomString(10)}`,
          },
        ],
      };

    case APP_REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter((notification) => notification.id !== action.payload),
      };

    case APP_CLEAR_NOTIFICATION:
      return {
        ...state,
        notifications: [],
      };

    case APP_SET_BREADCRUMB_ITEMS:
      return {
        ...state,
        breadcrumbItems: action.payload || [],
      };

    case APP_CLEAR_BREADCRUMB_ITEMS:
      return {
        ...state,
        breadcrumbItems: [],
      };

    case APP_UPDATE_USER_PROFILE:
      return {
        ...state,
        userProfile: { ...action.payload },
      };

    case APP_DELETE_USER_PROFILE:
      return {
        ...state,
        userProfile: undefined,
      };

    case APP_UPDATE_ORGANIZATION:
      return {
        ...state,
        organization: { ...action.payload },
      };

    case APP_DELETE_ORGANIZATION:
      return {
        ...state,
        organization: undefined,
      };

    case APP_UPDATE_ORGANIZATION_MEMBER: {
      const { role, ...otherProps } = action.payload;
      return {
        ...state,
        organizationMember: { ...otherProps },
        authorizationData: { ...role },
      };
    }

    case APP_UPDATE_USER_GUIDE_MODAL:
      return {
        ...state,
        userGuide: {
          ...state.userGuide,
          ...action.payload,
        },
      };

    default:
      return state;
  }
};

export default appReducer;
