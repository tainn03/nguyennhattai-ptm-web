import useDispatch from "@/redux/actions/useDispatch";
import { APP_ADD_NOTIFICATION, APP_CLEAR_NOTIFICATION, APP_REMOVE_NOTIFICATION } from "@/redux/types";
import { AnyType, Notification } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { NotificationCallback } from "@/types/notification";

const useNotification = (t?: AnyType) => {
  const dispatch = useDispatch();

  /**
   * Show a notification by dispatching an action to add it to the application state.
   *
   * @param notification - The notification to be displayed.
   */
  const showNotification = (notification: Notification) => {
    dispatch<Notification>({
      type: APP_ADD_NOTIFICATION,
      payload: notification,
    });
  };

  /**
   * Close a notification by dispatching an action to remove it from the application state.
   *
   * @param key - (Optional) The unique key of the notification to close.
   * If provided, only the notification with the matching key will be closed. If not provided,
   * all notifications will be cleared.
   */
  const closeNotification = (key?: string) => {
    if (key) {
      // Close a specific notification by key
      dispatch<string>({
        type: APP_REMOVE_NOTIFICATION,
        payload: key,
      });
    } else {
      // Clear all notifications
      dispatch({ type: APP_CLEAR_NOTIFICATION });
    }
  };

  /**
   * Show a notification based on the status code.
   *
   * @param status - The status code.
   * @param name - The name of the object.
   * @param onExisted - The callback function to be called when the status code is HttpStatusCode.Existed.
   */
  const showNotificationBasedOnStatus = (status: number, name?: string | null, callback?: NotificationCallback) => {
    if (status !== HttpStatusCode.Ok) {
      switch (status) {
        case HttpStatusCode.Exclusive:
          showNotification({
            color: "error",
            title: t("common.message.error_title"),
            message: t("common.message.save_error_exclusive", { name: name || t("common.object") }),
          });
          break;
        case HttpStatusCode.Existed:
          callback?.onExisted?.();
          break;
        default:
          showNotification({
            color: "error",
            title: t("common.message.error_title"),
            message: t("common.message.save_error_unknown", { name: name || t("common.object") }),
          });
          break;
      }
    } else {
      showNotification({
        color: "success",
        title: t("common.message.save_success_title"),
        message: t("common.message.save_success_message", { name: name || t("common.object") }),
      });
      callback?.onOk?.();
    }
  };

  return { showNotification, closeNotification, showNotificationBasedOnStatus };
};

export default useNotification;
