import { CustomerType, NotificationType, OrderTripStatusType, RouteType } from "@prisma/client";
import { messaging } from "firebase-admin";
import isObject from "lodash/isObject";
import { connect, NatsConnection, StringCodec } from "nats";

import { getOrganizationSettingExtended, getOrganizationSettingsExtended } from "@/actions/organizationSettingExtended";
import { NATS_SERVER, NEXT_PUBLIC_NATS_WEBSOCKET_TOKEN } from "@/configs/environment";
import { initFirebaseAdmin } from "@/configs/firebase";
import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { OrderInputForm } from "@/forms/order";
import { getCustomerNotificationData } from "@/services/server/customer";
import { createNotification } from "@/services/server/notification";
import { getOrderParticipantNotificationData, getOrderTripPendingNotificationData } from "@/services/server/order";
import { getOrganizationMembersByRoles } from "@/services/server/organizationMember";
import { getRouteNotificationData } from "@/services/server/route";
import { getUnitOfMeasureNotificationData } from "@/services/server/unitOfMeasure";
import { getMessageTokensByUsers } from "@/services/server/userSetting";
import { AnyObject } from "@/types";
import {
  MobileNotification,
  MobileNotificationData,
  NatsWebsocketMessage,
  NatsWebsocketType,
  PushNotificationType,
  TripMessageNotification,
  TripPendingConfirmationNotification,
  VehicleDocumentDriverReminderNotification,
} from "@/types/notification";
import { NotificationInfo, UserInfo } from "@/types/strapi";
import { getOrderSubscriptionChannel, getUserSubscriptionChannel } from "@/utils/auth";
import { createTranslator } from "@/utils/locale";
import logger from "@/utils/logger";
import { equalId } from "@/utils/number";
import { ensureString, isTrue, joinNonEmptyStrings } from "@/utils/string";

/**
 * Generates notification data including subject and message for a given notification type and data.
 * Supports multiple languages through translation keys and data.
 *
 * @param type - The type of notification.
 * @param data - Additional data for generating the notification.
 * @returns A promise that resolves to a Partial<NotificationInfo> with subject and message.
 */
export const generateNotification = (
  type: NotificationType,
  data: AnyObject,
  isOrderConsolidationEnabled = false
): Partial<NotificationInfo> => {
  let meta = data;

  // Define the key prefix for translation based on the notification type
  const keyPrefix = `notification.${type.toLowerCase()}`;

  // Initialize default subject and message keys
  let subject = `${keyPrefix}.subject`;
  let message = `${keyPrefix}.message`;

  // Handle different notification types
  switch (type) {
    case NotificationType.NEW_ORDER:
      if (data?.customer.type === CustomerType.FIXED) {
        subject = `${keyPrefix}.subject.fixed_customer`;

        message =
          data?.route.type === RouteType.FIXED
            ? `${keyPrefix}.message.fixed_customer_fixed_route`
            : `${keyPrefix}.message.fixed_customer_non_fixed_route`;
      } else {
        subject = `${keyPrefix}.subject.casual_customer`;
        message = `${keyPrefix}.message.casual_customer_non_fixed_route`;
      }

      meta = {
        ...(data.orderCode && { orderCode: data.orderCode }),
        ...(data.customerCode && { customerCode: data.customerCode }),
        ...(data.customerName && { customerName: data.customerName }),
        ...(data.routeCode && { routeCode: data.routeCode }),
        ...(data.routeName && { routeName: data.routeName }),
        ...(data.weight && { weight: data.weight }),
        ...(data.unitOfMeasure && { unitOfMeasure: data.unitOfMeasure }),
      };
      break;
    case NotificationType.ORDER_STATUS_CHANGED:
      message = `${keyPrefix}.message.${data?.orderStatus.toLowerCase()}`;

      meta = {
        ...(isOrderConsolidationEnabled && data?.orderGroupCode
          ? { orderCode: data.orderGroupCode }
          : { orderCode: data.orderCode }),
        ...(data.fullName && { fullName: data.fullName }),
      };
      break;
    case NotificationType.ORDER_GROUP_STATUS_CHANGED: {
      const groupStatus = data?.orderGroupStatus.toLowerCase();
      subject = `${keyPrefix}.${groupStatus}.subject`;
      message = `${keyPrefix}.${groupStatus}.message`;
      break;
    }
    case NotificationType.TRIP_STATUS_CHANGED: {
      const tripStatus = data.tripStatus ? data.tripStatus.toLowerCase() : "is_not_system";

      subject = `${keyPrefix}.${tripStatus}.subject`;
      message = `${keyPrefix}.${tripStatus}.message`;

      if (data.tripStatus === OrderTripStatusType.PENDING_CONFIRMATION) {
        if (data.isNewTripInfoConfidential) {
          subject = `${keyPrefix}.${tripStatus}.subject_confidential`;
          message = `${keyPrefix}.${tripStatus}.message_confidential`;
        } else {
          if (data.tripDetailsDisplayRules) {
            if (!data.tripDetailsDisplayRules?.customer) {
              message = "notification.trip_status_changed.pending_confirmation.message_without_customer";
              if (!data.tripDetailsDisplayRules?.route || data.routeType === RouteType.NON_FIXED) {
                message = "notification.trip_status_changed.pending_confirmation.message_without_customer_route";
              }
            } else if (!data.tripDetailsDisplayRules?.route) {
              message = "notification.trip_status_changed.pending_confirmation.message_without_route";
            } else if (data.routeType === RouteType.NON_FIXED) {
              message = `${keyPrefix}.${tripStatus}.message_non_fixed_route`;
            }
          } else if (data.routeType === RouteType.NON_FIXED) {
            message = `${keyPrefix}.${tripStatus}.message_non_fixed_route`;
          }
        }
      }

      meta = {
        ...(data.orderCode && {
          orderCode: isOrderConsolidationEnabled && data.orderGroupCode ? data.orderGroupCode : data.orderCode,
        }),
        ...(data.tripCode && {
          tripCode: isOrderConsolidationEnabled && data.orderGroupCode ? data.orderGroupCode : data.tripCode,
        }),
        ...(isOrderConsolidationEnabled && data.orderGroupCode && { groupCode: data.orderGroupCode }),
        ...(data.tripStatus && { tripStatus: data.tripStatus }),
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.tripStatus === OrderTripStatusType.WAREHOUSE_GOING_TO_PICKUP && {
          pickupPoint: data.pickupPoint || "",
        }),
        ...(data.driverFullName && { driverFullName: data.driverFullName }),
        ...(data.vehicleNumber && { vehicleNumber: data.vehicleNumber }),
        ...(data.customerCode && { customerCode: data.customerCode }),
        ...(data.customerName && { customerName: data.customerName }),
        ...(data.routeCode && { routeCode: data.routeCode }),
        ...(data.routeName && { routeName: data.routeName }),
        ...(data.weight && { weight: data.weight }),
        ...(data.unitOfMeasure && { unitOfMeasure: data.unitOfMeasure }),
        ...(data.billOfLading && { billOfLading: data.billOfLading }),
        ...(data.driverReportName && { driverReportName: data.driverReportName }),
      };
      break;
    }
    case NotificationType.TRIP_NEW_MESSAGE:
      {
        const { fullName, tripCode, message: msgContent, numOfAttachment } = data as TripMessageNotification;

        if (!msgContent || !numOfAttachment) {
          if (msgContent) {
            message = `${keyPrefix}.text_message`;
          } else {
            message = `${keyPrefix}.file_message`;
          }
        }

        let shortMessage = msgContent ?? "";
        if (msgContent) {
          const splitMsg = msgContent.split(" ");

          if (splitMsg.length > 7) {
            shortMessage = `${joinNonEmptyStrings(splitMsg.slice(0, 7))}...`;
          }
        }

        meta = {
          fullName: fullName,
          tripCode: isOrderConsolidationEnabled && data.orderGroupCode ? data.orderGroupCode : tripCode,
          driverUserId: Number(data.driverUserId),
          ...(data.tripId && { tripId: data.tripId }),
          ...(msgContent && { shortMessage }),
          ...(numOfAttachment && { numOfAttachment }),
          ...(data.orderCode && {
            orderCode: isOrderConsolidationEnabled && data.orderGroupCode ? data.orderGroupCode : data.orderCode,
          }),
        };
      }
      break;
    case NotificationType.VEHICLE_DOCUMENT_DRIVER_REMINDER:
      {
        const { technicalSafetyExpirationDate, liabilityInsuranceExpirationDate, ...otherProps } =
          data as VehicleDocumentDriverReminderNotification;
        if (technicalSafetyExpirationDate && liabilityInsuranceExpirationDate) {
          subject = `${keyPrefix}_all.subject`;
          message = `${keyPrefix}_all.message`;
        } else if (technicalSafetyExpirationDate) {
          subject = `${keyPrefix}_technical_safety.subject`;
          message = `${keyPrefix}_technical_safety.message`;
        } else if (liabilityInsuranceExpirationDate) {
          subject = `${keyPrefix}_liability_insurance.subject`;
          message = `${keyPrefix}_liability_insurance.message`;
        }

        meta = {
          ...otherProps,
          ...(technicalSafetyExpirationDate &&
            liabilityInsuranceExpirationDate && { expirationDate: technicalSafetyExpirationDate }),
          ...(technicalSafetyExpirationDate && !liabilityInsuranceExpirationDate && { technicalSafetyExpirationDate }),
          ...(liabilityInsuranceExpirationDate &&
            !technicalSafetyExpirationDate && { liabilityInsuranceExpirationDate }),
        };
      }
      break;
    case NotificationType.VEHICLE_DOCUMENT_OPERATOR_REMINDER: {
      if (data?.technicalSafetyExpirationDate) {
        subject = `${keyPrefix}_technical_safety.subject`;
        message = `${keyPrefix}_technical_safety.message`;
      }

      if (data?.liabilityInsuranceExpirationDate) {
        subject = `${keyPrefix}_liability_insurance.subject`;
        message = `${keyPrefix}_liability_insurance.message`;
      }
      break;
    }
    case NotificationType.BILL_OF_LADING_RECEIVED:
    case NotificationType.NEW_ORDER_PARTICIPANT:
    case NotificationType.DELETE_ORDER:
    case NotificationType.DRIVER_EXPENSE_RECEIVED:
    case NotificationType.ORDER_GROUP_CLOSE_TO_EXPIRE:
    default:
      break;
  }

  return {
    subject,
    message,
    meta: JSON.stringify(meta),
  };
};

/**
 * Creates a system notification based on the provided parameters.
 *
 * @param param - The parameters needed to create the system notification.
 *   - type: The type of the notification.
 *   - data: Additional data for generating the notification content.
 *   - userId: The ID of the user triggering the notification.
 *   - recipientUserIds: An array of user IDs who will receive the notification.
 *   - organizationId: The ID of the organization related to the notification.
 *   - targetId: The ID of the target related to the notification.
 *
 * @returns A promise that resolves when the system notification is created.
 */
export const pushNotification = async ({
  entity,
  data,
  orgMemberRoles,
  jwt,
  receivers,
  isSendToParticipants = true,
}: PushNotificationType) => {
  const { type, organizationId, targetId, createdById } = entity;

  if (!type || !organizationId || !targetId || !createdById) {
    return;
  }

  let otherData = null;

  switch (type) {
    case NotificationType.NEW_ORDER:
      otherData = await getNewOrderNotificationData(jwt, { ...data, organizationId });
      break;
    case NotificationType.TRIP_STATUS_CHANGED: {
      if ((data as AnyObject)?.tripStatus === OrderTripStatusType.PENDING_CONFIRMATION) {
        otherData = await getTripPendingConfirmationNotificationData(
          jwt,
          data as TripPendingConfirmationNotification,
          organizationId
        );
      }
      break;
    }
    default:
      break;
  }

  const recipients = entity.recipients ?? [];
  const uniqueUserIds: Set<number> = new Set();

  if (receivers) {
    // Add receivers to recipient list
    for (const receiver of receivers) {
      if (
        receiver.user?.id &&
        !equalId(receiver.user.id, createdById) &&
        !uniqueUserIds.has(Number(receiver.user?.id))
      ) {
        recipients.push({ user: receiver.user });
        uniqueUserIds.add(Number(receiver.user?.id));
      }
    }
  }

  if (isSendToParticipants && "orderCode" in data && data.orderCode) {
    // Get participant and add to recipient list
    const participants = await getOrderParticipantNotificationData(jwt, organizationId, ensureString(data.orderCode));
    if (participants) {
      for (const participant of participants) {
        if (!equalId(participant.user?.id, createdById) && !uniqueUserIds.has(Number(participant.user?.id))) {
          recipients.push({ user: participant.user });
          uniqueUserIds.add(Number(participant.user?.id));
        }
      }
    }
  }

  // Get members by role and add to recipient list
  if (orgMemberRoles && orgMemberRoles.length > 0 && jwt) {
    const orgMembers = await getOrganizationMembersByRoles(jwt, organizationId, orgMemberRoles);

    if (orgMembers) {
      for (const orgMember of orgMembers) {
        if (
          orgMember.member?.id &&
          !equalId(orgMember.member.id, createdById) &&
          !uniqueUserIds.has(Number(orgMember.member.id))
        ) {
          recipients.push({ user: orgMember.member });
          uniqueUserIds.add(Number(orgMember.member.id));
        }
      }
    }
  }

  // Get the order consolidation enabled setting.
  const orderConsolidationEnabled = await getOrganizationSettingExtended<boolean>({
    organizationId,
    key: OrganizationSettingExtendedKey.ORDER_CONSOLIDATION_ENABLED,
  });

  // Prepare notification data
  const notificationData = generateNotification(type, { ...data, ...otherData }, isTrue(orderConsolidationEnabled));

  // Create notification
  const notification: Partial<NotificationInfo> = { ...entity, ...notificationData, recipients };
  const { id: notificationId, createdAt } = await createNotification(notification);
  notification.id = notificationId;
  notification.createdAt = createdAt;

  // Send websocket
  if (recipients.length > 0) {
    sendWebsocketMessage(notification);
  }

  // Push mobile notification
  if (jwt && recipients.length > 0) {
    pushMobileNotification(jwt, organizationId, {
      id: notification.id,
      subject: notificationData.subject,
      message: notificationData.message,
      meta: notificationData.meta,
      receivers: recipients,
      type,
    });
  }
};

/**
 * Sends mobile notifications to specified users with the given message details.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {number} organizationId - Identifier for the organization.
 * @param {MobileNotification} params - Object containing notification details like subject, message, meta, and receivers.
 * @returns {Promise<void>} - A Promise resolving to undefined once the notifications are sent.
 */
const pushMobileNotification = async (jwt: string, organizationId: number, params: MobileNotification) => {
  const { id, subject, message, meta, type, receivers } = params;
  const users = receivers?.map((receiver) => receiver.user);

  // Get message tokens for the specified users
  const usersMessageTokens = await getMessageTokensByUsers(jwt, organizationId, users as UserInfo[]);
  if ((usersMessageTokens || []).length === 0) {
    return;
  }

  // Initialize Firebase Admin SDK
  initFirebaseAdmin();

  // Initialize translator
  const t = await createTranslator();

  // Parse meta information and extract message tokens
  let metaObj = JSON.parse(meta as string);
  metaObj = { ...metaObj, type, notificationId: id };

  const messageTokens = usersMessageTokens
    .map((item) => item.setting.messageTokens)
    .flat()
    .map((item) => {
      const messageToken = JSON.parse(JSON.stringify(item))?.token;
      return isObject(item) && messageToken ? messageToken : item;
    });

  // Prepare data for notification
  let data: MobileNotificationData = {};
  Object.keys(metaObj).forEach((key) => {
    if (metaObj[key] !== null || metaObj[key] !== undefined) {
      data = { ...data, [key]: ensureString(metaObj[key]) };
    }
  });

  // Send notifications using Firebase Cloud Messaging
  messaging().sendEachForMulticast({
    tokens: messageTokens as string[],
    data,
    notification: {
      title: t(subject, metaObj),
      body: t(message, metaObj),
    },
    apns: {
      payload: {
        aps: {
          contentAvailable: true,
          sound: "default",
        },
      },
    },
  });
};

/**
 * Handles the data retrieval for creating a notification when a new order is created.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param data - The input form data for the new order.
 *
 * @returns A promise that resolves to an object containing data for generating the notification.
 */
const getNewOrderNotificationData = async (jwt: string, data: OrderInputForm) => {
  const { customer, unit, route, organizationId } = data;

  if (!customer?.type || !unit?.id || !route?.type || !organizationId) {
    return null;
  }

  let customerData = null;
  let routeData = null;
  const unitOfMeasure = await getUnitOfMeasureNotificationData(jwt, organizationId, unit.id);

  if (customer.type === CustomerType.FIXED) {
    customerData = await getCustomerNotificationData(jwt, organizationId, Number(customer.id));

    if (route.type === RouteType.FIXED) {
      routeData = await getRouteNotificationData(jwt, organizationId, Number(route.id));
    }

    return {
      ...(customerData && { customerCode: customerData?.code }),
      ...(customerData && {
        customerName: customerData?.name,
      }),
      ...(routeData && { routeCode: routeData.code }),
      ...(routeData && { routeName: routeData.name }),
      unitOfMeasure: unitOfMeasure?.code,
    };
  } else {
    return {
      customerName: customer.name,
      unitOfMeasure: unitOfMeasure?.code,
    };
  }
};
/**
 * Handles the data retrieval for creating a notification when a new order is created.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param data - The input form data for the new order.
 * @param organizationId - The ID of the organization related to the notification.
 *
 * @returns A promise that resolves to an object containing data for generating the notification.
 */
const getTripPendingConfirmationNotificationData = async (
  jwt: string,
  data: TripPendingConfirmationNotification,
  organizationId: number
) => {
  const { orderId } = data;

  const order = await getOrderTripPendingNotificationData(jwt, organizationId, orderId);
  const orgSettingExtended = await getOrganizationSettingsExtended(organizationId, [
    OrganizationSettingExtendedKey.IS_NEW_TRIP_INFO_CONFIDENTIAL,
    OrganizationSettingExtendedKey.TRIP_DETAILS_DISPLAY_RULES,
  ]);

  const isNewTripInfoConfidential = isTrue(
    orgSettingExtended?.[OrganizationSettingExtendedKey.IS_NEW_TRIP_INFO_CONFIDENTIAL]
  );
  const tripDetailsDisplayRules = orgSettingExtended?.[OrganizationSettingExtendedKey.TRIP_DETAILS_DISPLAY_RULES];

  return {
    ...(order?.customer.code && { customerCode: order.customer.code }),
    ...(order?.customer.name && { customerName: order.customer.name }),
    ...(order?.route.type && { routeType: order.route.type }),
    ...(order?.route.code && { routeCode: order.route.code }),
    ...(order?.route.name && { routeName: order.route.name }),
    isNewTripInfoConfidential,
    tripDetailsDisplayRules,
  };
};

/**
 * Sends a notification message to specific users via NATS WebSocket channels.
 * Establishes a NATS WebSocket connection, then sends a notification to each recipient's personal channel.
 * Closes the connection after all messages have been published.
 *
 * @param {Partial<NotificationInfo>} notification - The notification data to send.
 */
const sendWebsocketMessage = async (notification: Partial<NotificationInfo>) => {
  const orgId = notification.organizationId;
  const recipients = notification.recipients || [];
  const userIds = recipients.map((item) => Number(item.user?.id));

  // Check that orgId and userIds exist before proceeding
  if (!orgId || userIds.length === 0) {
    return;
  }

  let nc: NatsConnection | undefined;
  try {
    // Connect to NATS server
    nc = await connect({
      servers: NATS_SERVER,
      token: NEXT_PUBLIC_NATS_WEBSOCKET_TOKEN,
    });
    const sc = StringCodec();

    // Extract notification details and Create message payload
    const { id, subject, message, targetId, meta, createdAt } = notification;
    const type: NatsWebsocketType = notification.type || "UNKNOWN";
    const messageData: NatsWebsocketMessage = { id, type, subject, message, targetId, meta, createdAt };
    const payload = sc.encode(JSON.stringify(messageData));

    // Send notification to each user's channel
    for (const userId of userIds) {
      try {
        // Publish the message to the user's channel
        const channel = getUserSubscriptionChannel(orgId, userId);
        nc.publish(channel, payload);
      } catch (err) {
        // Log error if publishing message to a specific user fails
        logger.error(`Failed to publish message for user ${userId}: ${err}`);
      }
    }

    // Broadcast to the channels 'org<orgId>.order<orderCode>'
    // when an order is updated. (e.g.: org4.orderGSSR4JWXCI)
    if (
      (type === NotificationType.DELETE_ORDER ||
        type === NotificationType.ORDER_STATUS_CHANGED ||
        type === NotificationType.TRIP_STATUS_CHANGED) &&
      meta
    ) {
      const { orderCode } = JSON.parse(ensureString(meta));
      if (orderCode) {
        const channel = getOrderSubscriptionChannel(orgId, orderCode);
        nc.publish(channel, payload);
      }
    }
  } catch (err) {
    // Log error if the NATS connection fails
    logger.error(`Failed to initialize NATS connection: ${err}`);
  } finally {
    // Ensure the NATS connection is safely closed after all messages are processed
    if (nc) {
      await nc.drain();
    }
  }
};
