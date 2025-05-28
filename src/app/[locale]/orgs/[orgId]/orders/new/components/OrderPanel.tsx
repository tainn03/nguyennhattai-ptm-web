"use client";

import { OrderParticipantRole } from "@prisma/client";
import { getIn, useFormikContext } from "formik";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Fragment, memo, MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BsBoxSeam as BsBoxSeamIcon } from "react-icons/bs";

import { CardContent, CardHeader, Link, VisibleWithSetting } from "@/components/atoms";
import { Combobox, DatePicker, NumberField, ProfileInfo, TextField } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { NewUnitOfMeasureModal, OrderParticipantModal, RecentOrderNoteModal } from "@/components/organisms";
import { DateTimeDisplayType, OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { workflowComboboxItems } from "@/constants/prototype";
import { OrderInputForm } from "@/forms/order";
import { OrderParticipantInputForm } from "@/forms/orderParticipant";
import { useAuth, useOrgSettingExtendedStorage, usePermission, useUnitOfMeasureOptions } from "@/hooks";
import { UnitOfMeasureInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

const OrderPanel = () => {
  const t = useTranslations();
  const { orgId, orgLink, user } = useAuth();
  const searchParams = useSearchParams();
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const { values, errors, touched, handleChange, setFieldValue } = useFormikContext<OrderInputForm>();
  const [isOrderParticipantModalOpen, setIsOrderParticipantModalOpen] = useState(false);
  const [isRecentOrderNoteModalOpen, setIsRecentOrderNoteModalOpen] = useState(false);

  const { canNew, canFind } = usePermission("unit-of-measure");

  const USER_ROLE = {
    OWNER: { label: t("order_new.owner") },
    EDITOR: { label: t("order_new.editor") },
    VIEWER: { label: t("order_new.viewer") },
  };

  /**
   * Set default value for participants
   */
  useEffect(() => {
    if ((values?.participants || []).length === 0) {
      setFieldValue("participants", [{ user, role: OrderParticipantRole.OWNER }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, values?.participants]);

  /**
   * Get the priority of a given order participant role.
   *
   * @param {string | null | undefined} role - The role of the order participant.
   * @returns {number} The priority value for the given role.
   */
  const getRolePriority = useCallback((role?: string | null) => {
    switch (role) {
      case OrderParticipantRole.OWNER:
        return 1;
      case OrderParticipantRole.EDITOR:
        return 2;
      case OrderParticipantRole.VIEWER:
        return 3;
      default:
        return 4;
    }
  }, []);

  /**
   * Get order participant list
   */
  const orderParticipant = useMemo(() => {
    return [...(values?.participants || [])]?.sort((a, b) => getRolePriority(a.role) - getRolePriority(b.role));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, values?.participants, getRolePriority]);

  const { unitOfMeasures, isLoading, mutate } = useUnitOfMeasureOptions({ organizationId: Number(orgId) });

  /**
   * Get unit of measure options
   */
  const unitOfMeasuresOptions: ComboboxItem[] = useMemo(
    () =>
      unitOfMeasures?.map((item: UnitOfMeasureInfo) => ({
        value: ensureString(item.id),
        label: item.code,
        subLabel: item.name,
      })) || [],
    [unitOfMeasures]
  );

  /**
   * Get current unit of measure
   */
  const currentUnit = useMemo(
    () =>
      unitOfMeasuresOptions.find((item) => item.value === ensureString(values.unit?.id))?.label.toUpperCase() || "--",
    [unitOfMeasuresOptions, values.unit?.id]
  );

  /**
   * Handle open unit of measure modal
   */
  const handleOpeUnitModal = useCallback(() => {
    setIsUnitModalOpen(true);
  }, []);

  /**
   * Handle close unit of measure modal
   */
  const handleCloseUnitModal = useCallback(() => {
    setIsUnitModalOpen(false);
  }, []);

  /**
   * Handle submit unit of measure modal
   */
  const handleSubmitUnitModal = useCallback(
    (id?: number) => {
      setIsUnitModalOpen(false);
      if (id) {
        setFieldValue("unit.id", id);
        mutate();
      }
    },
    [mutate, setFieldValue]
  );

  /**
   * Handle manage unit of measure
   */
  const handleManageUnit = useCallback(() => {
    window.open(`${orgLink}/settings/unit-of-measures`, "_blank");
  }, [orgLink]);

  /**
   * Handle unit of measure change
   */
  const handleUnitChange = useCallback(
    (value: string) => {
      setFieldValue("unit.id", Number(value));
    },
    [setFieldValue]
  );

  /**
   * Handle date change
   */
  const handleDateChange = useCallback(
    (name: string) => (date: Date) => {
      setFieldValue(name, date);
    },
    [setFieldValue]
  );

  /**
   * Handle open order participant modal
   */
  const handleOpenParticipantModal = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsOrderParticipantModalOpen(true);
  }, []);

  /**
   * Handle close order participant modal
   */
  const handleCloseParticipantModal = useCallback(() => {
    setIsOrderParticipantModalOpen(false);
  }, []);

  /**
   * Handle update order participant
   * @param {OrderParticipantInputForm} value - The order participant input form
   */
  const handleUpdateParticipant = useCallback(
    (value: OrderParticipantInputForm) => {
      const { user, role } = value;
      switch (value.role) {
        case OrderParticipantRole.EDITOR:
        case OrderParticipantRole.VIEWER:
          setFieldValue(
            "participants",
            (values?.participants || []).map((orderParticipant) => {
              if (Number(orderParticipant.user?.id) === Number(user?.id)) {
                return { ...orderParticipant, role };
              }
              return orderParticipant;
            })
          );
          break;
        case OrderParticipantRole.OWNER:
          break;
        default:
          setFieldValue(
            "participants",
            (values?.participants || []).filter(
              (orderParticipant) => Number(orderParticipant.user?.id) !== Number(user?.id)
            )
          );
          break;
      }
    },
    [setFieldValue, values?.participants]
  );

  /**
   * Handle create order participant
   * @param {OrderParticipantInputForm} value - The order participant input form
   */
  const handleCreateParticipant = useCallback(
    (value: OrderParticipantInputForm) => {
      const { orgMember: _, ...data } = value;

      switch (value.role) {
        case OrderParticipantRole.EDITOR:
        case OrderParticipantRole.VIEWER: {
          setFieldValue("participants", [...(values?.participants || []), data]);
          break;
        }
        default:
          break;
      }
    },
    [setFieldValue, values?.participants]
  );

  /**
   * Handle remove order participant
   * @param {number} id - The id of the order participant
   */
  const handleRemoveParticipant = useCallback(
    (id: number) => () => {
      setFieldValue(
        "participants",
        (values?.participants || []).filter((orderParticipant) => Number(orderParticipant.user?.id) !== id)
      );
    },
    [setFieldValue, values?.participants]
  );

  /**
   * Handle open recent order note modal
   * @param {MouseEvent<HTMLAnchorElement>} event - The mouse event of the anchor element
   */
  const handleOpenRecentOrderNoteModal = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsRecentOrderNoteModalOpen(true);
  }, []);

  /**
   * Handle close recent order note modal
   */
  const handleCloseRecentOrderNoteModal = useCallback(() => {
    setIsRecentOrderNoteModalOpen(false);
  }, []);

  /**
   * Handle select recent order note
   * @param {string | null} note - The note of the recent order
   */
  const handleSelectRecentOrderNote = useCallback(
    (note: string | null) => {
      setFieldValue("notes", note);
    },
    [setFieldValue]
  );

  return (
    <>
      <CardHeader title={t("order_new.order_panel.info")} />
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
        {/* Order Date */}
        <div className="sm:col-span-3 sm:col-start-1 xl:col-span-2 xl:col-start-auto">
          <DatePicker
            label={t("order_new.order_panel.order_date")}
            required
            name="orderDate"
            selected={values.orderDate && new Date(values.orderDate)}
            onChange={handleDateChange("orderDate")}
            errorText={formatError(t, touched.orderDate && errors.orderDate)}
            {...(organizationOrderRelatedDateFormat === DateTimeDisplayType.DATETIME_NO_SECOND && {
              dateFormat: "dd/MM/yyyy HH:mm",
              mask: "99/99/9999 99:99",
              showTimeSelect: true,
            })}
          />
        </div>

        {/* Plan of Delivery Date */}
        <div className="sm:col-span-3 xl:col-span-2">
          <DatePicker
            label={t("order_new.order_panel.delivery_date")}
            name="deliveryDate"
            selected={values.deliveryDate && new Date(values.deliveryDate)}
            onChange={handleDateChange("deliveryDate")}
            errorText={formatError(t, touched.deliveryDate && errors.deliveryDate)}
            {...(organizationOrderRelatedDateFormat === DateTimeDisplayType.DATETIME_NO_SECOND && {
              dateFormat: "dd/MM/yyyy HH:mm",
              mask: "99/99/9999 99:99",
              showTimeSelect: true,
            })}
          />
        </div>

        {/* Plan of Delivery Date */}
        {(!searchParams.get("workflow") || Number(searchParams.get("workflow")) !== 1) && (
          <div className="sm:col-span-3 xl:col-span-2">
            <Combobox
              label="Loại hình xuất nhập khẩu"
              value="2"
              items={workflowComboboxItems}
              placeholder="Chọn loại hình xuất nhập khẩu"
            />
          </div>
        )}

        {/* Unit of measure */}
        <div className="sm:col-span-3 sm:col-start-1 xl:col-span-2 xl:col-start-1">
          <Combobox
            label={t("order_new.order_panel.unit")}
            required
            items={unitOfMeasuresOptions}
            loading={isLoading}
            placeholder={t("order_new.order_panel.unit_placeholder")}
            value={ensureString(values.unit?.id)}
            onChange={handleUnitChange}
            errorText={formatError(t, getIn(touched, "unit.id") && getIn(errors, "unit.id"))}
            newButtonText={canNew() ? t("order_new.order_panel.unit_new") : undefined}
            onNewButtonClick={canNew() ? handleOpeUnitModal : undefined}
            manageButtonText={canFind() ? t("order_new.order_panel.unit_manage") : undefined}
            onManageButtonClick={canFind() ? handleManageUnit : undefined}
          />
        </div>

        {/* Weight */}
        <div className="sm:col-span-3 xl:col-span-2">
          <NumberField
            label={t("order_new.order_panel.weight")}
            name="weight"
            required
            className="[&_input]:pr-16"
            value={values.weight}
            onChange={handleChange}
            suffixText={currentUnit}
            errorText={formatError(t, touched.weight && errors.weight)}
          />
        </div>

        {/* CBM */}
        <VisibleWithSetting settingKey={OrganizationSettingExtendedKey.ENABLE_CBM_FIELD} expect={true}>
          <div className="sm:col-span-3 xl:col-span-2">
            <NumberField
              label={t("order_new.order_panel.cbm")}
              name="cbm"
              value={values.cbm}
              onChange={handleChange}
              errorText={formatError(t, touched.cbm && errors.cbm)}
            />
          </div>
        </VisibleWithSetting>

        {/* Unit Price */}
        <div className="sm:col-span-3 sm:col-start-1 xl:col-span-2 xl:col-start-1">
          <NumberField
            label={t("order_new.order_panel.total_amount")}
            name="totalAmount"
            value={values.totalAmount}
            onChange={handleChange}
            suffixText={t("common.unit.currency")}
            errorText={formatError(t, touched.totalAmount && errors.totalAmount)}
          />
        </div>

        {/* Payment Due Date */}
        <div className="sm:col-span-3 xl:col-span-2">
          <DatePicker
            label={t("order_new.order_panel.payment_due_date")}
            name="paymentDueDate"
            selected={values.paymentDueDate && new Date(values.paymentDueDate)}
            onChange={handleDateChange("paymentDueDate")}
            errorText={formatError(t, touched.paymentDueDate && errors.paymentDueDate)}
          />
        </div>

        {/* Order Note */}
        <div className="col-span-full flex flex-col">
          <TextField
            label={t("order_new.order_panel.notes")}
            name="notes"
            value={ensureString(values.notes)}
            onChange={handleChange}
            multiline
            hintComponent={
              <Link
                useDefaultStyle
                onClick={handleOpenRecentOrderNoteModal}
                className="mt-2 flex flex-nowrap items-center gap-x-2 self-end"
                href=""
              >
                <BsBoxSeamIcon className="h-4 w-4 flex-shrink-0" />
                {t("order_new.order_panel.copy_from_another_order")}
              </Link>
            }
            errorText={formatError(t, touched.notes && errors.notes)}
          />
        </div>

        {/* Order Operators */}
        <div className="col-span-full">
          <label htmlFor="orderNote" className="block text-sm font-medium leading-6 text-gray-900">
            {t("order_new.order_panel.operator")}
          </label>
          <div className="mt-2 flex flex-row flex-wrap gap-x-4 gap-y-2">
            {orderParticipant?.map((item) => (
              <Fragment key={item.id}>
                {item.role && (
                  <ProfileInfo
                    as="button"
                    hover={item.role !== OrderParticipantRole.OWNER}
                    onClick={handleRemoveParticipant(Number(item.user?.id))}
                    user={item.user}
                    description={USER_ROLE[item.role].label}
                    border
                  />
                )}
              </Fragment>
            ))}
          </div>
          <div className="mt-4">
            <Link useDefaultStyle href="" onClick={handleOpenParticipantModal}>
              <span aria-hidden="true">+</span> {t("order_new.order_panel.operator_new")}
            </Link>
          </div>
        </div>
      </CardContent>

      {/* New unit of measure modal */}
      <NewUnitOfMeasureModal open={isUnitModalOpen} onClose={handleCloseUnitModal} onSubmit={handleSubmitUnitModal} />

      {/* Order participant modal */}
      <OrderParticipantModal
        open={isOrderParticipantModalOpen}
        orderParticipants={values?.participants}
        onClose={handleCloseParticipantModal}
        onUpdate={handleUpdateParticipant}
        onCreate={handleCreateParticipant}
      />

      {/* Recent order note modal */}
      {isRecentOrderNoteModalOpen && (
        <RecentOrderNoteModal
          open={isRecentOrderNoteModalOpen}
          customerId={values.customerId ?? null}
          onSelect={handleSelectRecentOrderNote}
          onClose={handleCloseRecentOrderNoteModal}
        />
      )}
    </>
  );
};

export default memo(OrderPanel);
