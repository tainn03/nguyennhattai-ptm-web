"use client";

import { CustomFieldType } from "@prisma/client";
import { Formik, FormikHelpers, FormikProps } from "formik";
import { useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import * as yup from "yup";

import { ModalActions, ModalContent, ModalHeader, SkeletonCardHeader } from "@/components/atoms";
import { Button, Modal } from "@/components/molecules";
import { CustomField } from "@/components/organisms";
import { initialFormValues, OrderRouteStatusInputForm } from "@/forms/orderRouteStatus";
import { YubObjectSchema } from "@/types";
import { CustomFieldInfo } from "@/types/strapi";
import { generateCustomFieldMeta, processingCustomField } from "@/utils/customField";
import { deleteProperties } from "@/utils/object";

type FixedRouteStatusModalProps = {
  open: boolean;
  routePointId: number;
  orderRouteStatus?: OrderRouteStatusInputForm;
  loading?: boolean;
  onClose: () => void;
  onSave: (values: OrderRouteStatusInputForm) => void;
};

const FixedRouteStatusModal = ({
  open,
  routePointId,
  orderRouteStatus,
  loading,
  onSave,
  onClose,
}: FixedRouteStatusModalProps) => {
  const t = useTranslations();
  const [validationSchema, setValidationSchema] = useState<YubObjectSchema<OrderRouteStatusInputForm>>();
  const [isCustomFieldLoaded, setIsCustomFieldLoaded] = useState(false);

  const formikRef = useRef<FormikProps<OrderRouteStatusInputForm>>(null);
  const orderRouteStatusRef = useRef<OrderRouteStatusInputForm>();

  useEffect(() => {
    if (open && isCustomFieldLoaded) {
      const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
        orderRouteStatusRef.current?.customFields as CustomFieldInfo[],
        orderRouteStatus?.meta
      );

      orderRouteStatusRef.current = {
        ...orderRouteStatusRef.current,
        ...(orderRouteStatus?.id && { id: orderRouteStatus.id }),
        ...customFieldMeta,
      };

      formikRef.current?.resetForm({
        values: {
          ...formikRef.current?.values,
          ...(orderRouteStatus?.id && { id: orderRouteStatus.id }),
          ...customFieldMeta,
          prevCustomFields: customFieldMetaFileList,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isCustomFieldLoaded]);

  const handleSubmitFormik = useCallback(
    async (values: OrderRouteStatusInputForm, formikHelper: FormikHelpers<OrderRouteStatusInputForm>) => {
      const customFields: CustomFieldInfo[] = orderRouteStatusRef.current?.customFields as CustomFieldInfo[];
      const processedValues = processingCustomField<OrderRouteStatusInputForm>(
        customFields as CustomFieldInfo[],
        deleteProperties(values, ["prevCustomFields", "customFields"])
      );
      onSave({ ...processedValues, routePoint: { id: routePointId } });
      formikHelper.setSubmitting(false);
    },
    [onSave, routePointId]
  );

  const handleClose = useCallback(() => {
    formikRef.current?.resetForm({ values: initialFormValues });
    onClose();
  }, [onClose]);

  const handleCustomFieldLoaded = useCallback(
    (schema: YubObjectSchema<OrderRouteStatusInputForm>, customFields: CustomFieldInfo[]) => {
      setValidationSchema(yup.object({ ...schema }));
      orderRouteStatusRef.current = { ...orderRouteStatusRef.current, customFields };
      setIsCustomFieldLoaded(true);
    },
    []
  );

  return (
    <Modal open={open} size="xl" showCloseButton onClose={handleClose} allowOverflow>
      <Formik
        onSubmit={handleSubmitFormik}
        innerRef={formikRef}
        initialValues={initialFormValues}
        validationSchema={validationSchema}
      >
        {({ isSubmitting, handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            <ModalHeader title={t("custom_field.input_group_title")} />
            <ModalContent className="grid grid-cols-6 gap-x-6 gap-y-4">
              {!isCustomFieldLoaded &&
                open &&
                Array.from({ length: 6 }).map((_, index) => (
                  <div className="col-span-full" key={`skeleton-route-point-modal-${index}`}>
                    <SkeletonCardHeader />
                    <div role="status" className="animate-pulse space-y-2.5 py-3">
                      <div className="h-2.5 w-full rounded-full bg-gray-300 dark:bg-gray-600" />
                    </div>
                  </div>
                ))}
              {open && <CustomField type={CustomFieldType.ROUTE_POINT} onLoaded={handleCustomFieldLoaded} />}
            </ModalContent>
            <ModalActions align="right">
              <Button
                type="button"
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

export default memo(FixedRouteStatusModal);
