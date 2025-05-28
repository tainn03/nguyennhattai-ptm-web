"use client";

import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { KeyedMutator } from "swr";

import {
  Card,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  Link,
  NumberLabel,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Visible,
} from "@/components/atoms";
import { Authorization, EmptyListSection } from "@/components/molecules";
import { ConfirmModal, NewOrderItemModal } from "@/components/organisms";
import { OrderItemInputForm } from "@/forms/orderItem";
import { useAuth, useOrgSettingExtendedStorage, usePermission } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { createOrderItem, deleteOrderItem, updateOrderItem } from "@/services/client/orderItem";
import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { OrderInfo, OrderItemInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { getOrderStatusFlags } from "@/utils/order";
import { isTrue } from "@/utils/string";

import { MerchandiseTypeModal } from ".";

type OrderItemCardProps = {
  loading: boolean;
  mutate: KeyedMutator<OrderInfo | undefined>;
  allowEdit: boolean;
  isEditor: boolean;
};

const OrderItemCard = ({ loading, allowEdit, mutate, isEditor }: OrderItemCardProps) => {
  const t = useTranslations();
  const { showNotification } = useNotification();
  const { orgId, userId } = useAuth();
  const { order } = useOrderState();
  const { canEditOwn } = usePermission("order");
  const { orderConsolidationEnabled } = useOrgSettingExtendedStorage();

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isNewOrderItemModalOpen, setIsNewOrderItemModalOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItemInputForm>();
  const [isNewMerchandiseTypeModalOpen, setIsNewMerchandiseTypeModalOpen] = useState(false);

  const { isReceived } = useMemo(() => getOrderStatusFlags(order), [order]);
  const haveOrderItems = useMemo(() => (order?.items || []).length > 0, [order?.items]);

  const handleEditOrderItem = useCallback(
    (orderItem: OrderItemInputForm) => () => {
      setSelectedOrderItem(orderItem);
      setIsNewOrderItemModalOpen(true);
    },
    []
  );
  const selectedOrderItemRef = useRef<OrderItemInputForm>();

  const handleOpenDeleteConfirmModal = useCallback(
    (item: Partial<OrderItemInfo>) => () => {
      selectedOrderItemRef.current = item;
      setIsDeleteConfirmOpen(true);
    },
    []
  );

  const handleCloseDeleteConfirmModal = useCallback(() => {
    selectedOrderItemRef.current = undefined;
    setIsDeleteConfirmOpen(false);
  }, []);

  const handleRemoveOrderItem = useCallback(async () => {
    const id = Number(selectedOrderItemRef.current?.id);
    if (id) {
      const result = await deleteOrderItem(
        { id, orgId, orderId: Number(order?.id), updatedByUser: userId },
        order?.updatedAt
      );

      if (result.error) {
        // Handle different error types
        let message = "";
        switch (result.error) {
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: selectedOrderItemRef.current?.name });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.delete_error_unknown", { name: selectedOrderItemRef.current?.name });
            break;
          default:
            break;
        }

        // Show an error notification
        showNotification({
          color: "error",
          title: t("common.message.delete_error_title"),
          message,
        });
      } else {
        // Show a success notification and navigate to the maintenance types page
        showNotification({
          color: "success",
          title: t("common.message.delete_success_title"),
          message: t("common.message.delete_success_message", {
            name: selectedOrderItemRef.current?.name,
          }),
        });
        mutate();
      }
    }

    selectedOrderItemRef.current = undefined;
    setIsDeleteConfirmOpen(false);
  }, [mutate, order?.id, order?.updatedAt, orgId, showNotification, t, userId]);

  const handleOpenOrderItemModalByButton = useCallback(() => {
    setIsNewOrderItemModalOpen(true);
  }, []);

  const handleCloseOrderItemModal = useCallback(() => {
    setIsNewOrderItemModalOpen(false);
    setSelectedOrderItem(undefined);
  }, []);

  const handleSaveOrderItem = useCallback(
    async (orderItem: OrderItemInputForm, isEdit?: boolean) => {
      if (orderItem) {
        let result: MutationResult<OrderItemInfo> | undefined;
        if (isEdit) {
          result = await updateOrderItem({
            ...orderItem,
            orgId,
            orderId: Number(order?.id),
            updatedByUser: userId,
            lastUpdatedAt: order?.updatedAt,
            merchandiseTypeId: orderItem.merchandiseType ? orderItem.merchandiseType.id : null,
          });
        } else {
          result = await createOrderItem({
            ...orderItem,
            orgId,
            orderId: Number(order?.id),
            updatedByUser: userId,
            lastUpdatedAt: order?.updatedAt,
            merchandiseTypeId: orderItem.merchandiseType ? orderItem.merchandiseType.id : null,
          });
        }

        if (!result) {
          return;
        }

        if (result.error) {
          // Handle different error types
          let message = "";
          switch (result.error) {
            case ErrorType.EXCLUSIVE:
              message = t("common.message.save_error_exclusive", { name: orderItem.name });
              break;
            case ErrorType.UNKNOWN:
              message = t("common.message.save_error_unknown", { name: orderItem.name });
              break;
            default:
              break;
          }

          // Show an error notification
          showNotification({
            color: "error",
            title: t("common.message.save_error_title"),
            message,
          });
        } else {
          // Show a success notification and navigate to the maintenance types page
          showNotification({
            color: "success",
            title: t("common.message.save_success_title"),
            message: t("common.message.save_success_message", {
              name: orderItem.name,
            }),
          });
          mutate();
        }
      }
      setSelectedOrderItem(undefined);
      setIsNewOrderItemModalOpen(false);
    },
    [mutate, order?.id, order?.updatedAt, orgId, showNotification, t, userId]
  );

  const handleToggleMerchandiseTypeModal = useCallback(
    () => setIsNewMerchandiseTypeModalOpen((prevValue) => !prevValue),
    []
  );

  const handleOpenOrderItemModalByLink = useCallback((event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    event.preventDefault();
    setIsNewOrderItemModalOpen(true);
  }, []);

  return (
    <>
      <Card className="col-span-full">
        <CardHeader
          title={t("order.item.title")}
          actionComponent={
            <Visible when={allowEdit} except={isTrue(orderConsolidationEnabled)}>
              <Authorization
                resource="order"
                action="edit"
                alwaysAuthorized={isEditor || (canEditOwn() && equalId(order?.createdByUser?.id, userId))}
              >
                <button onClick={handleToggleMerchandiseTypeModal}>
                  <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </Authorization>
            </Visible>
          }
          loading={loading}
        />
        <CardContent>
          <DescriptionProperty2 label={t("order.item.merchandise_type_title")} loading={loading}>
            {(order?.merchandiseTypes || []).length > 0 &&
              (order?.merchandiseTypes || []).map((item, index) => (
                <span key={index}>
                  {item.name}
                  {index < (order?.merchandiseTypes || []).length - 1 && ", "}
                </span>
              ))}
          </DescriptionProperty2>

          <DescriptionProperty2 label={t("order.item.merchandise_note")} loading={loading}>
            {order?.merchandiseNote}
          </DescriptionProperty2>

          <Visible
            when={allowEdit && !loading && !haveOrderItems}
            except={isTrue(orderConsolidationEnabled) && !loading && !haveOrderItems}
          >
            <Authorization
              resource="order"
              action="edit"
              alwaysAuthorized={isEditor || (canEditOwn() && equalId(order?.createdByUser?.id, userId))}
            >
              <div className="mt-2">
                <Link useDefaultStyle className="font-semibold" href="" onClick={handleOpenOrderItemModalByLink}>
                  <span aria-hidden="true">+</span> {t("order.item.add_detail_merchandises")}
                </Link>
              </div>
            </Authorization>
          </Visible>
        </CardContent>

        <Visible when={haveOrderItems}>
          <CardHeader loading={loading} title={t("order.item.detail_title")} />
          <CardContent padding={loading} className="pb-4">
            <TableContainer inside variant="paper">
              <Table dense>
                <TableHead uppercase>
                  <TableRow>
                    <TableCell align="right" className="w-12 !pl-0">
                      {t("order.item.detail_table_index")}
                    </TableCell>
                    <TableCell>{t("order.item.detail_table_name")}</TableCell>
                    <TableCell>{t("order.item.detail_table_merchandise_type")}</TableCell>
                    <TableCell>
                      <div className="inline-flex flex-col items-center">
                        {t("order.item.detail_table_packing")}
                        <span className="block text-[10px] font-normal normal-case text-gray-400">
                          {t("order.item.detail_table_packing_detail")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{t("order.item.detail_table_weight")}</TableCell>
                    <TableCell>{t("order.item.detail_table_quantity")}</TableCell>
                    {allowEdit && (
                      <TableCell action className="w-16">
                        <span className="sr-only">{t("common.actions")}</span>
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y divide-gray-200 bg-white">
                  {loading && !haveOrderItems && <SkeletonTableRow rows={7} columns={7} />}

                  {!loading && !haveOrderItems && (
                    <TableRow hover={false}>
                      <TableCell colSpan={8}>
                        <EmptyListSection
                          onClick={allowEdit ? handleOpenOrderItemModalByButton : undefined}
                          description={
                            allowEdit ? (
                              <>
                                {t.rich("order.item.empty_list_received", {
                                  strong: (chunks) => <span className="font-bold">{chunks}</span>,
                                })}
                              </>
                            ) : (
                              t("order.item.empty_list")
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}

                  {(order?.items || []).map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell align="right">{index + 1}</TableCell>
                      <TableCell>{item.name || t("common.empty")}</TableCell>
                      <TableCell>{item.merchandiseType?.name || t("common.empty")}</TableCell>
                      <TableCell>
                        {item.packageLength || item.packageWidth || item.packageHeight ? (
                          <span className="inline-flex flex-row [&>span::after]:mx-1 [&>span::after]:content-['x'] [&>span:last-child::after]:content-none">
                            <span>
                              <NumberLabel
                                value={Number(item.packageLength)}
                                emptyLabel="--"
                                unit={t("common.unit.centimeter").toLowerCase()}
                                useSpace={false}
                              />
                            </span>
                            <span>
                              <NumberLabel
                                value={Number(item.packageWidth)}
                                emptyLabel="--"
                                unit={t("common.unit.centimeter").toLowerCase()}
                                useSpace={false}
                              />
                            </span>
                            <span>
                              <NumberLabel
                                value={Number(item.packageHeight)}
                                emptyLabel="--"
                                unit={t("common.unit.centimeter").toLowerCase()}
                                useSpace={false}
                              />
                            </span>
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <NumberLabel
                          value={Number(item.packageWeight)}
                          emptyLabel={t("common.empty")}
                          unit={t("common.unit.kilogram").toLowerCase()}
                        />
                      </TableCell>
                      <TableCell>
                        <NumberLabel value={Number(item.quantity)} emptyLabel={t("common.empty")} />
                        {item.unit && ` ${item.unit}`}
                      </TableCell>
                      {allowEdit && (
                        <TableCell className="space-x-2 !pr-1">
                          <button type="button" onClick={handleEditOrderItem(item)}>
                            <PencilSquareIcon
                              aria-hidden="true"
                              className="h-5 w-5 text-gray-400 hover:text-gray-500"
                            />
                          </button>
                          <button type="button" onClick={handleOpenDeleteConfirmModal(item)}>
                            <TrashIcon aria-hidden="true" className="h-5 w-5 text-red-400 hover:text-red-500" />
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Visible when={haveOrderItems && isReceived} except={isTrue(orderConsolidationEnabled) && haveOrderItems}>
              <div className="ml-4 mt-2">
                <Link useDefaultStyle href="" className="font-semibold" onClick={handleOpenOrderItemModalByLink}>
                  <span aria-hidden="true">+</span> {t("order.item.detail_button")}
                </Link>
              </div>
            </Visible>
          </CardContent>
        </Visible>
      </Card>

      {/* Delete confirmation dialog */}
      <ConfirmModal
        open={isDeleteConfirmOpen}
        icon="question"
        title={t("common.confirmation.delete_title", { name: selectedOrderItemRef.current?.name })}
        message={t("common.confirmation.delete_message")}
        onClose={handleCloseDeleteConfirmModal}
        onCancel={handleCloseDeleteConfirmModal}
        onConfirm={handleRemoveOrderItem}
      />

      {/* New Merchandise Modal */}
      <NewOrderItemModal
        open={isNewOrderItemModalOpen}
        editOrderItem={selectedOrderItem}
        onClose={handleCloseOrderItemModal}
        onSave={handleSaveOrderItem}
      />

      {/* Merchandise Type Card Modal */}
      <MerchandiseTypeModal open={isNewMerchandiseTypeModalOpen} onClose={handleToggleMerchandiseTypeModal} />
    </>
  );
};

export default OrderItemCard;
