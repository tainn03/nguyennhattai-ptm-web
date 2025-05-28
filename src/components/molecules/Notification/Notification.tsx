"use client";

import { useCallback, useEffect } from "react";

import { Alert } from "@/components/molecules";
import { useNotification } from "@/redux/actions";
import { Notification as NotificationProps } from "@/types";

const Notification = ({ id, color = "success", title, message, duration = 5000 }: NotificationProps) => {
  const { closeNotification } = useNotification();

  /**
   * Use a side effect to automatically close a notification after a specified duration.
   */
  useEffect(() => {
    setTimeout(() => {
      closeNotification(id);
    }, duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Closing a notification when triggered.
   *
   * @param key - (Optional) The unique key of the notification to close.
   */
  const handleCloseClick = useCallback(
    (key?: string) => () => {
      closeNotification(key);
    },
    [closeNotification]
  );

  return <Alert color={color} title={title} message={message} onClose={handleCloseClick(id)} className="shadow" />;
};

export default Notification;
