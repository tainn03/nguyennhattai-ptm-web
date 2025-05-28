"use client";

import { Dialog } from "@headlessui/react";
import { ShareIcon } from "@heroicons/react/24/outline";
import { ShareObjectType } from "@prisma/client";
import add from "date-fns/add";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { createToken } from "@/actions/app-actions";
import { Checkbox, DescriptionProperty2, Link, ModalActions, ModalContent } from "@/components/atoms";
import { Authorization, Button, CopyToClipboard, DatePicker, Modal } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { NEXT_PUBLIC_ORDER_SHARE_URL } from "@/configs/environment";
import { useAuth, useShareObject } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { cancelShareObject, createShareObject } from "@/services/client/shareObject";
import { ShareObjectToken } from "@/types/share";
import { OrderTripInfo } from "@/types/strapi";
import { endOfDay, formatDate } from "@/utils/date";

type OrderShareTripModalProps = {
  open: boolean;
  orderTrip?: Partial<OrderTripInfo> | null;
  onClose: () => void;
  onCancel: () => void;
};

const OrderShareTripModal = ({ open, orderTrip, onClose, onCancel }: OrderShareTripModalProps) => {
  const t = useTranslations();
  const { orgId, userId } = useAuth();
  const { showNotification } = useNotification();

  const [isShareObjectCreating, setIsShareObjectCreating] = useState<boolean>(false);
  const [openConfirm, setOpenConfirm] = useState<boolean>(false);
  const [isShareMap, setIsShareMap] = useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [expireDate, setExpireDate] = useState<Date | null>(null);

  const orderTripId = open && orderTrip?.id ? Number(orderTrip.id) : undefined;
  const { shareObject, isLoading, mutate } = useShareObject({ id: orderTripId });

  // useEffect hook that sets the expiration date to 7 days from the current date
  useEffect(() => {
    if (!shareObject) {
      const sevenDaysFromNow = add(new Date(), { days: 7 });
      setExpireDate(sevenDaysFromNow);
    }
  }, [shareObject]);

  // useEffect hook that runs whenever `orderShare` changes.
  useEffect(() => {
    if (shareObject) {
      const token = encodeURIComponent(shareObject.token);
      const url = `${NEXT_PUBLIC_ORDER_SHARE_URL}/${token}`;
      setCurrentUrl(url);
      if (shareObject.expirationDate) {
        setExpireDate(new Date(shareObject.expirationDate));
      }
    } else {
      setCurrentUrl(null);
    }
  }, [shareObject]);

  /**
   * Callback function to handle stopping the sharing of an orderTrip.
   */
  const handleCheckIsShareMap = useCallback(() => {
    setIsShareMap((prevValue) => !prevValue);
  }, []);

  /**
   * handleConfirm is a callback function that generates an orderTrip share token and updates the UI.
   *
   * @remarks
   * This function uses the `useCallback` hook to memoize the function instance and optimize performance.
   *
   * @returns {Promise<void>} - A promise that resolves when the token generation process is complete.
   */
  const handleConfirm = useCallback(async () => {
    if (!orgId || !userId || !orderTripId || !orderTrip?.code) {
      return;
    }
    setIsShareObjectCreating(true);

    // Create token
    const tokenData: ShareObjectToken = {
      type: ShareObjectType.TRIP,
      orgId: orgId,
      tripCode: orderTrip.code,
      timestamp: Date.now(),
    };
    const expirationDate = expireDate ? endOfDay(expireDate) : null;
    if (expirationDate) {
      tokenData.exp = expirationDate.toISOString();
    }
    const token = await createToken(tokenData);

    // Create share object
    const { error } = await createShareObject({
      organizationId: orgId,
      type: ShareObjectType.TRIP,
      targetId: orderTripId,
      token,
      expirationDate,
      meta: JSON.stringify({
        map: isShareMap,
      }),
      createdById: userId,
    });

    setIsShareObjectCreating(false);
    if (error) {
      showNotification({
        color: "error",
        title: t("order.share_modal.message.notification"),
        message: t("order.share_modal.message.generate_token_failed"),
      });
      return;
    }

    await mutate();
    showNotification({
      color: "success",
      title: t("order.share_modal.message.notification"),
      message: t("order.share_modal.message.generate_token_success"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, userId, orderTripId, orderTrip?.code, expireDate, t, isShareMap]);

  /**
   * Callback function to handle changes in a date picker component.
   *
   * @param date - The selected date from the date picker, can be a Date object or null.
   */
  const onChangeDatePicker = useCallback((date: Date | null) => {
    setExpireDate(date);
  }, []);

  const handleConfirmStopSharing = useCallback(() => {
    setOpenConfirm(true);
  }, []);

  const handleCloseConfirmStopSharing = useCallback(() => {
    setOpenConfirm(false);
  }, []);

  /**
   * Callback function to handle stopping the sharing of an orderTrip.
   */
  const handleStopSharing = useCallback(async () => {
    if (!orderTrip || !shareObject || !userId) return;
    setIsShareObjectCreating(true);
    try {
      setOpenConfirm(false);
      await cancelShareObject(shareObject?.id, userId);
      await mutate();
      setIsShareObjectCreating(false);
      showNotification({
        color: "success",
        title: t("order.share_modal.message.notification"),
        message: t("order.share_modal.message.stop_sharing_success"),
      });
    } catch (error) {
      showNotification({
        color: "error",
        title: t("order.share_modal.message.notification"),
        message: t("order.share_modal.message.stop_sharing_failed"),
      });
    }
  }, [orderTrip, shareObject, userId, showNotification, t, mutate]);

  return (
    <Modal open={open} divider={false} className="sm:!max-w-lg" onDismiss={onClose} allowOverflow>
      <ModalContent className="pb-0 pt-0 text-center">
        <div className="text-center">
          <div className="primary mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <ShareIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>

          <div className="mt-3 text-center sm:mt-5">
            <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
              {t("order.share_modal.title_trip")}
            </Dialog.Title>
          </div>

          {currentUrl && shareObject && (
            <label className="mt-2 block text-sm font-medium leading-6 text-gray-500">
              {t.rich("order.share_modal.message.shared_trip_by", {
                strong: (chunks) => <strong>{chunks}</strong>,
                date: formatDate(shareObject.createdAt, t("common.format.datetime")),
                name: `${shareObject.createdByUser?.detail?.lastName} ${shareObject.createdByUser?.detail?.firstName}`,
                code: orderTrip?.code,
                br: () => <br />,
              })}
            </label>
          )}

          {!shareObject && !currentUrl && !isLoading && (
            <>
              <div className="mt-2">
                <p className="text-sm tracking-tight text-gray-500">
                  {t.rich("order.share_modal.message.order_trip_code", {
                    strong: (chunks) => <strong>{chunks}</strong>,
                    code: orderTrip?.code,
                  })}
                </p>
              </div>
              <div className="mt-2">
                <p className="text-sm tracking-tight text-gray-500">
                  {t.rich("order.share_modal.message.question", {
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
              </div>
              <div className="mt-6 sm:col-span-3 sm:col-start-1">
                <div className="mt-2 flex items-center justify-center">
                  <label htmlFor="expireDate" className="mr-3 block text-sm font-medium leading-6 text-gray-900">
                    {t("order.share_modal.message.expire_date")}
                  </label>
                  {!shareObject && (
                    <DatePicker
                      name="expireDate"
                      disabled={!!currentUrl || isShareObjectCreating}
                      className="w-36"
                      allowInput
                      selected={expireDate}
                      minDate={new Date()}
                      onChange={onChangeDatePicker}
                    />
                  )}
                </div>
                <label className="block text-xs italic leading-6 text-gray-500">
                  {t("order.share_modal.message.expire_date_hint")}
                </label>
                <div className="mt-2 flex w-full items-center justify-center">
                  <Checkbox
                    label={t("order.share_modal.button.share_map")}
                    checked={isShareMap}
                    disabled={isShareObjectCreating}
                    onClick={handleCheckIsShareMap}
                  />
                </div>
              </div>
            </>
          )}
          {isLoading && (
            // Skeleton
            <div className="mt-3 flex flex-col items-center justify-center">
              <div className="mx-5 w-full animate-pulse">
                <div className="mb-2 h-3.5 w-full rounded-full bg-gray-200 dark:bg-gray-300" />
              </div>
              <div className="mx-5 w-80 animate-pulse">
                <div className="mb-2 h-3.5 w-full rounded-full bg-gray-200 dark:bg-gray-300" />
              </div>
              <div className="mx-5 w-32 animate-pulse">
                <div className="mb-2 h-3.5 w-full rounded-full bg-gray-200 dark:bg-gray-300" />
              </div>
            </div>
          )}

          {currentUrl && (
            <>
              <div className="mt-2 flex flex-row">
                <Link target="_blank" useDefaultStyle href={currentUrl} className="flex-1 truncate">
                  {currentUrl}
                </Link>
                <CopyToClipboard value={currentUrl} className="ml-2 h-5 min-w-[5.5rem]" isLink />
              </div>
              {!!shareObject?.expirationDate && (
                <div className="mt-2 flex items-center justify-center">
                  <DescriptionProperty2 label={t("order.share_modal.message.expire_date")}>
                    {formatDate(shareObject.expirationDate, t("common.format.date"))}
                  </DescriptionProperty2>
                </div>
              )}
            </>
          )}
        </div>
      </ModalContent>
      <ModalActions className="pb-4 pt-0 sm:pb-6">
        <Button
          variant="outlined"
          color="secondary"
          className="min-w-[120px] flex-1"
          disabled={isShareObjectCreating}
          onClick={onCancel}
        >
          {currentUrl ? t("order.share_modal.button.close") : t("common.cancel")}
        </Button>
        {!currentUrl && (
          <Button
            color="primary"
            disabled={isLoading}
            className="min-w-[120px] flex-1"
            loading={isLoading || isShareObjectCreating}
            onClick={handleConfirm}
          >
            {t("order.share_modal.button.share")}
          </Button>
        )}
        {shareObject && (
          <Authorization resource="order-trip" action="cancel-share">
            <Button
              color="error"
              className="min-w-[120px] flex-1"
              onClick={handleConfirmStopSharing}
              loading={isShareObjectCreating}
            >
              {t("order.share_modal.button.cancel_share")}
            </Button>
          </Authorization>
        )}
        {shareObject && (
          <ConfirmModal
            icon="question"
            color="error"
            open={openConfirm}
            title={t("order.share_modal.message.confirm_title")}
            message={t("order.share_modal.message.confirm_stop_sharing_trip")}
            onClose={handleCloseConfirmStopSharing}
            onCancel={handleCloseConfirmStopSharing}
            onConfirm={handleStopSharing}
          />
        )}
      </ModalActions>
    </Modal>
  );
};

export default OrderShareTripModal;
