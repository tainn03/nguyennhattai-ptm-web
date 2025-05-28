"use client";

import { CreditCardIcon, ShareIcon, TrashIcon, TruckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { OrderParticipantRole } from "@prisma/client";
import { useAtom } from "jotai";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter as useNextIntlRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PiPackage as PiPackageIcon } from "react-icons/pi";
import { mutate } from "swr";

import { TabPanel, Visible, VisibleWithSetting } from "@/components/atoms";
import { Authorization, Button, CopyToClipboard, PageHeader, Tabs } from "@/components/molecules";
import { TabItem } from "@/components/molecules/Tabs/Tabs";
import { ConfirmModal, DeleteOrderModal, OrderShareModal } from "@/components/organisms";
import { OrderTab } from "@/constants/order";
import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { useOrgSettingExtendedStorage, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { receiveOrder } from "@/services/client/orderTrip";
import { orderGroupAtom } from "@/states";
import { BreadcrumbItem, ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { OrderInfo } from "@/types/strapi";
import { put } from "@/utils/api";
import { OrgPageProps, withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";
import { getOrderStatusFlags } from "@/utils/order";
import { ensureString, isFalse } from "@/utils/string";

import { DispatchVehicleTab, OrderDetailTab, OrderExpenseTab, OrderProcess } from "./components";

export default withOrg(({ orgId, orgLink, user, userId }: OrgPageProps) => {
  const t = useTranslations();
  const router = useRouter();
  const nextIntlRouter = useNextIntlRouter();
  const pathname = usePathname();
  const { code } = useParams();
  const searchParams = useSearchParams();
  const { setBreadcrumb } = useBreadcrumb();
  const { searchQueryString, order } = useOrderState();
  const [{ baseSearchQueryString }] = useAtom(orderGroupAtom);

  const { showNotification } = useNotification();
  const { canCancel, canDelete, canDeleteOwn, canEdit, canEditOwn, canDetail } = usePermission("order");
  const { canFind: canFindOrderTrip } = usePermission("order-trip");
  const { canFind: canFindOrderTripExpense } = usePermission("order-trip-expense");
  const { orderConsolidationEnabled } = useOrgSettingExtendedStorage();

  const [orderDetailTab, setOrderDetailTab] = useState<TabItem[]>([
    { label: t("order.details.tab_info"), value: OrderTab.INFORMATION, icon: PiPackageIcon },
  ]);

  const [selectedOrderTab, setSelectedOrderTab] = useState(orderDetailTab[0].value);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReceivingConfirmOpen, setIsReceivingConfirmOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const [isShareConfirmOpen, setIsShareConfirmOpen] = useState(false);

  const selectedCodeRef = useRef<OrderInfo>();

  const orderTab = useMemo(
    () => [
      { label: t("order.details.tab_info"), value: OrderTab.INFORMATION, icon: PiPackageIcon },
      { label: t("order.details.tab_dispatch"), value: OrderTab.DISPATCH_VEHICLE, icon: TruckIcon },
      { label: t("order.details.tab_expense"), value: OrderTab.EXPENSES, icon: CreditCardIcon },
    ],
    [t]
  );

  const participant = useMemo(
    () => (({ ...order })?.participants || [])?.find((item) => equalId(item.user?.id, userId)),
    [order, userId]
  );

  const isEditor = useMemo(
    () =>
      Boolean(
        participant &&
          (participant.role === OrderParticipantRole.EDITOR || participant.role === OrderParticipantRole.OWNER)
      ),
    [participant]
  );

  const isView = useMemo(() => {
    return Boolean(participant && participant.role === OrderParticipantRole.VIEWER);
  }, [participant]);

  useEffect(() => {
    const shouldShowDetailTab = canDetail() || isEditor || isView;
    const shouldShowDispatchTab = canFindOrderTrip() && shouldShowDetailTab;
    const shouldShowExpensesTab = canFindOrderTripExpense();

    const defaultTabs = [];

    if (shouldShowDetailTab) {
      defaultTabs.push({ label: t("order.details.tab_info"), value: OrderTab.INFORMATION, icon: PiPackageIcon });
    }

    if (shouldShowDispatchTab && isFalse(orderConsolidationEnabled)) {
      defaultTabs.push({ label: t("order.details.tab_dispatch"), value: OrderTab.DISPATCH_VEHICLE, icon: TruckIcon });
    }

    if (shouldShowExpensesTab) {
      defaultTabs.push({ label: t("order.details.tab_expense"), value: OrderTab.EXPENSES, icon: CreditCardIcon });
    }

    setOrderDetailTab(defaultTabs);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDetail, canFindOrderTrip, canFindOrderTripExpense, isEditor, isView]);

  useEffect(() => {
    const paramsNew = new URLSearchParams(searchParams);
    paramsNew.delete("tab");
    if (paramsNew.size > 0) {
      router.replace(`${pathname}?${paramsNew}&tab=${selectedOrderTab}`);
    } else {
      router.replace(`${pathname}?tab=${selectedOrderTab}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderTab]);

  const redirectLink = useMemo(() => {
    if (order && order.isDraft) {
      return `${orgLink}/orders/new?orderId=${order.code}`;
    }
    return null;
  }, [order, orgLink]);

  useEffect(() => {
    if (!redirectLink) {
      return;
    }

    router.push(redirectLink);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectLink]);

  /**
   * Select tab when load page with url "tab" param
   */
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && (tab === OrderTab.INFORMATION || tab === OrderTab.DISPATCH_VEHICLE)) {
      setSelectedOrderTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const payload: BreadcrumbItem[] = [
      { name: t("order.management"), link: orgLink },
      ...(isFalse(orderConsolidationEnabled)
        ? [{ name: t("order.title"), link: `${orgLink}/orders${searchQueryString}` }]
        : [{ name: t("order.title"), link: `${orgLink}/order-groups/base${baseSearchQueryString}` }]),
      {
        name: ensureString(code),
        link: `${orgLink}/orders/${code}?tab=${OrderTab.INFORMATION}`,
      },
    ];
    if (selectedOrderTab === OrderTab.DISPATCH_VEHICLE && isFalse(orderConsolidationEnabled)) {
      payload.push({
        name: t("order.vehicle_dispatch.title"),
        link: `${orgLink}/orders/${code}?tab=${OrderTab.DISPATCH_VEHICLE}`,
      });
    }

    if (selectedOrderTab === OrderTab.EXPENSES) {
      payload.push({
        name: t("order.details.tab_expense"),
        link: `${orgLink}/orders/${code}?tab=${OrderTab.EXPENSES}`,
      });
    }

    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, orgLink, searchQueryString, selectedOrderTab]);

  const { isNew, isCompleted, isCanceled } = useMemo(() => getOrderStatusFlags({ ...order }), [order]);

  /**
   * Callback function for opening a dialog.
   *
   * @param order The order to be deleted.
   */
  const handleOpenDeleteModal = useCallback(() => {
    if (order) {
      selectedCodeRef.current = order as OrderInfo;
      setIsDeleteModalOpen(true);
    }
  }, [order]);

  /**
   * Callback function for canceling and closing a dialog.
   */
  const handleCloseDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  /**
   * Handles the confirmation of deletion.
   * Sends a delete request, and displays a notification based on the result.
   */
  const handleConfirmDelete = useCallback(
    async (order: OrderInfo) => {
      if (order.code === selectedCodeRef.current?.code && !isCompleted) {
        const result = await put<ApiResult<OrderInfo>>(`/api${orgLink}/orders/${order.code}/delete`, {
          order: {
            id: Number(selectedCodeRef.current.id),
            code: order.code,
            updatedByUser: user,
            trips: order.trips,
          },
          lastUpdatedAt: selectedCodeRef.current.updatedAt,
        });

        if (result.status !== HttpStatusCode.Ok) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: selectedCodeRef.current?.code,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedCodeRef.current?.code,
            }),
          });
        }
        setIsDeleteModalOpen(false);
        nextIntlRouter.push(`${orgLink}/orders`);
      } else {
        showNotification({
          color: "error",
          message: t("order.details.not_matched_message"),
        });
      }
    },
    [isCompleted, orgLink, user, nextIntlRouter, showNotification, t]
  );

  /**
   * Toggle the state of the receiving order confirmation dialog.
   */
  const handleToggleReceivingOrder = useCallback(() => {
    setIsReceivingConfirmOpen((prev) => !prev);
  }, []);

  /**
   * Handles the confirmation of an update status action for an order.
   */
  const handleConfirmReceivingOrder = useCallback(async () => {
    if (!order || !isNew) {
      return;
    }
    setIsConfirmLoading(true);
    const result = await receiveOrder(orgLink, {
      order: {
        id: Number(order.id),
        code: ensureString(order.code),
        deliveryDate: order.deliveryDate!,
        updatedByUser: user,
      },
      lastUpdatedAt: order?.updatedAt,
    });

    setIsConfirmLoading(false);
    if (result.status !== HttpStatusCode.Ok) {
      // Handle different error types
      let message = "";
      switch (result.message) {
        case ErrorType.EXCLUSIVE:
          message = t("common.message.save_error_exclusive", { name: order.code });
          break;
        case ErrorType.UNKNOWN:
          message = t("common.message.save_error_unknown", { name: order.code });
          break;
        default:
          break;
      }

      // Show an error notification
      showNotification({
        color: "error",
        title: t("order.receive_error_title"),
        message,
      });
    } else {
      // Show a success notification and navigate to the maintenance types page
      showNotification({
        color: "success",
        title: t("order.receive_success_title"),
        message: t("order.receive_success_message", { name: order.code }),
      });
      setIsReceivingConfirmOpen(false);
      mutate([`orders/${code}`, { organizationId: orgId, code }]);
      mutate(["orders-statuses", { organizationId: orgId, code }]);
      mutate([`order-dispatch-vehicle-info/${code}`, { organizationId: orgId, code }]);
    }
  }, [order, isNew, orgLink, user, showNotification, t, code, orgId]);

  /**
   * Callback function for opening a dialog with maintenances data.
   * @param item - The maintenances data to display in the dialog.
   */
  const handleOpenCancelOrder = useCallback(() => {
    setIsCancelConfirmOpen(true);
  }, []);

  /**
   * Callback function for canceling and closing a dialog.
   */
  const handleCloseCancelOrder = useCallback(() => {
    setIsCancelConfirmOpen(false);
  }, []);

  /**
   * Callback function for setting open modal share dialog.
   */
  const handleOpenShareOrder = useCallback(() => {
    setIsShareConfirmOpen(true);
  }, []);

  /**
   * Callback function for setting close modal share dialog.
   */
  const handleCloseShareOrder = useCallback(() => {
    setIsShareConfirmOpen(false);
  }, []);

  /**
   * Handles the confirmation of an update status action for an order.
   */
  const handleConfirmCancelOrder = useCallback(async () => {
    if (!order || isCompleted) {
      return;
    }

    setIsConfirmLoading(true);
    const result = await put<ApiResult<OrderInfo>>(`/api${orgLink}/orders/${order.code}/cancel`, {
      order: {
        id: Number(order.id),
        code: order.code,
        updatedByUser: user,
        trips: order.trips,
      },
      lastUpdatedAt: order.updatedAt,
    });

    setIsConfirmLoading(false);
    if (result.status !== HttpStatusCode.Ok) {
      // Handle different error types
      let message = "";
      switch (result.message) {
        case ErrorType.EXCLUSIVE:
          message = t("common.message.save_error_exclusive", { name: order.code });
          break;
        case ErrorType.UNKNOWN:
          message = t("common.message.save_error_unknown", { name: order.code });
          break;
        default:
          break;
      }

      // Show an error notification
      showNotification({
        color: "error",
        title: t("order.cancel_error_title"),
        message,
      });
    } else {
      // Show a success notification and navigate to the maintenance types page
      showNotification({
        color: "success",
        title: t("order.cancel_success_title"),
        message: t("order.cancel_success_message", { orderCode: order?.code }),
      });
      setIsCancelConfirmOpen(false);
      mutate([`orders/${code}`, { organizationId: orgId, code }]);
      mutate(["orders-statuses", { organizationId: orgId, code }]);
      mutate([`order-dispatch-vehicle-info/${code}`, { organizationId: orgId, code }]);
    }
  }, [order, isCompleted, orgLink, user, showNotification, t, code, orgId]);

  return (
    <>
      <PageHeader
        title={
          <>
            {t("order.details.header_title")} <span className="italic">{code}</span>
            <CopyToClipboard value={ensureString(code)} className="ml-3 h-5 w-5" />
          </>
        }
        className="sm:border-b-0"
        actionHorizontal
        actionComponent={
          <div className="flex flex-nowrap gap-x-2">
            <VisibleWithSetting settingKey={OrganizationSettingExtendedKey.ORDER_CONSOLIDATION_ENABLED} expect={false}>
              <Visible
                when={isNew && (canEdit() || (canEditOwn() && equalId(order?.createdByUser?.id, user.id)) || isEditor)}
              >
                <Button onClick={handleToggleReceivingOrder}>{t("order.details.receiving_order")}</Button>
              </Visible>
            </VisibleWithSetting>

            {!isCanceled && !order?.isDraft && (
              <Authorization resource="order" action="share">
                <Button color="primary" disabled={!order?.code} icon={ShareIcon} onClick={handleOpenShareOrder}>
                  {t("common.share")}
                </Button>
              </Authorization>
            )}

            {!isCanceled && (
              <Authorization resource="order" action="cancel" alwaysAuthorized={canCancel()}>
                <Button
                  color="secondary"
                  icon={XMarkIcon}
                  disabled={isCompleted || !order?.code}
                  onClick={handleOpenCancelOrder}
                >
                  {t("order.details.cancel_order")}
                </Button>
              </Authorization>
            )}

            <Authorization
              resource="order"
              action="delete"
              alwaysAuthorized={canDelete() || (canDeleteOwn() && equalId(order?.createdByUser?.id, userId))}
            >
              <Button
                color="error"
                icon={TrashIcon}
                disabled={isCompleted || !order?.code}
                onClick={handleOpenDeleteModal}
              >
                {t("order.details.delete_order")}
              </Button>
            </Authorization>
          </div>
        }
      />

      <OrderProcess code={ensureString(code)} orgId={orgId} />
      <Tabs
        items={orderDetailTab}
        selectedTab={selectedOrderTab}
        onTabChange={setSelectedOrderTab}
        className="mb-6 sm:mb-10"
      />

      <TabPanel item={orderTab[0]} selectedTab={selectedOrderTab}>
        <OrderDetailTab selectedTab={selectedOrderTab} />
      </TabPanel>

      <VisibleWithSetting settingKey={OrganizationSettingExtendedKey.ORDER_CONSOLIDATION_ENABLED} expect={false}>
        <TabPanel item={orderTab[1]} selectedTab={selectedOrderTab}>
          <DispatchVehicleTab selectedTab={selectedOrderTab} />
        </TabPanel>
      </VisibleWithSetting>

      <TabPanel item={orderTab[orderTab.length - 1]} selectedTab={selectedOrderTab}>
        <OrderExpenseTab />
      </TabPanel>

      {/* Delete order modal */}
      <DeleteOrderModal
        open={isDeleteModalOpen}
        order={selectedCodeRef.current as OrderInfo}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />

      {/* Receive confirm modal */}
      <ConfirmModal
        open={isReceivingConfirmOpen}
        loading={isConfirmLoading}
        icon="question"
        title={t("order.details.confirm_receive_title")}
        message={t("order.details.confirm_receive_message")}
        onClose={handleToggleReceivingOrder}
        onCancel={handleToggleReceivingOrder}
        onConfirm={handleConfirmReceivingOrder}
      />

      {/* Cancel confirm modal */}
      <ConfirmModal
        open={isCancelConfirmOpen}
        loading={isConfirmLoading}
        icon="question"
        title={t("order.details.confirm_cancel_title")}
        message={t("order.details.confirm_cancel_message")}
        onClose={handleCloseCancelOrder}
        onCancel={handleCloseCancelOrder}
        onConfirm={handleConfirmCancelOrder}
      />

      {/* Order share modal */}
      {order && isShareConfirmOpen && (
        <OrderShareModal
          order={order}
          open={isShareConfirmOpen}
          onClose={handleCloseShareOrder}
          onCancel={handleCloseShareOrder}
        />
      )}
    </>
  );
});
