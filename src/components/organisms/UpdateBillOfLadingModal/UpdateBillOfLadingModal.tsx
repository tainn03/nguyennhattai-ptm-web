"use client";

import { FormikHelpers, getIn, useFormik } from "formik";
import { useLocale, useTranslations } from "next-intl";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

import { checkBillOfLadingExists } from "@/actions/orderTrip";
import { Checkbox, ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Authorization, Button, Modal, TextField, UploadInput } from "@/components/molecules";
import { UpdateBillOfLadingForm, updateBillOfLadingFormSchema } from "@/forms/orderTrip";
import { useAuth, usePermission } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { getBillOfLading, updateBillOfLading } from "@/services/client/orderTrip";
import { ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { UploadInputValue } from "@/types/file";
import { LocaleType } from "@/types/locale";
import { OrderInfo, OrderTripInfo, OrderTripStatusInfo } from "@/types/strapi";
import { getAccountInfo } from "@/utils/auth";
import { getClientTimezone } from "@/utils/date";
import { getGeneralDispatchVehicleInfo } from "@/utils/order";
import { ensureString } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: UpdateBillOfLadingForm = {
  id: undefined,
  billOfLading: "",
  billOfLadingImages: [],
  status: {
    notes: "",
  },
};

type UpdateBillOfLadingModalProps = {
  open: boolean;
  isPromised?: boolean;
  loading?: boolean;
  orderTrip?: Partial<OrderTripInfo>;
  order?: Partial<OrderInfo>;
  currentStatus?: Partial<OrderTripStatusInfo>;
  onClose?: () => void;
  onSubmit?: () => void;
  onSaved?: (data: UpdateBillOfLadingForm) => void;
};

const UpdateBillOfLadingModal = ({
  open,
  isPromised,
  orderTrip,
  order,
  currentStatus,
  loading,
  onClose,
  onSubmit,
  onSaved,
}: UpdateBillOfLadingModalProps) => {
  const t = useTranslations();
  const { orgLink, orgId, user } = useAuth();
  const { showNotification } = useNotification();
  const { canEdit } = usePermission("bill-of-lading");
  const locale = useLocale();

  const [billOfLadingImages, setBillOfLadingImages] = useState<UploadInputValue[]>([]);
  const [deleteImage, setDeleteImage] = useState<number[]>([]);

  const { remainingWeight } = useMemo(() => getGeneralDispatchVehicleInfo({ ...order }), [order]);

  const handleSubmitFormik = useCallback(
    async (values: UpdateBillOfLadingForm, formikHelpers: FormikHelpers<UpdateBillOfLadingForm>) => {
      const clientTimezone = getClientTimezone();
      // Check if the bill of lading already exists.
      const isBillOfLadingExists = await checkBillOfLadingExists(
        {
          id: orderTrip?.id,
          organizationId: orgId,
          billOfLading: values.billOfLading,
        },
        clientTimezone
      );

      if (isBillOfLadingExists) {
        formikHelpers.setFieldError(
          "billOfLading",
          errorExists("order.trip.update_bill_of_lading_modal.bill_of_lading_number")
        );
        return;
      }

      const data = {
        id: orderTrip?.id,
        code: orderTrip?.code,
        billOfLading: values.billOfLading,
        billOfLadingImages,
        order: { id: orderTrip?.order?.id, code: orderTrip?.order?.code },
        status: {
          ...currentStatus,
          notes: values.status?.notes,
        },
        totalTrips: (orderTrip?.order?.trips || []).length,
        remainingWeightCapacity: remainingWeight,
        orderTripStatusOrder: orderTrip?.statuses?.length || 0,
        lastUpdatedAt: orderTrip?.updatedAt,
        deleteImage,
        billOfLadingReceived: values.billOfLadingReceived,
        fullName: getAccountInfo(user).displayName,
        driver: orderTrip?.driver,
        locale: locale as LocaleType,
      };

      if (isPromised) {
        onSaved && onSaved(data);
        return;
      }

      let result: ApiResult<OrderTripInfo> | undefined;
      if (orderTrip?.id) {
        result = await updateBillOfLading(orgLink, data);
      }

      if (result?.status !== HttpStatusCode.Ok) {
        let message = "";
        switch (result?.message) {
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: orderTrip?.code });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: orderTrip?.code });
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
          message: values.billOfLadingReceived
            ? t("order.trip.update_bill_of_lading_modal.message.update_success", { tripCode: orderTrip?.code })
            : t("order.trip.edit_status.message.update_success", { tripCode: orderTrip?.code }),
        });
      }
      formikHelpers.resetForm({ values: initialFormValues });
      setBillOfLadingImages([]);
      onSubmit && onSubmit();
    },
    [
      orderTrip?.id,
      orderTrip?.code,
      orderTrip?.statuses?.length,
      orderTrip?.updatedAt,
      orderTrip?.driver,
      orgId,
      billOfLadingImages,
      orderTrip?.order?.id,
      orderTrip?.order?.code,
      orderTrip?.order?.trips,
      currentStatus,
      remainingWeight,
      deleteImage,
      user,
      locale,
      isPromised,
      onSubmit,
      onSaved,
      orgLink,
      showNotification,
      t,
    ]
  );

  const { touched, errors, values, isSubmitting, resetForm, handleChange, handleSubmit, setFieldValue } = useFormik({
    initialValues: initialFormValues,
    validationSchema: updateBillOfLadingFormSchema,
    onSubmit: handleSubmitFormik,
  });

  const handleCloseClick = useCallback(() => {
    resetForm({ values: initialFormValues });
    setBillOfLadingImages([]);
    setFieldValue("billOfLadingReceived", false);

    onClose && onClose();
  }, [onClose, resetForm, setFieldValue]);

  const handleSelectCheckBox = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setFieldValue("billOfLadingReceived", e.target.checked);
    },
    [setFieldValue]
  );

  const handleMultiFileChange = useCallback(
    (index?: number) => (file?: UploadInputValue) => {
      if (file) {
        setBillOfLadingImages((prevFileImages) => [...prevFileImages, file]);
      } else {
        const updatedFileImages = [...billOfLadingImages];
        const removedItem = updatedFileImages.splice(Number(index), 1)[0];

        if (removedItem && removedItem.id) {
          setDeleteImage([...deleteImage, Number(removedItem.id)]);
        }

        setBillOfLadingImages(updatedFileImages);
      }
    },
    [billOfLadingImages, deleteImage]
  );

  const viewMultipleFile = useMemo(() => {
    if (billOfLadingImages.length === 0) {
      return null;
    }

    return (
      <div className="grid grid-cols-4 gap-4">
        {billOfLadingImages.map((item, index) => (
          <div key={index} className="col-span-2 sm:col-span-1">
            <UploadInput
              key={index}
              value={{
                name: item.name ?? "",
                url: item.url ?? "",
              }}
              type="BILL_OF_LADING"
              name="image"
              previewGrid={false}
              onChange={handleMultiFileChange(index)}
            />
          </div>
        ))}
      </div>
    );
  }, [billOfLadingImages, handleMultiFileChange]);

  /**
   * A callback function for fetching and initializing the bill of lading data for edit.
   */
  const fetchBillOfLading = useCallback(async () => {
    if (isPromised) {
      resetForm({ values: initialFormValues });
      setBillOfLadingImages([]);
      setFieldValue("billOfLadingReceived", false);
      setDeleteImage([]);
      return;
    }

    if (!orderTrip?.id) {
      return;
    }

    const result = await getBillOfLading(Number(orgId), orderTrip.id);

    if (result) {
      const { billOfLading, billOfLadingImages: billOfLadingImagesData, statuses, billOfLadingReceived } = result;

      const initImages: UploadInputValue[] = billOfLadingImagesData.map((item) => {
        return {
          id: item.id,
          name: item.name,
          url: item.url,
        } as UploadInputValue;
      });

      resetForm({ values: { billOfLading, status: statuses[0], billOfLadingImages: billOfLadingImagesData } });
      setBillOfLadingImages(initImages);
      setFieldValue("billOfLadingReceived", !!billOfLadingReceived);
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
    }
  }, [isPromised, orderTrip?.id, orgId, resetForm, setFieldValue, showNotification, t]);

  /**
   * Fetching bill of lading data data when in edit or copy mode.
   */
  useEffect(() => {
    if (open) {
      fetchBillOfLading();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} size="2xl" showCloseButton onClose={handleCloseClick} onDismiss={handleCloseClick}>
      <form onSubmit={handleSubmit}>
        <ModalHeader title={t("order.trip.update_bill_of_lading_modal.title")} />
        <ModalContent>
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2 lg:col-span-3">
            <div className="col-span-full">
              <TextField
                required
                label={t("order.trip.update_bill_of_lading_modal.bill_of_lading_number")}
                name="billOfLading"
                value={ensureString(values.billOfLading)}
                onChange={handleChange}
                errorText={formatError(t, touched.billOfLading && errors.billOfLading)}
                disabled={!canEdit()}
              />
            </div>
            <div className="col-span-full">
              {viewMultipleFile}
              <UploadInput
                label={t("order.trip.update_bill_of_lading_modal.bill_of_lading_image")}
                name="billOfLadingImages"
                multiple
                showPreview={false}
                type="BILL_OF_LADING"
                value={undefined}
                onChange={handleMultiFileChange(undefined)}
                helperText={t("order.trip.update_bill_of_lading_modal.bill_of_lading_image_helper")}
                errorText={formatError(t, touched.billOfLadingImages && ensureString(errors.billOfLadingImages))}
                disabled={!canEdit()}
              />
            </div>
            <div className="col-span-full">
              <TextField
                multiline
                rows={3}
                label={t("order.trip.update_bill_of_lading_modal.notes")}
                name="status.notes"
                value={ensureString(values.status?.notes)}
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, getIn(touched, "status.notes") && getIn(errors, "status.notes"))}
                disabled={!canEdit()}
              />
            </div>
            <Checkbox
              label={t("order.trip.update_bill_of_lading_modal.confirm_bill_of_lading_received_label")}
              subLabel={t("order.trip.update_bill_of_lading_modal.confirm_bill_of_lading_received_sub_label")}
              className="col-span-full"
              checked={values.billOfLadingReceived ?? false}
              onChange={handleSelectCheckBox}
              disabled={!canEdit()}
            />
          </div>
        </ModalContent>
        <ModalActions>
          <Button
            type="button"
            variant="outlined"
            color="secondary"
            disabled={isSubmitting || (isPromised && loading)}
            onClick={handleCloseClick}
          >
            {t("common.cancel")}
          </Button>
          <Authorization resource="bill-of-lading" action="edit">
            <Button type="submit" loading={isSubmitting || (isPromised && loading)}>
              {t("common.save")}
            </Button>
          </Authorization>
        </ModalActions>
      </form>
    </Modal>
  );
};

export default UpdateBillOfLadingModal;
