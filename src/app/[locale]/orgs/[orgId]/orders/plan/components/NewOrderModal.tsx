"use client";

import { CustomerType, CustomFieldType, RouteType } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";
import { Formik, FormikHelpers, FormikProps } from "formik";
import { useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import * as yup from "yup";

import { CustomerCard, OrderCard } from "@/app/[locale]/orgs/[orgId]/orders/new/components";
import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Modal } from "@/components/molecules";
import { CustomField } from "@/components/organisms";
import { orderDraftInputFormSchema, OrderInputForm, orderInputFormSchema } from "@/forms/order";
import { useAuth } from "@/hooks";
import { useDispatch, useNotification } from "@/redux/actions";
import { ORDER_UPDATE_NEW_ORDER_DATE } from "@/redux/types";
import { createOrder } from "@/services/client/order";
import { ErrorType, YubObjectSchema } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { CustomFieldInfo } from "@/types/strapi";
import { generateCustomFieldMeta, processingCustomField } from "@/utils/customField";
import { formatDate } from "@/utils/date";
import { deleteProperties } from "@/utils/object";
import { errorExists } from "@/utils/yup";

const initialFormValues: OrderInputForm = {
  customerId: null,
  routeId: null,
  customer: {
    id: 0,
    type: CustomerType.FIXED,
    name: "",
    code: "",
    taxCode: null,
    email: null,
    phoneNumber: null,
    website: null,
    businessAddress: null,
    contactName: null,
    contactPosition: null,
    contactEmail: null,
    contactPhoneNumber: null,
    isActive: true,
    description: null,
    bankAccount: {
      accountNumber: null,
      holderName: null,
      bankName: null,
      bankBranch: null,
      description: null,
    },
  },
  route: {
    id: 0,
    type: RouteType.FIXED,
    code: "",
    name: "",
    description: null,
    isActive: true,
    pickupPoints: [],
    deliveryPoints: [],
    distance: null,
    price: null,
    subcontractorCost: null,
    driverCost: null,
    bridgeToll: null,
    otherCost: null,
  },
  orderDate: undefined,
  deliveryDate: null,
  unit: {
    id: 0,
  },
  weight: null,
  totalAmount: null,
  paymentDueDate: null,
  notes: null,
  merchandiseTypes: [],
  merchandiseNote: null,
  isDraft: false,
};

type NewOrderModalProps = {
  open: boolean;
  onClose: () => void;
  onDismiss: () => void;
  onSave?: (id?: number) => void;
  orderDate?: Date;
};

const NewOrderModal = ({ open, onSave, onClose, orderDate = new Date() }: NewOrderModalProps) => {
  const t = useTranslations();
  const dispatch = useDispatch();
  const { orgId, userId, orgLink } = useAuth();
  const { showNotification } = useNotification();
  const formikRef = useRef<FormikProps<OrderInputForm>>(null);
  const orderRef = useRef<OrderInputForm>();
  const [validationSchema, setValidationSchema] = useState<YubObjectSchema<OrderInputForm>>(orderInputFormSchema);

  const [isDraft, setIsDraft] = useState(formikRef.current?.values.isDraft);

  const handleClose = useCallback(() => {
    formikRef.current?.resetForm({ values: initialFormValues });
    onClose && onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSubmitFormik = useCallback(
    async (values: OrderInputForm, formikHelpers: FormikHelpers<OrderInputForm>) => {
      const customFields: CustomFieldInfo[] = orderRef.current?.customFields as CustomFieldInfo[];
      const { customer, customerId, customerCode, route, routeId, participants, ...otherEntities } =
        processingCustomField<OrderInputForm>(
          customFields,
          deleteProperties(values, ["trips", "statuses", "updatedAt"])
        );

      const result = await createOrder(orgLink, {
        ...otherEntities,
        ...(customer?.type === CustomerType.FIXED && {
          customer: { id: customerId, code: customerCode, type: customer.type },
        }),
        ...(customer?.type === CustomerType.CASUAL && { customer: { ...customer, id: 0 } }),
        ...(route?.type === RouteType.FIXED && { route: { id: routeId, type: route.type } }),
        ...(route?.type === RouteType.NON_FIXED && { route: { ...deleteProperties(route, ["code"]), id: 0 } }),
        participants: participants?.map((item) => ({ user: { id: item.user?.id }, role: item.role })),
      } as OrderInputForm);

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }
      if (result.status === HttpStatusCode.Ok) {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("order.save_draft_success_message"),
        });
        formikHelpers.resetForm({ values: initialFormValues });

        // Trigger update data in other screens
        dispatch<Date>({
          type: ORDER_UPDATE_NEW_ORDER_DATE,
          payload: orderDate,
        });

        onSave && onSave();
      } else {
        let message = "";
        switch (result.message) {
          case `${ErrorType.EXISTED}-${values.customer?.code}`:
            message = errorExists("order_new.customer_id");
            formikHelpers.setFieldError("customer.code", message);
            return;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_exclusive", { name: values.code });
            break;
          default:
            break;
        }

        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message,
        });
      }
      handleClose();
    },
    [dispatch, handleClose, onSave, orderDate, orgLink, showNotification, t]
  );

  const handleSetDraft = useCallback(() => {
    setIsDraft(true);
    formikRef.current?.setFieldValue("isDraft", true);
  }, []);

  const handleSaveNew = useCallback(() => {
    setIsDraft(false);
    formikRef.current?.setFieldValue("isDraft", false);
  }, []);

  const handleCustomFieldLoaded = useCallback(
    (schema: YubObjectSchema<OrderInputForm>, customFields: CustomFieldInfo[]) => {
      setValidationSchema(yup.object({ ...schema }).concat(orderInputFormSchema));
      orderRef.current = { ...orderRef.current, customFields };

      // Handle get meta data for custom field
      const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
        orderRef.current?.customFields as CustomFieldInfo[]
      );
      formikRef.current?.resetForm({
        values: {
          ...formikRef.current?.values,
          ...customFieldMeta,
          orderDate: startOfDay(orderDate) || startOfDay(new Date()),
          deliveryDate: endOfDay(orderDate) || endOfDay(new Date()),
          prevCustomFields: customFieldMetaFileList,
        },
      });
    },
    [orderDate]
  );

  return (
    <>
      <Modal open={open} onClose={handleClose} size="7xl" showCloseButton allowOverflow>
        <Formik
          innerRef={formikRef}
          initialValues={initialFormValues}
          validationSchema={isDraft ? orderDraftInputFormSchema : validationSchema}
          enableReinitialize
          onSubmit={handleSubmitFormik}
        >
          {({ isSubmitting, handleSubmit }) => {
            return (
              <form method="POST" onSubmit={handleSubmit}>
                <ModalHeader
                  title={t("order_new.title", {
                    date: formatDate(orderDate, t("common.format.date")),
                  })}
                />
                <ModalContent>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                    <CustomerCard orgId={Number(orgId)} orgLink={orgLink} userId={Number(userId)} />
                    <OrderCard>
                      <CustomField
                        variant="card"
                        title={t("custom_field.input_group_title")}
                        type={CustomFieldType.ORDER}
                        onLoaded={handleCustomFieldLoaded}
                      />
                    </OrderCard>
                  </div>
                </ModalContent>
                <ModalActions>
                  <Button onClick={handleClose} variant="text" type="button" color="secondary" disabled={isSubmitting}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="outlined"
                    type="submit"
                    loading={isDraft && isSubmitting}
                    disabled={!isDraft && isSubmitting}
                    onClick={handleSetDraft}
                  >
                    {t("order_new.save_draft")}
                  </Button>
                  <Button
                    type="submit"
                    loading={!isDraft && isSubmitting}
                    disabled={!isDraft && isSubmitting}
                    onClick={handleSaveNew}
                  >
                    {t("order_new.save")}
                  </Button>
                </ModalActions>
              </form>
            );
          }}
        </Formik>
      </Modal>
    </>
  );
};

export default memo(NewOrderModal);
