"use client";

import { CustomFieldType } from "@prisma/client";
import { Formik, FormikHelpers, FormikProps } from "formik";
import { useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import * as yup from "yup";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { AddressInformation, Button, InputGroup, Modal, TextField } from "@/components/molecules";
import { CustomField } from "@/components/organisms";
import { OrderRouteStatusInputForm } from "@/forms/orderRouteStatus";
import { RouteInputForm, RoutePointType } from "@/forms/route";
import { RoutePointInputForm, routePointModalSchema } from "@/forms/routePoint";
import { YubObjectSchema } from "@/types";
import { AddressInformationInfo, CustomFieldInfo } from "@/types/strapi";
import { generateCustomFieldMeta, processingCustomField } from "@/utils/customField";
import { deleteProperties } from "@/utils/object";
import { ensureString, randomUUID } from "@/utils/string";
import { formatError } from "@/utils/yup";

export const initialFormValues: RoutePointInputForm = {
  id: 0,
  code: "",
  name: "",
  notes: "",
  contactName: "",
  contactPhoneNumber: "",
  contactEmail: "",
  address: {
    country: {
      id: 0,
      name: "",
    },
    city: {
      id: 0,
      name: "",
    },
    district: {
      id: 0,
      name: "",
    },
    ward: {
      id: 0,
      name: "",
    },
    addressLine1: "",
  },
  displayOrder: 0,
};

export type RoutePointKey = "pickupPoints" | "deliveryPoints";

type NonFixedRouteStatusModalProps = {
  open: boolean;
  type: RoutePointType;
  loading?: boolean;
  routePoint?: RoutePointInputForm;
  orderRouteStatus?: OrderRouteStatusInputForm;
  onClose: () => void;
  onSave: (type: RoutePointType, route: RouteInputForm, orderRouteStatuses: OrderRouteStatusInputForm) => void;
};

const NonFixedRouteStatusModal = ({
  open,
  type,
  routePoint,
  orderRouteStatus,
  loading,
  onSave,
  onClose,
}: NonFixedRouteStatusModalProps) => {
  const t = useTranslations();

  const [validationSchema, setValidationSchema] = useState<YubObjectSchema<RoutePointInputForm>>(routePointModalSchema);
  const [isCustomFieldLoaded, setIsCustomFieldLoaded] = useState(false);

  const formikRef = useRef<FormikProps<RoutePointInputForm>>(null);
  const orderRouteStatusRef = useRef<OrderRouteStatusInputForm>();

  const handleSubmitFormik = useCallback(
    async (values: OrderRouteStatusInputForm, formikHelper: FormikHelpers<OrderRouteStatusInputForm>) => {
      const customFields: CustomFieldInfo[] = orderRouteStatusRef.current?.customFields as CustomFieldInfo[];
      const tempId = randomUUID();
      const { meta, ...point } = processingCustomField<OrderRouteStatusInputForm>(
        customFields as CustomFieldInfo[],
        deleteProperties(values, ["prevCustomFields", "customFields"])
      );

      const orderStatusInput: OrderRouteStatusInputForm = {
        ...(orderRouteStatus?.id && { id: orderRouteStatus.id }),
        ...(routePoint?.id && { routePoint: { id: routePoint.id } }),
        ...(!orderRouteStatus?.routePoint?.id && !orderRouteStatus?.routePoint?.tempId && { routePoint: { tempId } }),
        ...(!orderRouteStatus?.routePoint?.id &&
          !!orderRouteStatus?.routePoint?.tempId && { routePoint: { tempId: orderRouteStatus?.routePoint?.tempId } }),
        ...(meta && { meta }),
      };
      const pointInput: RoutePointInputForm = {
        ...(routePoint?.id && { id: routePoint.id }),
        ...(!routePoint?.id && !routePoint?.tempId && { tempId: tempId }),
        ...point,
      };

      onSave(type, pointInput, orderStatusInput);
      formikHelper.setSubmitting(false);
    },
    [
      onSave,
      orderRouteStatus?.id,
      orderRouteStatus?.routePoint?.id,
      orderRouteStatus?.routePoint?.tempId,
      routePoint?.id,
      routePoint?.tempId,
      type,
    ]
  );

  const handleCustomFieldLoaded = useCallback(
    (schema: YubObjectSchema<RoutePointInputForm>, customFields: CustomFieldInfo[]) => {
      setValidationSchema(yup.object({ ...schema }).concat(routePointModalSchema));
      orderRouteStatusRef.current = { ...orderRouteStatusRef.current, customFields };
      setIsCustomFieldLoaded(true);
    },
    []
  );

  const handleClose = useCallback(() => {
    formikRef.current?.resetForm({ values: initialFormValues });
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open && isCustomFieldLoaded && formikRef.current) {
      const metaData =
        orderRouteStatus?.routePoint?.id || orderRouteStatus?.routePoint?.tempId ? orderRouteStatus?.meta : null;

      const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
        orderRouteStatusRef.current?.customFields as CustomFieldInfo[],
        metaData
      );

      orderRouteStatusRef.current = {
        ...orderRouteStatusRef.current,
        ...(routePoint && { ...routePoint }),
        ...customFieldMeta,
      };

      formikRef.current?.resetForm({
        values: {
          ...formikRef.current?.values,
          ...(routePoint && { ...routePoint }),
          ...customFieldMeta,
          prevCustomFields: customFieldMetaFileList,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isCustomFieldLoaded, formikRef.current]);

  return (
    <Modal open={open} size="4xl" showCloseButton onClose={handleClose} onDismiss={handleClose}>
      <Formik
        innerRef={formikRef}
        initialValues={initialFormValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSubmitFormik}
      >
        {({ isSubmitting, values, touched, errors, handleSubmit, getFieldMeta, setFieldValue, handleChange }) => (
          <form onSubmit={handleSubmit}>
            <ModalHeader title={t("order.route_point_modal.title")} />
            <ModalContent className="space-y-12">
              <InputGroup
                title={t("order.route_point_modal.general_info")}
                description={t("order.route_point_modal.general_info_description")}
              >
                <div className="sm:col-span-2">
                  <TextField
                    label={t("order.route_point_modal.code")}
                    name="code"
                    required
                    maxLength={64}
                    value={ensureString(values.code)}
                    onChange={handleChange}
                    errorText={formatError(t, touched.code && errors.code)}
                  />
                </div>
                <div className="sm:col-span-4">
                  <TextField
                    label={t("order.route_point_modal.name")}
                    name="name"
                    maxLength={255}
                    value={ensureString(values.name)}
                    onChange={handleChange}
                    errorText={formatError(t, touched.name && errors.name)}
                  />
                </div>
                <div className="col-span-full">
                  <TextField
                    multiline
                    rows={3}
                    label={t("order.route_point_modal.notes")}
                    name="notes"
                    value={ensureString(values.notes)}
                    maxLength={255}
                    onChange={handleChange}
                    errorText={formatError(t, touched.notes && errors.notes)}
                  />
                </div>
              </InputGroup>
              <InputGroup
                title={t("order.route_point_modal.address_info")}
                description={t("order.route_point_modal.address_description")}
              >
                <AddressInformation
                  parentName="address"
                  address={values.address as Partial<AddressInformationInfo>}
                  setFieldValue={setFieldValue}
                  getFieldMeta={getFieldMeta}
                />
              </InputGroup>
              <InputGroup
                title={t("order.route_point_modal.contact_info")}
                description={t("order.route_point_modal.contact_description")}
              >
                <div className="sm:col-span-4">
                  <TextField
                    label={t("order.route_point_modal.contact_name")}
                    name="contactName"
                    maxLength={255}
                    value={ensureString(values.contactName)}
                    onChange={handleChange}
                    errorText={formatError(t, touched.contactName && errors.contactName)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <TextField
                    label={t("order.route_point_modal.contact_phone_number")}
                    name="contactPhoneNumber"
                    maxLength={20}
                    value={ensureString(values.contactPhoneNumber)}
                    onChange={handleChange}
                    errorText={formatError(t, touched.contactPhoneNumber && errors.contactPhoneNumber)}
                  />
                </div>
                <div className="sm:col-span-3">
                  <TextField
                    label={t("order.route_point_modal.contact_email")}
                    name="contactEmail"
                    maxLength={20}
                    value={ensureString(values.contactEmail)}
                    onChange={handleChange}
                    errorText={formatError(t, touched.contactEmail && errors.contactEmail)}
                  />
                </div>
              </InputGroup>
              <CustomField
                variant="input-group"
                title={t("custom_field.input_group_title")}
                showBorderBottom={false}
                type={CustomFieldType.ROUTE_POINT}
                onLoaded={handleCustomFieldLoaded}
              />
            </ModalContent>
            <ModalActions align="right">
              <Button
                variant="outlined"
                color="secondary"
                disabled={isSubmitting || !isCustomFieldLoaded || loading}
                onClick={handleClose}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={!isCustomFieldLoaded} loading={isSubmitting || loading}>
                {t("common.save")}
              </Button>
            </ModalActions>
          </form>
        )}
      </Formik>
    </Modal>
  );
};

export default memo(NonFixedRouteStatusModal);
