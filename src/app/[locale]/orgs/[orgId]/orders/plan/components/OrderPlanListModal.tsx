"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { CustomerType, OrderParticipantRole } from "@prisma/client";
import moment from "moment";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyedMutator } from "swr";

import {
  Badge,
  InfoBox,
  Link,
  ModalContent,
  ModalHeader,
  NumberLabel,
  SkeletonTableRow,
  Switcher,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Authorization, Button, EmptyListSection, Modal, OrderMenu } from "@/components/molecules";
import { OrderStepItem, orderSteps } from "@/components/molecules/OrderGridItem/OrderGridItem";
import {
  ConfirmModal,
  DeleteOrderModal,
  OrderShareModal,
  Pagination,
  RoutePointInfoModal,
} from "@/components/organisms";
import {
  NAM_PHONG_BILL_NO_FIELD_ID,
  NAM_PHONG_CONT_NO_FIELD_ID,
  NAM_PHONG_ORGANIZATION_ID,
} from "@/constants/organization";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useAuth, useIdParam, useOrdersByDate, usePermission } from "@/hooks";
import { useDispatch, useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { ORDER_UPDATE_NEW_ORDER_DATE } from "@/redux/types";
import { AnyObject, ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { Pagination as PaginationType } from "@/types/graphql";
import { OrderInfo, OrderStatusInfo } from "@/types/strapi";
import { put } from "@/utils/api";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";

import OrderTripStatusModal from "./OrderTripStatusModal";

type OrderPlanListModalProps = {
  open: boolean;
  orderDate?: Date;
  onClose?: () => void;
  onNewOrderClick?: (date: Date) => void;
  mutateOrderInCalendar: KeyedMutator<OrderInfo[]>;
  isDispatcher: boolean;
  openVehicleDispatchModal?: (orderCode: string) => () => void;
};

const OrderPlanListModal = ({
  orderDate,
  open: isShowMore,
  isDispatcher,
  onClose,
  onNewOrderClick,
  mutateOrderInCalendar,
  openVehicleDispatchModal,
}: OrderPlanListModalProps) => {
  const t = useTranslations();
  const dispatch = useDispatch();
  const { orgId, orgLink, user, userId } = useAuth();
  const { newOrderDate } = useOrderState();
  const { encryptId } = useIdParam();
  const { showNotification } = useNotification();
  const { canNew, canDetail, canDelete, canDeleteOwn } = usePermission("order");

  const [isOrderTripStatusModalOpen, setIsOrderTripStatusModalOpen] = useState(false);
  const [orderData, setOderData] = useState<Partial<OrderInfo> | null>();

  const [code, setCode] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isShareConfirmOpen, setIsShareConfirmOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isManaged, setIsManaged] = useState(false);
  const [paginationOptions, setPaginationOptions] = useState<Partial<PaginationType>>({
    page: 1,
    pageSize: PAGE_SIZE_OPTIONS[0],
  });

  const selectedCodeRef = useRef<OrderInfo>();

  const { orders, pagination, isLoading, mutate } = useOrdersByDate({
    organizationId: orgId,
    orderDate,
    isDispatcher,
    userIdOwner: userId,
    ...paginationOptions,
    ...(isManaged && { isManaged: true, userId }),
  });

  useEffect(() => {
    if (newOrderDate) {
      dispatch({ type: ORDER_UPDATE_NEW_ORDER_DATE });
      mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newOrderDate, mutate]);

  /**
   * Get the status badge for an order.
   *
   * @param {OrderInfo} order - The order information.
   * @returns {Badge} The status badge.
   */
  const getOrderStatus = useCallback(
    (order: OrderInfo) => {
      if (order.isDraft) {
        return { color: "secondary", label: t("order.status.draft") } as OrderStepItem;
      }

      // Get current status
      const latestStatus = order?.statuses?.reduce((prev, current) => {
        return (prev as OrderStatusInfo).createdAt > (current as OrderStatusInfo).createdAt ? prev : current;
      });

      if (latestStatus.type === "CANCELED") {
        return { color: "error", label: t("order.status.canceled") } as OrderStepItem;
      }

      // Find and return OrderStepItem for <Badge/>
      const index = orderSteps.findIndex((item) => item.value === latestStatus?.type);
      if (index >= 0) {
        return orderSteps[index];
      }
      return null;
    },
    [t]
  );

  /**
   * Callback function to handle closing the modal.
   * Invokes the provided onClose function if available.
   */
  const handleModalClose = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  /**
   * Callback function to handle opening the modal.
   * Invokes the onNewOrderClick function with the order date or current date if available.
   */
  const handleModalOpen = useCallback(() => {
    onNewOrderClick && onNewOrderClick(orderDate || new Date());
  }, [onNewOrderClick, orderDate]);

  /**
   * Callback function for handling page changes.
   *
   * @param page - The new page number to be set in the pagination state.
   */
  const handlePageChange = useCallback((page: number) => {
    setPaginationOptions((prevValue) => ({ ...prevValue, page }));
  }, []);

  /**
   * Callback function for handling changes in the page size.
   *
   * @param pageSize - The new page size to be set in the pagination state.
   */
  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPaginationOptions((prevValue) => ({ ...prevValue, pageSize }));
  }, []);

  /**
   * Callback function for opening a dialog.
   *
   * @param order The order to be deleted.
   */
  const handleOpenDeleteModal = useCallback((order: OrderInfo) => {
    selectedCodeRef.current = order;
    setIsDeleteModalOpen(true);
  }, []);

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
      if (order.code === selectedCodeRef.current?.code) {
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
          mutate();
          mutateOrderInCalendar();
        }

        setIsDeleteModalOpen(false);
      } else {
        showNotification({
          color: "error",
          message: t("order_plan.message.order_code_mismatch"),
        });
      }
    },
    [mutate, mutateOrderInCalendar, orgLink, showNotification, t, user]
  );

  /**
   * Callback function return customer name or customer code according to customer type
   */
  const customerNameOrCodeFollowType = useCallback((order: OrderInfo) => {
    if (order.customer?.type === CustomerType.FIXED && order.customer?.code) {
      return order.customer?.code;
    }

    if (order.customer?.type === CustomerType.CASUAL && order.customer?.name) {
      return order.customer?.name;
    }

    return "";
  }, []);

  /**
   * Callback function for canceling and closing the order trip status modal.
   */
  const handleCloseOrderTripStatusModal = useCallback(() => {
    setIsOrderTripStatusModalOpen(false);
  }, []);

  /**
   * Callback function to open the order trip status modal for a specific order.
   *
   * @param {OrderInfo} order - The order for which the trip status modal is to be opened.
   */
  const handleOpenOrderTripStatusModal = useCallback(
    (order: OrderInfo) => () => {
      setIsOrderTripStatusModalOpen(true);
      setCode(order.code);
    },
    []
  );

  /**
   * Callback function for opening a dialog.
   *
   * @param order The order to be canceled.
   */
  const handleOpenCancelModal = useCallback((order: OrderInfo) => {
    selectedCodeRef.current = order;
    setIsCancelModalOpen(true);
  }, []);

  /**
   * Callback function for canceling and closing a dialog.
   */
  const handleCloseCancelModal = useCallback(() => {
    setIsCancelModalOpen(false);
  }, []);

  /**
   * Handle the confirmation of order cancellation.
   * This function is called with an optional OrderInfo object to confirm the cancellation of an order.
   * @param {OrderInfo} [_order] - The order to cancel. If not provided, the function will use the currently selected order.
   */
  const handleConfirmCancel = useCallback(async () => {
    setIsCancelling(true);
    const order = selectedCodeRef.current;
    let result: ApiResult<OrderInfo> | undefined;
    if (order) {
      result = await put<ApiResult<OrderInfo>>(`/api${orgLink}/orders/${order.code}/cancel`, {
        order: {
          id: Number(order.id),
          code: order.code,
          updatedByUser: user,
          trips: order.trips,
        },
        lastUpdatedAt: order.updatedAt,
      });
    }

    setIsCancelling(false);
    if (!result) {
      return;
    }

    if (result.status !== HttpStatusCode.Ok) {
      // Handle different error types
      let message = "";
      switch (result.message) {
        case ErrorType.EXCLUSIVE:
          message = t("common.message.save_error_exclusive", { name: order?.code });
          break;
        case ErrorType.UNKNOWN:
          message = t("common.message.save_error_unknown", { name: order?.code });
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
    }
    setIsCancelModalOpen(false);
    mutate();
  }, [mutate, orgLink, showNotification, t, user]);

  /**
   * Switch to get data under management or not
   */
  const handleSwitcherChange = useCallback(() => {
    setIsManaged((prev) => !prev);
  }, []);

  /**
   * Callback function for setting open modal share dialog.
   */
  const handleShare = useCallback((order: OrderInfo) => {
    setOderData(order);
    setIsShareConfirmOpen(true);
  }, []);

  /**
   * Callback function for setting close modal share dialog.
   */
  const handleCloseShareOrder = useCallback(() => {
    setOderData(null);
    setIsShareConfirmOpen(false);
  }, []);

  const isNamPhongOrg = useMemo(() => equalId(orgId, NAM_PHONG_ORGANIZATION_ID), [orgId]);

  return (
    <>
      <Modal
        size="6xl"
        open={isShowMore}
        className="[&_.btn-close]:mt-1"
        showCloseButton
        divider={false}
        onClose={handleModalClose}
      >
        <ModalHeader
          className="!justify-start [&>h3>span]:whitespace-pre-wrap sm:[&>h3>span]:whitespace-nowrap"
          title={t("order_plan.plan_list_modal.title", { date: moment(orderDate).format("DD/MM/YYYY") })}
          actionComponent={
            <div className="flex w-full flex-wrap justify-between gap-y-4 sm:flex-nowrap">
              <Switcher
                label={t("order_plan.show_under_management")}
                checked={isManaged}
                onChange={handleSwitcherChange}
              />
              <Authorization resource="order" action="new">
                <Button size="small" variant="outlined" className="mr-10" onClick={handleModalOpen}>
                  {t("common.new")}
                </Button>
              </Authorization>
            </div>
          }
          actionComponentClassName="w-full"
        />
        <ModalContent padding={false}>
          <TableContainer
            horizontalScroll
            verticalScroll
            stickyHeader
            autoHeight
            fullHeight
            className="!mt-0 [&>div>div>div]:rounded-none"
            variant="paper"
            footer={
              (pagination?.pageCount || 0) > 0 && (
                <Pagination
                  className="px-4"
                  showPageSizeOptions
                  page={pagination?.page}
                  total={pagination?.total}
                  pageSize={pagination?.pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              )
            }
          >
            <Table dense={!isLoading}>
              <TableHead uppercase>
                <TableRow>
                  <TableCell className="!pl-7">{t("order_plan.plan_list_modal.code")}</TableCell>
                  {isNamPhongOrg && (
                    <>
                      <TableCell>{t("order.nam_phong.bill_no")}</TableCell>
                      <TableCell>{t("order.nam_phong.cont_no")}</TableCell>
                    </>
                  )}
                  <TableCell>{t("order_plan.plan_list_modal.customer")}</TableCell>
                  <TableCell>{t("order_plan.plan_list_modal.route")}</TableCell>
                  <TableCell>{t("order_plan.plan_list_modal.quantity")}</TableCell>
                  <TableCell>{t("order_plan.plan_list_modal.status")}</TableCell>
                  {/* <TableCell>{t("order_plan.plan_list_modal.dispatcher")}</TableCell> */}
                  <TableCell className="relative w-10 min-w-[40px]">
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableCell>
                  <TableCell className="relative w-10 min-w-[40px]">
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Loading skeleton */}
                {isLoading && orders.length === 0 && <SkeletonTableRow rows={10} columns={isNamPhongOrg ? 9 : 7} />}

                {/* Empty data */}
                {!isLoading && orders.length === 0 && (
                  <TableRow hover={false} className="mx-auto max-w-lg">
                    <TableCell colSpan={isNamPhongOrg ? 9 : 7} className="px-6 lg:px-8">
                      <EmptyListSection
                        onClick={canNew() ? handleModalOpen : undefined}
                        description={canNew() ? undefined : t("common.empty_list")}
                      />
                    </TableCell>
                  </TableRow>
                )}

                {/* Order list */}
                {orders.length > 0 &&
                  orders.map((order, index) => {
                    const status = getOrderStatus(order);
                    // Check permissions
                    const participant = (order?.participants || [])?.find((item) => equalId(item.user?.id, userId));
                    let isEdit = false;
                    if (participant && participant.role === OrderParticipantRole.EDITOR) {
                      isEdit = true;
                    }
                    const customFields = isNamPhongOrg ? (order.meta as AnyObject)?.customFields : null;
                    const billNo = isNamPhongOrg
                      ? customFields?.find((item: AnyObject) => equalId(item.id, NAM_PHONG_BILL_NO_FIELD_ID))?.value
                      : null;
                    const contNo = isNamPhongOrg
                      ? customFields?.find((item: AnyObject) => equalId(item.id, NAM_PHONG_CONT_NO_FIELD_ID))?.value
                      : null;

                    return (
                      <TableRow key={index}>
                        <TableCell className="!pl-7">
                          <Authorization
                            resource="order"
                            action="detail"
                            alwaysAuthorized={isEdit}
                            fallbackComponent={
                              <span className="text-sm font-medium leading-6 text-gray-900">{order.code}</span>
                            }
                          >
                            <Link
                              useDefaultStyle
                              color="secondary"
                              className="flex cursor-pointer"
                              href={
                                order.isDraft
                                  ? `${orgLink}/orders/new?orderId=${order.code}`
                                  : `${orgLink}/orders/${order.code}`
                              }
                              emptyLabel={t("common.empty")}
                            >
                              {order.code}
                            </Link>
                          </Authorization>
                        </TableCell>

                        {isNamPhongOrg && (
                          <>
                            <TableCell>{billNo || t("common.empty")}</TableCell>
                            <TableCell>{contNo || t("common.empty")}</TableCell>
                          </>
                        )}

                        {/* Customer */}
                        <TableCell>
                          <Authorization
                            resource="customer"
                            action="detail"
                            fallbackComponent={
                              <InfoBox
                                label={customerNameOrCodeFollowType(order)}
                                subLabel={
                                  order.customer?.name && order.customer?.type === CustomerType.FIXED
                                    ? order.customer?.name
                                    : ""
                                }
                                emptyLabel={t("common.empty")}
                              />
                            }
                          >
                            <InfoBox
                              as={Link}
                              href={`${orgLink}/customers/${encryptId(order.customer?.id)}`}
                              label={customerNameOrCodeFollowType(order)}
                              subLabel={
                                order.customer?.name && order.customer?.type === CustomerType.FIXED
                                  ? order.customer?.name
                                  : ""
                              }
                              emptyLabel={t("common.empty")}
                            />
                          </Authorization>
                        </TableCell>

                        {/* Route */}
                        <TableCell>
                          <Authorization
                            resource="customer-route"
                            action="detail"
                            fallbackComponent={
                              <InfoBox
                                label={ensureString(order.route?.code)}
                                subLabel={ensureString(order.route?.name)}
                                emptyLabel={t("common.empty")}
                              />
                            }
                          >
                            <div className="flex items-center gap-1">
                              <InfoBox
                                as={Link}
                                href={`${orgLink}/customers/${encryptId(order.customer?.id)}/routes/${encryptId(
                                  order.route?.id
                                )}`}
                                label={ensureString(order.route?.code)}
                                subLabel={ensureString(order.route?.name)}
                                emptyLabel={
                                  order?.route?.type === "FIXED"
                                    ? t("order_plan.plan_list_modal.fixed")
                                    : t("order_plan.plan_list_modal.casual")
                                }
                              />
                              <RoutePointInfoModal orderId={order.id} />
                            </div>
                          </Authorization>
                        </TableCell>

                        {/* Weight */}
                        <TableCell>
                          <NumberLabel value={order.weight} unit={order.unit?.code} emptyLabel={t("common.empty")} />
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge color={status?.color} label={t(status?.label)} />
                        </TableCell>

                        {/* Dispatcher */}
                        {/* <TableCell className="flex -space-x-1">
                          <AvatarGroup useTooltip orderParticipants={order.participants} />
                        </TableCell> */}

                        {/* Trip list */}
                        <TableCell>
                          <Authorization resource="order-trip" action="find">
                            <Button
                              size="small"
                              variant="text"
                              className="ml-12 inline-flex h-8 w-8 items-center justify-center !rounded-full hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 "
                              onClick={handleOpenOrderTripStatusModal(order)}
                            >
                              <MagnifyingGlassIcon
                                className="h-6 w-6 text-gray-400 hover:text-gray-500 "
                                aria-hidden="true"
                              />
                            </Button>
                          </Authorization>
                        </TableCell>

                        {/* Action */}
                        <TableCell>
                          {(canNew() ||
                            canDetail() ||
                            canDelete() ||
                            (canDeleteOwn() && equalId(order.createdByUser.id, userId))) && (
                            <OrderMenu
                              actionPlacement={index < 3 ? "end" : index >= orders.length - 3 ? "start" : "center"}
                              order={order}
                              onCanceled={handleOpenCancelModal}
                              onDeleted={handleOpenDeleteModal}
                              onShare={handleShare}
                              isOnPlanOrder={true}
                              openVehicleDispatchModal={openVehicleDispatchModal}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </ModalContent>
      </Modal>

      {/* Delete order modal */}
      <DeleteOrderModal
        open={isDeleteModalOpen}
        order={selectedCodeRef.current as OrderInfo}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />

      {/* Cancel confirm modal */}
      <ConfirmModal
        open={isCancelModalOpen}
        loading={isCancelling}
        icon="question"
        title={t("order.details.confirm_cancel_title")}
        message={t("order.details.confirm_cancel_message")}
        onClose={handleCloseCancelModal}
        onCancel={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
      />

      {/* Order trip status modal */}
      <OrderTripStatusModal code={code} open={isOrderTripStatusModalOpen} onClose={handleCloseOrderTripStatusModal} />

      {/* Order share modal */}
      <OrderShareModal
        order={orderData}
        open={isShareConfirmOpen}
        onClose={handleCloseShareOrder}
        onCancel={handleCloseShareOrder}
      />
    </>
  );
};

export default OrderPlanListModal;
