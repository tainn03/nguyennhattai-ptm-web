import { Reducer } from "redux";

import { Action } from "@/redux/actions";
import { NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION } from "@/redux/types";

type NotificationState = {
  haveNewNotification: boolean;
};

const initialState: NotificationState = {
  haveNewNotification: false,
};

const notificationReducer: Reducer<NotificationState, Action> = (state = initialState, action) => {
  switch (action.type) {
    case NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION:
      return {
        ...state,
        haveNewNotification: action.payload,
      };

    default:
      return state;
  }
};

export default notificationReducer;
