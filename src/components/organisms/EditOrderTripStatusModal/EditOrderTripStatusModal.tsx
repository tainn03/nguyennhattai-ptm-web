"use client";

import { OrderTripStatusType } from "@prisma/client";
import { FormikHelpers, useFormik } from "formik";
import includes from "lodash/includes";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ModalActions,
  ModalContent,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Button, EmptyListSection, Modal, TextField, UploadInput } from "@/components/molecules";
import Select, { SelectItem } from "@/components/molecules/Select/Select";
import { updateOrderTripInputFormSchema, UpdateStatusInputForm } from "@/forms/orderTrip";
import { useAuth, useDriverReportsTripStatus } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { updateOrderTripStatus } from "@/services/client/orderTrip";
import { HttpStatusCode } from "@/types/api";
import { UploadInputValue } from "@/types/file";
import { OrderInfo, OrderTripInfo, OrderTripStatusInfo } from "@/types/strapi";
import { getAccountInfo } from "@/utils/auth";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

const initialFormValues: UpdateStatusInputForm = {
  status: null,
  notes: null,
  driverReportId: null,
  attachments: [],
};

type EditOrderTripStatusModalProps = {
  open: boolean;
  isPromised?: boolean;
  isInboundOrder?: boolean;
  loading?: boolean;
  orderTrip?: Partial<OrderTripInfo>;
  order?: Partial<OrderInfo>;
  status?: Partial<OrderTripStatusInfo>;
  onClose?: () => void;
  onSubmit?: (id: number) => void;
  onSaved?: (data: UpdateStatusInputForm) => void;
};

const EditOrderTripStatusModal = ({
  open,
  orderTrip,
  order,
  isPromised,
  isInboundOrder,
  loading,
  status,
  onClose,
  onSubmit,
  onSaved,
}: EditOrderTripStatusModalProps) => {
  const t = useTranslations();
  const { orgId, orgLink, user } = useAuth();
  const { showNotification } = useNotification();
  const { driverReports } = useDriverReportsTripStatus({
    organizationId: orgId,
    ...(!isInboundOrder && {
      excludedTypes: [OrderTripStatusType.WAREHOUSE_GOING_TO_PICKUP, OrderTripStatusType.WAREHOUSE_PICKED_UP],
    }),
  });

  const [fileImages, setFileImages] = useState<UploadInputValue[]>([]);
  const [photoRequired, setPhotoRequired] = useState(false);

  const statusOptions: SelectItem[] = useMemo(() => {
    let hasRequired = false;
    return !isPromised
      ? driverReports
          .filter(
            (item) =>
              !includes(
                [OrderTripStatusType.NEW, OrderTripStatusType.CANCELED, OrderTripStatusType.COMPLETED],
                item.type
              )
          )
          .map((item) => {
            let disabled = true;
            if (!hasRequired && Number(item.displayOrder) > Number(status?.driverReport?.displayOrder)) {
              hasRequired = item.isRequired;
              disabled = false;
            }
            return { label: item.name, value: ensureString(item.id), disabled };
          })
      : driverReports
          .filter((item) => equalId(item.id, status?.driverReport?.id))
          .map((item) => ({
            label: item.name,
            value: ensureString(item.id),
          }));
  }, [driverReports, isPromised, status?.driverReport?.displayOrder, status?.driverReport?.id]);

  const handleSubmitFormik = useCallback(
    async (values: UpdateStatusInputForm, formikHelpers: FormikHelpers<UpdateStatusInputForm>) => {
      if (photoRequired && (values?.attachments || []).length === 0) {
        formikHelpers.setFieldError("attachments", t("order.trip.edit_status.message.photo_required"));
        return;
      }
      const driverReportName = driverReports.find((item) => equalId(item.id, values.driverReportId))?.name;
      const data = {
        ...values,
        billOfLadingImages: fileImages,
        id: orderTrip?.id,
        code: orderTrip?.code,
        orderDate: order?.createdAt,
        updatedAt: orderTrip?.updatedAt,
        driver: orderTrip?.driver,
        fullName: getAccountInfo(user).displayName,
        vehicle: { vehicleNumber: orderTrip?.vehicle?.vehicleNumber },
        weight: orderTrip?.weight,
        unitOfMeasure: order?.unit?.code,
        driverReportName,
        orderId: order?.id,
        orderCode: order?.code,
      };

      if (isPromised) {
        onSaved && onSaved(data);
        return;
      }

      const result = await updateOrderTripStatus(orgLink, data);
      if (result.status === HttpStatusCode.Ok) {
        showNotification({
          color: "success",
          message: t("order.trip.edit_status.message.update_success", { tripCode: orderTrip?.code }),
        });

        formikHelpers.resetForm({ values: initialFormValues });
        setPhotoRequired(false);
        setFileImages([]);

        onSubmit && onSubmit(Number(orderTrip?.id));
      } else {
        showNotification({
          color: "error",
          message: t("order.trip.edit_status.message.error", { tripCode: orderTrip?.code }),
        });
      }
    },
    [
      photoRequired,
      driverReports,
      fileImages,
      orderTrip?.id,
      orderTrip?.code,
      orderTrip?.updatedAt,
      orderTrip?.driver,
      orderTrip?.vehicle?.vehicleNumber,
      orderTrip?.weight,
      order?.createdAt,
      order?.unit?.code,
      order?.id,
      order?.code,
      user,
      isPromised,
      orgLink,
      t,
      onSaved,
      showNotification,
      onSubmit,
    ]
  );

  const {
    touched,
    errors,
    values,
    isSubmitting,
    resetForm,
    handleChange,
    setFieldValue,
    setFieldError,
    setSubmitting,
    handleSubmit,
  } = useFormik({
    initialValues: initialFormValues,
    validationSchema: updateOrderTripInputFormSchema,
    onSubmit: handleSubmitFormik,
  });

  useEffect(() => {
    if (isPromised) {
      resetForm({ values: initialFormValues });
      setSubmitting(false);
      setPhotoRequired(false);
      setFileImages([]);
      setFieldValue("driverReportId", Number(status?.driverReport?.id));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPromised, status?.driverReport?.id]);

  /**
   * Handle close modal
   */
  const handleCloseClick = useCallback(() => {
    resetForm({ values: initialFormValues });
    setFileImages([]);
    setPhotoRequired(false);

    onClose && onClose();
  }, [onClose, resetForm]);

  /**
   * Handle change status
   * @param value Value of status to change
   */
  const handleStatusChange = useCallback(
    (value: string) => {
      setFieldValue("driverReportId", Number(value));
    },
    [setFieldValue]
  );

  /**
   * Handle changes to multiple file inputs in a form.
   *
   * @param {number} [index] - Optional index to specify the position of the file to change.
   * @param {UploadInputValue} [file] - The new file to add or the file to remove (if specified by index).
   */
  const handleMultiFileChange = useCallback(
    (index?: number) => (file?: UploadInputValue) => {
      if (file) {
        setFileImages((prevFileImages) => [...prevFileImages, file]);
        if (values?.attachments) {
          setFieldValue("attachments", [...values.attachments, file.name]);
        }
        if (photoRequired) {
          setFieldError("attachments", "");
        }
      } else {
        const updatedFileImages = [...fileImages];
        updatedFileImages.splice(Number(index), 1)[0];
        setFileImages(updatedFileImages);
        setFieldValue("attachments", updatedFileImages);
      }
    },
    [fileImages, photoRequired, setFieldError, setFieldValue, values.attachments]
  );

  const viewMultipleFile = useMemo(() => {
    if (fileImages.length === 0) {
      return null;
    }

    return (
      <div className="grid grid-cols-4 gap-4">
        {fileImages.map((item, index) => (
          <div key={index} className="col-span-2 sm:col-span-1">
            <UploadInput
              key={index}
              value={{
                name: item.name ?? "",
                url: item.url ?? "",
              }}
              type="INTERNAL_MESSAGE"
              name="image"
              previewGrid={false}
              onChange={handleMultiFileChange(index)}
            />
          </div>
        ))}
      </div>
    );
  }, [fileImages, handleMultiFileChange]);

  const reportDetails = useMemo(() => {
    const driverReport = driverReports.find((item) => equalId(item.id, values.driverReportId));
    if (driverReport) {
      setFieldValue("status", driverReport.type);
      setPhotoRequired(driverReport.photoRequired);
      return driverReport.reportDetails;
    }
    return [];
  }, [driverReports, setFieldValue, values.driverReportId]);

  return (
    <Modal open={open} size="7xl" showCloseButton onClose={handleCloseClick} onDismiss={handleCloseClick}>
      <form onSubmit={handleSubmit}>
        <ModalHeader title={t("order.trip.edit_status.title")} />
        <ModalContent>
          <div className="flex w-full shrink justify-between gap-x-4">
            <div className="flex w-full flex-col space-y-6">
              <Select
                label={t("order.trip.edit_status.trip_status")}
                items={statusOptions}
                name="status"
                value={ensureString(values.driverReportId)}
                placeholder={t("order.trip.edit_status.choose_status")}
                onChange={handleStatusChange}
                required
                errorText={formatError(t, touched.driverReportId && errors.driverReportId)}
              />
              {viewMultipleFile}
              <UploadInput
                showPreview={false}
                label={t("order.trip.edit_status.photo")}
                type="INTERNAL_MESSAGE"
                name="attachments"
                value={undefined}
                multiple
                onChange={handleMultiFileChange(undefined)}
                helperText={t("order.trip.edit_status.photo_helper")}
                required={photoRequired}
                errorText={touched.attachments && errors.attachments}
              />
              <TextField
                multiline
                rows={3}
                label={t("order.trip.edit_status.notes")}
                name="notes"
                value={ensureString(values.notes)}
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.notes && errors.notes)}
              />
            </div>

            <div className="!mt-2 !w-full shrink-[0.6]">
              <div className="text-sm font-medium text-gray-900">{t("order.trip.edit_status.check_list")}</div>
              <TableContainer variant="paper" inside horizontalScroll className="!mt-2 !w-full shrink-[0.6]">
                <Table dense>
                  <TableHead uppercase>
                    <TableRow>
                      <TableCell align="right" className="!w-10">
                        {t("order.trip.edit_status.detail_index")}
                      </TableCell>
                      <TableCell className="!w-44 whitespace-pre-wrap">
                        {t("order.trip.edit_status.detail_name")}
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap">
                        {t("order.trip.edit_status.detail_description")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="divide-y divide-gray-200 bg-white">
                    {reportDetails.length > 0 ? (
                      reportDetails.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="!w-10 !pl-0" align="right">
                            {index + 1}
                          </TableCell>
                          <TableCell className="!w-44 whitespace-pre-wrap">{item.name}</TableCell>
                          <TableCell className="whitespace-pre-wrap">{item.description}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow hover={false} className="mx-auto max-w-lg">
                        <TableCell colSpan={3} className="px-6 lg:px-8">
                          <EmptyListSection title={t("order.trip.edit_status.empty_detail")} description=" " />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
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
          <Button type="submit" loading={isSubmitting || (isPromised && loading)}>
            {t("common.save")}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
};

export default EditOrderTripStatusModal;
