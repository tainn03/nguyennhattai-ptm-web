"use client";

import { useCallback, useMemo } from "react";

import { BrowserNotification } from "@/types/notification";

const NOTIFICATION_ICON = "/assets/icons/notification.ico";

const useBrowserNotification = () => {
  const sound = useMemo(() => new Audio("/assets/audios/notify.mp3"), []);

  /**
   * Requests permission for desktop notifications. This function checks browser support
   */
  const requestPermission = useCallback(() => {
    if (!("Notification" in window)) {
      console.error("This browser does not support desktop notification");
    } else if (Notification.permission === "granted") {
      return true;
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission()
        .then((permission) => {
          if (permission === "granted") {
            return true;
          } else {
            console.error("Notification permission not granted");
            return false;
          }
        })
        .catch((error) => {
          console.error("Error requesting notification permission:", error);
          return false;
        });
    }
    return false;
  }, []);

  /**
   * Pushes a desktop notification with the specified title, body, and onClick callback.
   * This function checks browser support and permission before creating and displaying the notification.
   *
   * @param {BrowserNotification} options - Notification options including title, body, and onClick callback.
   */
  const pushNotification = useCallback(({ title, body, onClick }: BrowserNotification) => {
    // Check if the browser supports desktop notifications
    if (!("Notification" in window)) {
      console.error("This browser does not support desktop notification");
    } else if (Notification.permission === "granted") {
      // Create and display the notification if permission is already granted
      const notification = new Notification(title, { body, icon: NOTIFICATION_ICON });
      notification.onclick = () => {
        window.focus();
        onClick && onClick();
      };
    } else if (Notification.permission !== "denied") {
      // Request notification permission and display the notification if granted
      Notification.requestPermission()
        .then((permission) => {
          if (permission === "granted") {
            const notification = new Notification(title, { body, icon: NOTIFICATION_ICON });
            notification.onclick = () => {
              window.focus();
              onClick && onClick();
            };
          } else {
            console.error("Notification permission not granted");
          }
          return permission;
        })
        .catch((error) => {
          console.error("Error requesting notification permission:", error);
        });
    }
  }, []);

  /**
   * Plays a sound. This function is typically used to play a notification sound
   * when a new notification is received or a specific event occurs in the application.
   */
  const playSound = useCallback(async () => {
    await sound.play();
  }, [sound]);

  return { requestPermission, pushNotification, playSound };
};

export default useBrowserNotification;
