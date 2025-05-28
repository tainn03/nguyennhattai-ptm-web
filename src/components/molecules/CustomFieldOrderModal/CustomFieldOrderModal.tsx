"use client";

import { CustomFieldType, Prisma } from "@prisma/client";
import { Formik, FormikHelpers, FormikProps } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import * as yup from "yup";

import { ModalActions, ModalContent, ModalHeader, SkeletonDescriptionProperty } from "@/components/atoms";
import { Button, Modal } from "@/components/molecules";
import { CustomField } from "@/components/organisms";
import { initialFormValues, OrderInputForm } from "@/forms/order";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { updateOrderMeta } from "@/services/client/order";
import { AnyObject, ErrorType, YubObjectSchema } from "@/types";
import { Meta } from "@/types/customField";
import { CustomFieldInfo } from "@/types/strapi";
import { generateCustomFieldMeta, processingCustomField } from "@/utils/customField";

type CustomFieldOrderModalProps = {
  open: boolean;
  onSave: () => void;
  onClose: () => void;
};

export const CustomFieldOrderModal = ({ open, onSave, onClose }: CustomFieldOrderModalProps) => {
  const t = useTranslations();
  const { userId } = useAuth();
  const { showNotification } = useNotification();
  const { order } = useOrderState();

  const [validationSchema, setValidationSchema] = useState<YubObjectSchema<OrderInputForm>>();
  const [isCustomFieldLoaded, setIsCustomFieldLoaded] = useState(false);

  const formikRef = useRef<FormikProps<OrderInputForm>>(null);
  const orderRef = useRef<OrderInputForm>();

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSubmitFormik = useCallback(
    async (values: Meta, formikHelpers: FormikHelpers<Meta>) => {
      const customFields = orderRef.current?.customFields as CustomFieldInfo[];
      const { meta } = processingCustomField<Meta>(customFields, values);
      const result = await updateOrderMeta({
        id: orderRef.current?.id,
        meta: meta as Prisma.JsonObject,
        updatedById: userId,
      });

      if (result.error) {
        let message = "";
        switch (result.error) {
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive");
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown");
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
          message: t("common.message.save_success_message", { name: t("custom_field.input_group_title") }),
        });
      }

      onSave();
      formikHelpers.setSubmitting(false);
    },
    [userId, onSave, showNotification, t]
  );

  /**
   * Callback function to handle the loading of custom fields.
   *
   * @param schema - The YubObjectSchema of the customer input form.
   * @param customFields - An array of custom field information.
   */
  const handleCustomFieldLoaded = useCallback(
    (schema: YubObjectSchema<AnyObject>, customFields: CustomFieldInfo[]) => {
      setValidationSchema(yup.object({ ...schema }));
      const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(customFields, order?.meta);
      orderRef.current = { ...orderRef.current, ...order, customFields };

      formikRef.current?.resetForm({
        values: {
          lastUpdatedAt: orderRef.current?.updatedAt,
          prevCustomFields: customFieldMetaFileList,
          ...customFieldMeta,
        },
      });
      setIsCustomFieldLoaded(true);
    },
    [order]
  );

  return (
    <Modal open={open} size="3xl" showCloseButton onClose={handleClose} allowOverflow>
      <Formik
        innerRef={formikRef}
        initialValues={initialFormValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSubmitFormik}
      >
        {({ isSubmitting, handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            <ModalHeader title={t("custom_field.input_group_title")} />
            <ModalContent className="grid grid-cols-6 gap-x-6 gap-y-4">
              {!isCustomFieldLoaded &&
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={`skeleton-description-property-${index}`} className="col-span-full">
                    <SkeletonDescriptionProperty />
                  </div>
                ))}
              <CustomField type={CustomFieldType.ORDER} onLoaded={handleCustomFieldLoaded} />
            </ModalContent>
            <ModalActions align="right">
              <Button
                type="button"
                variant="outlined"
                color="secondary"
                disabled={!isCustomFieldLoaded}
                onClick={handleClose}
              >
                {t("common.cancel")}
              </Button>
              <Button disabled={!isCustomFieldLoaded} type="submit" loading={isSubmitting}>
                {t("common.save")}
              </Button>
            </ModalActions>
          </form>
        )}
      </Formik>
    </Modal>
  );
};
export default CustomFieldOrderModal;
