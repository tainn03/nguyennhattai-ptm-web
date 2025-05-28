"use client";

import { Dialog, Transition } from "@headlessui/react";
import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { OrderStatusType, OrderTripStatusType, UploadFile } from "@prisma/client";
import { HttpStatusCode } from "axios";
import clsx from "clsx";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { ChangeEvent, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiOutlineSend } from "react-icons/ai";
import { PiFileTextThin as PiFileTextThinIcon } from "react-icons/pi";

import { VoiceMessage } from "@/components/atoms";
import { Authorization, Avatar, Button, CopyToClipboard, MessageList, TextField } from "@/components/molecules";
import { VoiceRecord } from "@/components/organisms";
import { internalMessageOptions } from "@/configs/media";
import { ALLOWED_PREVIEW_EXTENSIONS } from "@/constants/file";
import { LIMIT_FILE_PER_MESSAGE } from "@/constants/orderTripMessage";
import { OrderTripMessageInputForm, OrderTripMessageSchema } from "@/forms/orderTripMessage";
import { useAuth } from "@/hooks";
import { useDispatch, useNotification } from "@/redux/actions";
import { useNotificationState, useOrderState } from "@/redux/states";
import { NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION } from "@/redux/types";
import {
  getInitOrderTripMessage,
  getNewOrderTripMessage,
  getOrderTripMessageWithPage,
} from "@/services/client/orderTrip";
import { ApiResult } from "@/types/api";
import { OrderTripInfo, UserInfo } from "@/types/strapi";
import { post, postForm } from "@/utils/api";
import { getAccountInfo } from "@/utils/auth";
import { getFileExtension } from "@/utils/file";
import { getOrderStatusFlags } from "@/utils/order";
import { ensureString, trim } from "@/utils/string";

export type OrderTripMessage = {
  messageId?: number;
  message: string;
  createdAt?: Date;
  isSystem: boolean;
  createdByUser?: Partial<UserInfo>;
  readByUsers?: Partial<UserInfo>[];
  attachments?: Partial<UploadFile>[];
  latitude?: number | null;
  longitude?: number | null;
};

const initialFormValues: OrderTripMessageInputForm = {
  attachments: [],
  type: null,
  message: "",
  urlFileMessages: [],
  fileNames: [],
  tripId: 0,
  createdById: 0,
  organizationId: 0,
};

type MessageModalProps = {
  open: boolean;
  orderTripId: number;
  driverUserId: number;
  onClose: () => void;
};

const MessageModal = ({ open, orderTripId, driverUserId, onClose }: MessageModalProps) => {
  const t = useTranslations();
  const { orgId, orgLink, user } = useAuth();
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  const { haveNewNotification } = useNotificationState();
  const { order } = useOrderState();

  const [listMessage, setListMessage] = useState<OrderTripMessage[]>([]);
  const [recordIndex, setRecordIndex] = useState(-1);
  const [page, setPage] = useState(1);
  const [tripCode, setTripCode] = useState<string | null>("");
  const [currentOrderStatus, setCurrentOrderStatus] = useState<OrderStatusType>();

  const lastInitMessageCreatedAt = useRef<Date>();
  const lastNewMessageCreatedAt = useRef<Date>();

  const accountInfo = useMemo(() => getAccountInfo(user), [user]);

  /**
   * Handle load more message in to list
   * @param newData Order trip data with list message
   */
  const handleLoadMessage = useCallback(
    (newData: OrderTripInfo) => {
      const listMsg: OrderTripMessage[] = [...listMessage];

      for (const tripMessage of newData.messages) {
        const orderTripMessage: OrderTripMessage = {
          messageId: Number(tripMessage.id),
          message: ensureString(tripMessage.message),
          createdAt: tripMessage.createdAt,
          createdByUser: tripMessage.createdByUser,
          isSystem: false,
          readByUsers: tripMessage.readByUsers,
          attachments: tripMessage.attachments,
          latitude: tripMessage.latitude,
          longitude: tripMessage.longitude,
        };

        listMsg.push(orderTripMessage);
      }

      // Sort by date
      const result = listMsg.sort((a: OrderTripMessage, b: OrderTripMessage) => {
        if (a.createdAt && b.createdAt) {
          const aDate = new Date(ensureString(a.createdAt));
          const bDate = new Date(ensureString(b.createdAt));

          return aDate.getTime() - bDate.getTime();
        }
        return 0;
      });

      setListMessage(result);
    },
    [listMessage]
  );

  /**
   * Listen notification and reload if have new message
   */
  useEffect(() => {
    // Refresh new data
    const refreshNewData = async () => {
      const newData = await getNewOrderTripMessage(
        { organizationId: orgId, id: orderTripId },
        lastNewMessageCreatedAt?.current as Date
      );

      if (newData?.messages && newData.messages.length > 0) {
        lastNewMessageCreatedAt.current = newData.messages[0].createdAt;
        handleLoadMessage(newData);
      }
    };

    if (haveNewNotification) {
      dispatch({
        type: NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION,
        payload: false,
      });

      if (orderTripId) {
        refreshNewData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haveNewNotification]);

  /**
   * Handle submit order trip message form
   *
   * @param values Form values of order trip message
   * @param formikHelpers Formik helpers of order trip message
   */
  const handleSubmitFormik = useCallback(
    async (values: OrderTripMessageInputForm, formikHelpers: FormikHelpers<OrderTripMessageInputForm>) => {
      if (trim(values.message)?.length === 0 && (values.fileNames || []).length === 0) {
        return;
      }

      const { data } = await post<ApiResult>(`/api${orgLink}/orders/${order?.code}/trips/${tripCode}/messages`, {
        orderCode: order?.code,
        file: values.fileNames,
        orderDate: order?.orderDate,
        tripId: orderTripId,
        tripCode,
        fullName: getAccountInfo(user).displayName,
        driverUserId,
        message: values.message,
      });

      formikHelpers.setSubmitting(false);
      if (!data) {
        showNotification({
          color: "error",
          title: t("common.message.error_title"),
          message: t("order.trip.message_modal.notification.message.send_failed_message"),
        });
      } else {
        formikHelpers.resetForm({ values: initialFormValues });
        const newData = await getNewOrderTripMessage(
          { organizationId: orgId, id: orderTripId },
          lastNewMessageCreatedAt?.current as Date
        );

        if (newData?.messages && newData.messages.length > 0) {
          lastNewMessageCreatedAt.current = newData.messages[0].createdAt;
          handleLoadMessage(newData);
        }
      }
    },
    [
      orgLink,
      order?.code,
      order?.orderDate,
      tripCode,
      orderTripId,
      user,
      driverUserId,
      showNotification,
      t,
      orgId,
      handleLoadMessage,
    ]
  );

  const { values, isSubmitting, handleSubmit, setFieldValue, handleChange } = useFormik({
    initialValues: initialFormValues,
    validationSchema: OrderTripMessageSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  /**
   * Remove file from list
   * @param index index of file want to remove
   */
  const handleRemoveFile = useCallback(
    (index: number) => () => {
      if (index === recordIndex) {
        setRecordIndex(-1);
      } else if (index < recordIndex) {
        setRecordIndex(recordIndex - 1);
      }

      const listFile = values?.urlFileMessages || [];
      listFile.splice(index, 1);
      setFieldValue("urlFileMessages", listFile);

      const listFileName = values?.fileNames || [];
      listFileName.splice(index, 1);
      setFieldValue("fileNames", listFileName);
    },
    [values, recordIndex, setFieldValue]
  );

  /**
   * Handle upload file
   *
   * @param event Event of input file
   */
  const handleUploadFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.target instanceof HTMLInputElement && event.target.files) {
        if ((values.fileNames || []).length === LIMIT_FILE_PER_MESSAGE) {
          showNotification({
            color: "warning",
            title: t("order.trip.message_modal.max_file_per_message", { limit: LIMIT_FILE_PER_MESSAGE }),
          });
          return;
        }
        for (const file of event.target.files) {
          // Check file extension
          const ext = getFileExtension(file.name);
          if (!internalMessageOptions.fileTypes.includes(ext)) {
            showNotification({
              color: "warning",
              title: t("order.trip.message_modal.notification.un_support_file_type.title", { ext }),
              message: t("order.trip.message_modal.notification.un_support_file_type.message"),
            });
            return false;
          }

          // Check file size
          if (file.size > internalMessageOptions.maxFileSize) {
            showNotification({
              color: "warning",
              title: t("order.trip.message_modal.notification.max_file_size.title"),
              message: t("order.trip.message_modal.notification.max_file_size.message", {
                maxFileSize: internalMessageOptions.maxFileSize / 1024 / 1024,
              }),
            });
            return false;
          }

          const { data, status } = await postForm<ApiResult>("/api/upload", { file, type: "INTERNAL_MESSAGE" });

          if (status === HttpStatusCode.Ok) {
            setFieldValue("fileNames", [...(values?.fileNames || []), data.fileName]);
            setFieldValue("urlFileMessages", [...(values?.urlFileMessages || []), URL.createObjectURL(file)]);
          }
        }
      }
    },
    [t, values.fileNames, values.urlFileMessages, setFieldValue, showNotification]
  );

  /**
   * Handle data after stop record
   * @param audioUrl Url of audio
   * @param fileName File name of audio in server
   */
  const handleStopRecord = useCallback(
    (audioUrl: string, fileName: string) => {
      if (recordIndex >= 0) {
        const newFileNames = [...(values?.fileNames || [])];
        newFileNames[recordIndex] = fileName;
        setFieldValue("fileNames", newFileNames);

        const newUrlFileMessages = [...(values?.urlFileMessages || [])];
        newFileNames[recordIndex] = fileName;
        setFieldValue("urlFileMessages", newUrlFileMessages);
      } else {
        setRecordIndex((values?.fileNames || []).length);
        setFieldValue("fileNames", [...(values?.fileNames || []), fileName]);
        setFieldValue("urlFileMessages", [...(values?.urlFileMessages || []), audioUrl]);
      }
    },
    [recordIndex, values.fileNames, values.urlFileMessages, setFieldValue]
  );

  /**
   * Closes the modal by resetting the record index, clearing the list of messages, and triggering the onClose callback.
   */
  const handleClose = useCallback(() => {
    setRecordIndex(-1);
    setListMessage([]);

    onClose();
  }, [onClose]);

  /**
   * Fetches and processes initial data for an order trip, including trip statuses and messages.
   * @returns {Promise<void>} A Promise that resolves when the data is fetched and processed.
   */
  const getInitData = useCallback(async () => {
    const orderTrip = await getInitOrderTripMessage({ organizationId: orgId, id: orderTripId });

    if (orderTrip) {
      const listMsg: OrderTripMessage[] = [];

      // Handle data of trip statuses
      if (orderTrip.statuses) {
        // Set current order status
        if (orderTrip.order?.statuses && orderTrip.order.statuses.length > 0) {
          const statusInfo = getOrderStatusFlags(orderTrip.order);
          setCurrentOrderStatus(statusInfo.currentStatus?.type);
        }

        const latestStatus = "";
        for (const tripStatus of orderTrip.statuses) {
          // Find and set latest trip status
          if (
            !latestStatus ||
            (new Date(latestStatus).getTime() < new Date(ensureString(tripStatus.createdAt)).getTime() &&
              tripStatus.type)
          ) {
            setFieldValue("type", tripStatus.type);
          }

          // Update status notification
          if (tripStatus.driverReport?.name) {
            const orderTripMessage: OrderTripMessage = {
              message: tripStatus.driverReport.name,
              createdAt: tripStatus.createdAt,
              createdByUser: tripStatus.createdByUser,
              isSystem: true,
            };

            listMsg.push(orderTripMessage);

            // Update status notes
            if (tripStatus.notes && tripStatus.type !== OrderTripStatusType.COMPLETED) {
              const notes: OrderTripMessage = {
                message: tripStatus.notes,
                createdAt: tripStatus.createdAt,
                createdByUser: tripStatus.createdByUser,
                isSystem: false,
              };

              listMsg.push(notes);
            }
          }
        }
      }

      // Handle data of trip messages
      if (orderTrip.messages) {
        for (const tripMessage of orderTrip.messages) {
          const orderTripMessage: OrderTripMessage = {
            messageId: Number(tripMessage.id),
            message: ensureString(tripMessage.message),
            createdAt: tripMessage.createdAt,
            createdByUser: tripMessage.createdByUser,
            readByUsers: tripMessage.readByUsers,
            isSystem: false,
            attachments: tripMessage.attachments,
            latitude: tripMessage.latitude,
            longitude: tripMessage.longitude,
          };

          listMsg.push(orderTripMessage);
        }
      }

      // Sort by date
      const result = listMsg.sort((a: OrderTripMessage, b: OrderTripMessage) => {
        if (a.createdAt && b.createdAt) {
          const aDate = new Date(ensureString(a.createdAt));
          const bDate = new Date(ensureString(b.createdAt));

          return aDate.getTime() - bDate.getTime();
        }
        return 0;
      });

      lastInitMessageCreatedAt.current = result[result.length - 1].createdAt;
      lastNewMessageCreatedAt.current = result[result.length - 1].createdAt;
      setTripCode(orderTrip.code);
      setListMessage(result);
    }
  }, [orderTripId, orgId, setFieldValue]);

  /**
   * Get init list message
   */
  useEffect(() => {
    if (orderTripId) {
      getInitData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderTripId]);

  /**
   * Chat feature
   */
  const chatFeature = useMemo(
    () => (
      <div className="absolute inset-x-0 bottom-0 flex justify-between py-2 pl-3 pr-2">
        <div className="flex items-center space-x-5">
          {/* Input file */}
          <div className="flex items-center">
            <label
              htmlFor="fileSelector"
              className="cursor-pointer rounded-md bg-white text-gray-400  hover:bg-gray-50 hover:text-gray-600"
            >
              <PaperClipIcon className="h-5 w-5" aria-hidden="true" />
              <TextField
                id="fileSelector"
                type="file"
                accept={internalMessageOptions.fileTypes.join(",")}
                className="sr-only"
                onChange={handleUploadFileChange}
              />
            </label>
          </div>
          {/* Voice message */}
          <div className="_flex hidden items-center">
            <div className="-m-2.5 flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:text-gray-600">
              <VoiceRecord onRecord={handleStopRecord} />
            </div>
          </div>
        </div>
        <Button
          disabled={((values?.urlFileMessages || []).length === 0 && !values.message) || isSubmitting}
          type="submit"
          className="rounded-md bg-white px-[10px] py-[6px] text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <AiOutlineSend className="h-4 w-4 text-gray-900" aria-hidden="true" />
        </Button>
      </div>
    ),
    [handleStopRecord, handleUploadFileChange, isSubmitting, values.message, values?.urlFileMessages]
  );

  /**
   * Handle get more message when scroll to top
   */
  const handleScrollMoreData = useCallback(async () => {
    if (!open) {
      return;
    }

    const newData = await getOrderTripMessageWithPage(
      { organizationId: orgId, id: orderTripId },
      page + 1,
      lastInitMessageCreatedAt?.current as Date
    );

    if (newData?.messages && newData.messages.length > 0) {
      setPage((prev) => prev + 1);

      handleLoadMessage(newData);
    }
  }, [handleLoadMessage, open, orderTripId, orgId, page]);

  useEffect(() => {
    if (!open) {
      setPage(1);
    }
  }, [open]);

  /**
   * Handles key up events in a text area or input element.
   * @param {KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>} event - The key up event.
   */
  const handleKeyDownCapture = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (event.key === "Enter") {
        if (event.shiftKey) {
          return;
        }

        event.preventDefault();
        handleSubmit();
      } else if (event.key === "Escape") {
        handleClose();
      }
    },
    [handleClose, handleSubmit]
  );

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full sm:pl-16">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen md:max-w-screen-md">
                  <div className="flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
                    <div className="flex flex-col border-b bg-gray-50 px-6 py-4">
                      <div className="flex items-start justify-between space-x-3">
                        <div className="space-y-1">
                          <Dialog.Title className="text-base font-semibold leading-6 text-gray-900">
                            {t("order.trip.message_modal.title")}
                            <span className="ml-2 text-sm text-gray-400">
                              {t("order.trip.message_modal.trip_code", { tripCode })}
                            </span>
                            <CopyToClipboard value={ensureString(tripCode)} />
                          </Dialog.Title>
                        </div>
                        <div className="flex h-7 items-center">
                          <button
                            type="button"
                            className="relative text-gray-400 hover:text-gray-500"
                            onClick={handleClose}
                          >
                            <span className="absolute -inset-2.5" />
                            <span className="sr-only">Close panel</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Message list */}
                    <MessageList
                      data={listMessage}
                      open={listMessage.length > 0 ? open : false}
                      onScrollNew={handleScrollMoreData}
                      onReload={getInitData}
                    />

                    {/* Action buttons */}
                    <Authorization resource="order-trip-message" action="new">
                      <form className="w-full" onSubmit={handleSubmit}>
                        <div
                          className={clsx("flex w-full gap-x-3 overflow-auto px-4 py-0", {
                            "pt-4": values.urlFileMessages && values.urlFileMessages.length > 0,
                          })}
                        >
                          {(values?.urlFileMessages || []).map((item, index) => {
                            const isRecord =
                              (values?.fileNames || [])[index].endsWith(".mp3") ||
                              (values?.fileNames || [])[index].endsWith(".webm");
                            const fileExtension = getFileExtension((values?.fileNames || [])[index]);

                            return (
                              <>
                                <div className={clsx("relative max-w-fit", { "h-24 w-24": !isRecord })} key={index}>
                                  <span
                                    className={clsx(
                                      "absolute right-0 top-0 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-white bg-gray-500 text-white",
                                      { "-right-8": isRecord }
                                    )}
                                    onClick={handleRemoveFile(index)}
                                  >
                                    -
                                  </span>
                                  {isRecord ? (
                                    <VoiceMessage src={item} />
                                  ) : ALLOWED_PREVIEW_EXTENSIONS.includes(fileExtension) ? (
                                    <div className="h-24 w-24">
                                      <img
                                        src={item}
                                        className="rounded-4 h-24 w-24 rounded-lg border border-gray-300 object-cover"
                                        alt=""
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex h-24 w-24 flex-col items-center justify-between rounded-lg border border-gray-300 p-2 hover:bg-gray-50 group-hover:bg-gray-50">
                                      <PiFileTextThinIcon className="h-14 w-14 text-gray-300" aria-hidden="true" />
                                      <p className="break-all text-sm font-semibold text-gray-500">
                                        {fileExtension.slice(1).toUpperCase()}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </>
                            );
                          })}
                        </div>
                        {currentOrderStatus !== OrderStatusType.CANCELED && (
                          <div className="flex w-full gap-x-3 p-4">
                            <Avatar size="small" avatarURL={accountInfo.avatar} displayName={accountInfo.displayName} />
                            <TextField
                              rows={3}
                              multiline
                              name="message"
                              id="message"
                              value={ensureString(values.message)}
                              placeholder={t("order.trip.message_modal.message_place_holder")}
                              onChange={handleChange}
                              toolbarComponent={chatFeature}
                              onKeyDownCapture={handleKeyDownCapture}
                              className="w-full"
                              resize={false}
                              disabled={isSubmitting}
                              maxLength={500}
                            />
                          </div>
                        )}
                      </form>
                    </Authorization>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default MessageModal;
