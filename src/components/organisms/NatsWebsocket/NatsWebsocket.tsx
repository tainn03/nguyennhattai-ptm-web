"use client";

import { NotificationType } from "@prisma/client";
import * as nats from "nats.ws";
import { NatsConnection, Subscription } from "nats.ws";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useRef } from "react";
import { mutate } from "swr";

import { __DEV__, NEXT_PUBLIC_NATS_WEBSOCKET_SERVER, NEXT_PUBLIC_NATS_WEBSOCKET_TOKEN } from "@/configs/environment";
import { useAuth, useBrowserNotification } from "@/hooks";
import { useDispatch, useNotification } from "@/redux/actions";
import { NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION } from "@/redux/types";
import { updateLastNotificationSentAt } from "@/services/client/userSetting";
import { AnyObject } from "@/types";
import { NatsWebsocketMessage } from "@/types/notification";
import { getUserSubscriptionChannel } from "@/utils/auth";
import { ensureString, getNotificationNavigationLink } from "@/utils/string";

const { connect, StringCodec } = nats;

const NatsWebsocket = () => {
  const router = useRouter();
  const t = useTranslations();
  const dispatch = useDispatch();
  const { pushNotification, playSound } = useBrowserNotification();
  const { showNotification } = useNotification();

  const { orgId, orgLink, userId, user, reloadUserProfile } = useAuth(false);

  const initRef = useRef(false);
  const natsConnectionRef = useRef<NatsConnection>();
  const subscriptionsRef = useRef<Map<string, Subscription>>(new Map());
  const processFunctionRef = useRef<(payload: string) => void>();

  /**
   * Closes the active NATS connection and unsubscribes from all active subscriptions.
   */
  const closeNatsConnection = useCallback(async () => {
    if (natsConnectionRef.current) {
      await natsConnectionRef.current.flush();
      await natsConnectionRef.current.close();

      // Unsubscribe from all active subscriptions.
      subscriptionsRef.current.forEach((subscription) => {
        if (!subscription.isClosed()) {
          subscription.unsubscribe();
        }
      });
      subscriptionsRef.current.clear();
    }
  }, []);

  useEffect(() => {
    return () => {
      closeNatsConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Update last notification sent at of user setting when push notify to browser or play notify sound.
   * Reload useAuth to get new last notification sent at.
   */
  const updateLastReadNotification = useCallback(
    async (lastCreatedAt?: Date) => {
      const settingId = user?.setting.id && Number(user.setting.id);
      if (lastCreatedAt && settingId) {
        const { data } = await updateLastNotificationSentAt({
          id: settingId,
          lastNotificationSentAt: lastCreatedAt,
        });
        data && reloadUserProfile();
      }
    },
    [reloadUserProfile, user?.setting.id]
  );

  const handleNotificationClick = useCallback(
    (type: NotificationType, meta: AnyObject) => () => {
      const navigationLink = getNotificationNavigationLink(orgLink, type, {
        orderCode: meta.orderCode,
        ...(type === NotificationType.TRIP_NEW_MESSAGE && { tripCode: meta.tripCode }),
      });
      navigationLink && router.push(navigationLink);
    },
    [orgLink, router]
  );

  /**
   * Processes incoming notification messages received through WebSocket.
   * The payload is expected to be a JSON string representing a notification.
   * The function attempts to parse the payload and logs the notification details.
   *
   * @param payload - The message payload as a JSON string.
   */
  const processNotificationMessage = useCallback(
    async (payload: string) => {
      try {
        // Parse the incoming payload into a NatsWebsocketMessage object
        const message: NatsWebsocketMessage | null = JSON.parse(payload);
        __DEV__ && console.log("#processNotificationMessage:", message);
        if (!message) {
          return;
        }

        switch (message.type) {
          case "TEST_CONNECTION":
          case "UNKNOWN":
            break;
          default: {
            // Trigger to fetch the count of unread notifications
            mutate([
              "unread-notification-count",
              {
                notification: { organizationId: orgId },
                user: { id: userId },
              },
            ]);

            // Trigger event to send new notification to listener
            dispatch<boolean>({
              type: NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION,
              payload: true,
            });
            const meta = JSON.parse(ensureString(message.meta));
            // Sent a notification to user using browser
            if (document.hidden) {
              pushNotification({
                title: t(message.subject, { ...meta }),
                body: t(message.message, { ...meta }),
                onClick: handleNotificationClick(message.type, meta),
              });
            } else {
              showNotification({
                color: "info",
                title: t(message.subject, { ...meta }),
                message: t(message.message, { ...meta }),
              });
              playSound();
            }

            // Update last read notification for current user
            updateLastReadNotification(message.createdAt);
            break;
          }
        }
      } catch (err) {
        // If parsing fails, ignore the error silently
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId, userId, t, updateLastReadNotification, handleNotificationClick]
  );

  /**
   * Update logic for projess notification message
   */
  useEffect(() => {
    processFunctionRef.current = processNotificationMessage;
  }, [processNotificationMessage]);

  /**
   * Initializes subscriptions for the specified channels.
   *
   * @param {string[]} channels - An array of channels to subscribe to.
   */
  const initSubscriptions = useCallback(async (channels: string[]) => {
    if (!natsConnectionRef.current) {
      return;
    }

    const sc = StringCodec();
    for (const channel of channels) {
      const subscription = natsConnectionRef.current.subscribe(channel);
      subscriptionsRef.current.set(channel, subscription);

      (async () => {
        for await (const msg of subscription) {
          const raw = sc.decode(msg.data);
          if (processFunctionRef.current) {
            await processFunctionRef.current(raw);
          }
        }
        __DEV__ && console.log(`[${channel}] subscription closed`);
      })().catch((err) => {
        console.error(`Error while subscribing to [${channel}]:`, err);
      });
    }
  }, []);

  /**
   * Initializes the NATS connection and sets up subscriptions.
   */
  const initNatsConnection = useCallback(async () => {
    if (initRef.current || !orgId || !userId) {
      return;
    }
    initRef.current = true;

    // Create a connection to the NATS server.
    try {
      natsConnectionRef.current = await connect({
        servers: NEXT_PUBLIC_NATS_WEBSOCKET_SERVER,
        token: NEXT_PUBLIC_NATS_WEBSOCKET_TOKEN,
      });

      // Subscribe to channels (global, organization, and personal).
      const channel = getUserSubscriptionChannel(orgId, userId);
      await initSubscriptions([channel]);
    } catch (error) {
      console.error("Failed to initialize NATS connection:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initSubscriptions]);

  useEffect(() => {
    initNatsConnection();
  }, [initNatsConnection]);

  return null;
};

export default NatsWebsocket;
