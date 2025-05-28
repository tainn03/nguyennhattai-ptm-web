"use client";

import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { mutate } from "swr";

import { Badge, ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Modal, TextField } from "@/components/molecules";
import Combobox, { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { NewMerchandiseTypeModal } from "@/components/organisms";
import { OrderMerchandiseTypeCardModalInputForm, orderMerchandiseTypeCardModalInputSchema } from "@/forms/order";
import { useAuth, useMerchandiseTypeOptions } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { getMerchandiseType } from "@/services/client/merchandiseType";
import { updateMaintenanceOrder } from "@/services/client/order";
import { ErrorType } from "@/types";
import { MerchandiseTypeInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";

const initialFormValues: OrderMerchandiseTypeCardModalInputForm = {
  merchandiseNote: "",
};

export type MerchandiseTypeModalProps = {
  open: boolean;
  onClose: () => void;
};

const MerchandiseTypeModal = ({ open, onClose }: MerchandiseTypeModalProps) => {
  const t = useTranslations();
  const { orgId, orgLink, userId } = useAuth();
  const { showNotification } = useNotification();
  const { order } = useOrderState();

  const [isNewMerchandiseTypeModalOpen, setIsNewMerchandiseTypeModalOpen] = useState(false);
  const [selectedMerchandiseType, setSelectedMerchandiseType] = useState<MerchandiseTypeInfo>();
  const { merchandiseTypes, isLoading, mutate: mutateOptions } = useMerchandiseTypeOptions({ organizationId: orgId });

  const handleSubmitForm = useCallback(
    async (
      values: OrderMerchandiseTypeCardModalInputForm,
      formikHelpers: FormikHelpers<OrderMerchandiseTypeCardModalInputForm>
    ) => {
      const result = await updateMaintenanceOrder(
        {
          id: Number(order?.id),
          organizationId: Number(orgId),
          merchandiseNote: ensureString(values.merchandiseNote),
          merchandiseTypes: values.merchandiseTypes || [],
          updatedById: Number(userId),
        },
        order?.updatedAt
      );

      if (result.error) {
        let message = "";
        switch (result.error) {
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: order?.code });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: order?.code });
            break;
          default:
            break;
        }

        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message,
        });
      } else {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", {
            name: order?.code,
          }),
        });

        mutate([`orders/${order?.code}`, { organizationId: orgId, code: order?.code }]);
        formikHelpers.setSubmitting(false);
        onClose && onClose();
      }
    },
    [onClose, order?.code, order?.id, order?.updatedAt, orgId, showNotification, t, userId]
  );

  const { values, errors, touched, isSubmitting, handleChange, handleSubmit, setFieldValue, resetForm } =
    useFormik<OrderMerchandiseTypeCardModalInputForm>({
      initialValues: initialFormValues,
      validationSchema: orderMerchandiseTypeCardModalInputSchema,
      enableReinitialize: true,
      onSubmit: handleSubmitForm,
    });

  useEffect(() => {
    resetForm({ values: { merchandiseNote: order?.merchandiseNote, merchandiseTypes: order?.merchandiseTypes } });
  }, [resetForm, open, order?.merchandiseNote, order?.merchandiseTypes]);

  const merchandiseTypeOptions: ComboboxItem[] = useMemo(
    () =>
      merchandiseTypes
        ?.filter((item) => !values?.merchandiseTypes?.some((data) => data.id === item.id))
        ?.map((item) => ({
          value: ensureString(item.id),
          label: item.name,
        })) || [],
    [merchandiseTypes, values?.merchandiseTypes]
  );

  const handleClose = useCallback(() => {
    resetForm({ values: { merchandiseNote: order?.merchandiseNote, merchandiseTypes: order?.merchandiseTypes } });
    onClose && onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const handleRemoveMerchandiseType = useCallback(
    (value?: number) => async () => {
      setFieldValue(
        "merchandiseTypes",
        (values.merchandiseTypes ?? []).filter((item) => ensureString(item.id) !== ensureString(value))
      );
      mutateOptions();
    },

    [mutateOptions, setFieldValue, values.merchandiseTypes]
  );

  const handleManageMerchandiseType = useCallback(
    () => window.open(`${orgLink}/settings/merchandise-types`, "_blank"),
    [orgLink]
  );

  const handleAddMerchandiseType = useCallback(() => {
    if (selectedMerchandiseType?.id) {
      setFieldValue("merchandiseTypes", [...(values.merchandiseTypes || []), selectedMerchandiseType]);
      setSelectedMerchandiseType(undefined);
    }
  }, [selectedMerchandiseType, setFieldValue, values.merchandiseTypes]);

  const handleMerchandiseTypeFieldChange = useCallback(
    (value: string) =>
      setSelectedMerchandiseType((merchandiseTypes || []).find((item) => ensureString(item.id) === value)),
    [merchandiseTypes]
  );

  const handleToggleMerchandiseTypeModal = useCallback(
    () => setIsNewMerchandiseTypeModalOpen((prevValue) => !prevValue),
    []
  );

  const handleNewMerchandiseTypeModalSubmit = useCallback(
    async (id?: number) => {
      setIsNewMerchandiseTypeModalOpen(false);
      if (id) {
        mutateOptions();
        const result = await getMerchandiseType(Number(orgId), id);
        if (result) {
          setSelectedMerchandiseType(result);
        }
      }
    },
    [mutateOptions, orgId]
  );

  return (
    <>
      <Modal open={open} size="3xl" showCloseButton onClose={handleClose} allowOverflow>
        <form onSubmit={handleSubmit}>
          <ModalHeader title={t("order.item.modal_update_merchandise_title")} />
          <ModalContent className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
            <div className="col-span-full">
              <label htmlFor="merchandiseType" className="block text-sm font-medium leading-6 text-gray-900">
                {t("order.item.modal_update_merchandise_type")}
              </label>
              <div>
                <div className="flex flex-row flex-wrap gap-x-4 gap-y-2 py-4">
                  {(values.merchandiseTypes ?? []).map((item) => (
                    <Badge
                      key={item?.id}
                      label={ensureString(item.name)}
                      onRemove={handleRemoveMerchandiseType(item.id)}
                    />
                  ))}
                </div>
                <div className="grid max-w-2xl grid-cols-1 xl:grid-cols-6">
                  <div className="xl:col-span-3">
                    <div className="flex gap-x-4">
                      <div className="flex-1">
                        <Combobox
                          items={merchandiseTypeOptions}
                          placeholder={
                            isLoading ? t("common.loading") : t("order.item.modal_update_merchandise_type_select")
                          }
                          onChange={handleMerchandiseTypeFieldChange}
                          value={ensureString(selectedMerchandiseType?.id)}
                          newButtonText={t("order.item.modal_update_merchandise_type_button_new")}
                          onNewButtonClick={handleToggleMerchandiseTypeModal}
                          manageButtonText={t("order.item.modal_update_merchandise_type_button_manage")}
                          onManageButtonClick={handleManageMerchandiseType}
                        />
                      </div>
                      <Button
                        variant="outlined"
                        type="button"
                        color="secondary"
                        onClick={handleAddMerchandiseType}
                        disabled={!selectedMerchandiseType}
                      >
                        {t("order.item.modal_update_merchandise_type_new")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-full">
              <TextField
                label={t("order.item.modal_update_merchandise_note")}
                name="merchandiseNote"
                multiline
                maxLength={500}
                showCount
                value={ensureString(values.merchandiseNote)}
                onChange={handleChange}
                errorText={touched.merchandiseNote && errors.merchandiseNote}
              />
            </div>
          </ModalContent>
          <ModalActions align="right">
            <Button type="button" variant="outlined" color="secondary" disabled={isSubmitting} onClick={handleClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {t("common.save")}
            </Button>
          </ModalActions>
        </form>
      </Modal>

      {/* New Merchandise Type Modal */}
      <NewMerchandiseTypeModal
        open={isNewMerchandiseTypeModalOpen}
        onClose={handleToggleMerchandiseTypeModal}
        onSubmit={handleNewMerchandiseTypeModalSubmit}
      />
    </>
  );
};

export default MerchandiseTypeModal;
