"use client";

import { CustomerType, CustomFieldDataType, CustomFieldType, RouteType } from "@prisma/client";
import { Formik, FormikHelpers, FormikProps } from "formik";
import { useAtom } from "jotai";
import isEmpty from "lodash/isEmpty";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as yup from "yup";

import { Authorization, Button, PageHeader } from "@/components/molecules";
import { CustomField } from "@/components/organisms";
import {
  initialFormValues,
  orderDraftInputFormSchema,
  OrderInputForm,
  orderInputFormSchema,
  UpdateOrderInputForm,
} from "@/forms/order";
import { useOrgSettingExtendedStorage, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { createOrder, getOrder, updateOrder } from "@/services/client/order";
import { orderGroupAtom } from "@/states";
import { BreadcrumbItem, ErrorType, YubObjectSchema } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { CustomFieldInfo } from "@/types/strapi";
import { OrgPageProps, withOrg } from "@/utils/client";
import { generateCustomFieldMeta, processingCustomField } from "@/utils/customField";
import { equalId } from "@/utils/number";
import { deleteProperties } from "@/utils/object";
import { ensureString, isFalse, isTrue } from "@/utils/string";
import { errorExists } from "@/utils/yup";

import { CustomerCard, OrderCard } from "./components";

export default withOrg(
  ({ orgId, orgLink, userId }: OrgPageProps) => {
    const t = useTranslations();
    const router = useRouter();
    const { setBreadcrumb } = useBreadcrumb();
    const searchParams = useSearchParams();
    const { searchQueryString } = useOrderState();
    const copyId = searchParams.get("copyId");
    const orderId = searchParams.get("orderId");
    const { canEditOwn } = usePermission("order");
    const { showNotification } = useNotification();
    const { orderConsolidationEnabled } = useOrgSettingExtendedStorage();
    const formikRef = useRef<FormikProps<OrderInputForm>>(null);
    const orderRef = useRef<OrderInputForm>();

    const [{ baseSearchQueryString }] = useAtom(orderGroupAtom);
    const [isCustomFieldLoaded, setIsCustomFieldLoaded] = useState(false);
    const [validationSchema, setValidationSchema] = useState<YubObjectSchema<OrderInputForm>>(orderInputFormSchema);
    const [isDraft, setIsDraft] = useState(formikRef.current?.values.isDraft);

    useEffect(() => {
      const payload: BreadcrumbItem[] = [
        { name: t("order.management"), link: orgLink },
        ...(isFalse(orderConsolidationEnabled)
          ? [{ name: t("order.title"), link: `${orgLink}/orders${searchQueryString}` }]
          : [{ name: t("order.title"), link: `${orgLink}/order-groups/base${baseSearchQueryString}` }]),
      ];
      if (orderId) {
        payload.push({ name: orderId, link: `${orgLink}/orders/new?orderId=${orderId}` });
      } else {
        payload.push({ name: t("common.new"), link: `${orgLink}/orders/new` });
      }
      setBreadcrumb(payload);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const fetchOrder = useCallback(async () => {
      if (!copyId && !orderId) {
        const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
          orderRef.current?.customFields as CustomFieldInfo[],
          null
        );

        orderRef.current = { ...orderRef.current, ...customFieldMeta };
        formikRef.current?.resetForm({
          values: {
            ...initialFormValues,
            ...customFieldMeta,
            prevCustomFields: customFieldMetaFileList,
          },
        });
        return;
      }

      const code = copyId || orderId;
      const isEditMode = isTrue(!copyId && !!orderId);
      const result = await getOrder(orgId, ensureString(code), isEditMode);

      if (result) {
        const { customer, route, paymentDueDate, unit, participants, meta, updatedAt: _, ...otherProps } = result;
        // Handle get meta data for custom field
        const [customFieldMeta, customFieldMetaFileList] = generateCustomFieldMeta(
          orderRef.current?.customFields as CustomFieldInfo[],
          meta
        );
        orderRef.current = { ...orderRef.current, ...result, ...customFieldMeta };

        if (copyId) {
          const customFields = (orderRef.current?.customFields || []) as CustomFieldInfo[];
          const fieldFiles = customFields.filter((field) => field.dataType === CustomFieldDataType.FILE);

          if (fieldFiles.length > 0) {
            fieldFiles.map((fieldFile) => {
              customFieldMeta[fieldFile.id] = null;
            });
          }
        }
        formikRef.current?.setValues({
          ...formikRef.current?.values,
          ...initialFormValues,
          ...otherProps,
          ...(customer?.type === CustomerType.FIXED && {
            customerId: customer.id,
            customerCode: customer.code,
            customer: { type: customer.type, ...initialFormValues.customer },
          }),
          ...(customer?.type === CustomerType.CASUAL && {
            customer: { ...deleteProperties(customer, ["id", "code"]) },
          }),
          ...(route?.type === RouteType.FIXED && {
            routeId: route.id,
            route: { type: route.type, ...initialFormValues.route },
          }),
          ...(route?.type === RouteType.NON_FIXED && {
            route: isEmpty(route)
              ? initialFormValues.route
              : {
                  ...deleteProperties(route, ["id", "code"]),
                  pickupPoints: (route.pickupPoints || []).map((point) => ({
                    ...point,
                    ...(!isEditMode && { tempId: point.id, id: undefined }),
                  })),
                  deliveryPoints: (route.deliveryPoints || []).map((point) => ({
                    ...point,
                    ...(!isEditMode && { tempId: point.id, id: undefined }),
                  })),
                },
          }),
          ...(paymentDueDate && { paymentDueDate: new Date(paymentDueDate) }),
          ...(copyId && { isDraft: false, code: "" }),
          ...(!copyId && { participants }),
          unit: isEmpty(unit) ? initialFormValues.unit : unit,
          routeStatuses: (otherProps.routeStatuses || []).map((status) => ({
            ...status,
            ...(!isEditMode &&
              route?.type === RouteType.NON_FIXED && { routePoint: { tempId: status.routePoint?.id, id: undefined } }),
          })),
          statuses: [],
          trips: [],
          ...customFieldMeta,
          prevCustomFields: customFieldMetaFileList,
        });
      } else {
        showNotification({
          color: "error",
          title: t("common.message.data_not_found_title"),
          message: t("common.message.data_not_found_message"),
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (isCustomFieldLoaded) {
        fetchOrder();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCustomFieldLoaded]);

    /**
     * This function sends a POST request to the server to save the order data.
     *
     * @param {OrderInputForm} values - The form values to be submitted.
     * @param {FormikHelpers<OrderInputForm>} formikHelpers - Formik form helper functions.
     */
    const handleSubmitFormik = useCallback(
      async (values: OrderInputForm, formikHelpers: FormikHelpers<OrderInputForm>) => {
        let result: ApiResult<string> | undefined;
        const customFields: CustomFieldInfo[] = orderRef.current?.customFields as CustomFieldInfo[];
        const { customer, customerId, customerCode, route, routeId, participants, ...otherEntities } =
          processingCustomField<OrderInputForm>(
            customFields,
            deleteProperties(values, ["trips", "statuses", "updatedAt", "createdByUser"])
          );

        if (orderId && orderRef.current?.id) {
          result = await updateOrder(orgLink, {
            ...otherEntities,
            ...(customer?.type === CustomerType.FIXED && {
              customer: { id: customerId, code: customerCode, type: customer.type },
            }),
            ...(customer?.type === CustomerType.CASUAL && { customer }),
            ...(route?.type === RouteType.FIXED && { route: { id: routeId, type: route.type } }),
            ...(route?.type === RouteType.NON_FIXED && {
              route: { ...route, code: orderRef.current?.route?.type === RouteType.NON_FIXED ? route?.code : "" },
            }),
            id: Number(orderRef.current?.id),
            participants: participants?.map((item) => ({ user: { id: item.user?.id }, role: item.role })),
            lastUpdatedAt: orderRef.current?.updatedAt,
            lastCustomer: {
              id: orderRef.current?.customer?.id,
              type: orderRef.current?.customer?.type,
            },
            lastRoute: {
              id: orderRef.current?.route?.id,
              type: orderRef.current?.route?.type,
            },
          } as UpdateOrderInputForm);
        } else {
          result = await createOrder(orgLink, {
            ...otherEntities,
            ...(customer?.type === CustomerType.FIXED && {
              customer: { id: customerId, code: customerCode, type: customer.type },
            }),
            ...(customer?.type === CustomerType.CASUAL && { customer: { ...customer, id: 0 } }),
            ...(route?.type === RouteType.FIXED && { route: { id: routeId, type: route.type, code: route.code } }),
            ...(route?.type === RouteType.NON_FIXED && { route: { ...deleteProperties(route, ["code"]), id: 0 } }),
            participants: participants?.map((item) => ({ user: { id: item.user?.id }, role: item.role })),
          } as OrderInputForm);
        }

        // Check if it's a new order or an update
        formikHelpers.setSubmitting(false);
        if (!result) {
          return;
        }

        if (result.status !== HttpStatusCode.Ok) {
          // Handle different code types
          let messageInfo = "";
          switch (result.message) {
            case "CUSTOMER":
              messageInfo = errorExists("order.customer");
              formikHelpers.setFieldError("customer.code", messageInfo);
              return;
            case ErrorType.EXCLUSIVE:
              messageInfo = t("common.message.save_error_exclusive", { name: orderRef.current?.code });
              break;
            case ErrorType.UNKNOWN:
              messageInfo = t("common.message.save_error_unknown", { name: values?.code || values?.orderDate });
              break;
            default:
              break;
          }

          // Show an error notification
          showNotification({
            color: "error",
            title: t("common.message.save_error_title"),
            message: messageInfo,
          });
        } else {
          // Show a success notification and navigate to the order page
          showNotification({
            color: "success",
            title: t("common.message.save_success_title"),
            message: t("common.message.save_success_message", { name: result.data }),
          });
          const orderCode = isDraft ? "" : `/${result.data}`;
          router.push(`${orgLink}/orders${orderCode}`);
        }
      },
      [isDraft, orderId, orgLink, router, showNotification, t]
    );

    /**
     * Handles the action to save the form data as a draft.
     * This function sets the "isDraft" field in the form to true and triggers form submission.
     */
    const handleSetDraft = useCallback(() => {
      setIsDraft(true);
      formikRef.current?.setFieldValue("isDraft", true);
    }, []);

    /**
     * Handles the action to save the form data as a new order.
     * This function sets the "isDraft" field in the form to false and triggers form submission.
     */
    const handleSaveNew = useCallback(() => {
      setIsDraft(false);
      formikRef.current?.setFieldValue("isDraft", false);
    }, []);

    /**
     * Handles the action to cancel the form.
     * This function navigates to the order page.
     */
    const handleCancel = useCallback(() => {
      router.push(`${orgLink}/orders`);
    }, [orgLink, router]);

    /**
     * Callback function to handle the loading of custom fields.
     *
     * @param schema - The YubObjectSchema of the customer input form.
     * @param customFields - An array of custom field information.
     */
    const handleCustomFieldLoaded = useCallback(
      (schema: YubObjectSchema<OrderInputForm>, customFields: CustomFieldInfo[]) => {
        setValidationSchema(yup.object({ ...schema }).concat(orderInputFormSchema));
        orderRef.current = { ...orderRef.current, customFields };
        setIsCustomFieldLoaded(true);
      },
      []
    );

    return (
      <>
        <PageHeader title={t("order.create_order_title")} />
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
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                  <CustomerCard orgId={orgId} orgLink={orgLink} userId={userId} />
                  <OrderCard>
                    <CustomField
                      variant="card"
                      title={t("custom_field.input_group_title")}
                      type={CustomFieldType.ORDER}
                      onLoaded={handleCustomFieldLoaded}
                    />
                  </OrderCard>
                </div>

                <div className="mt-6 flex items-center justify-end gap-x-6 border-t border-gray-900/10 pt-6">
                  <Button onClick={handleCancel} variant="text" type="button" color="secondary" disabled={isSubmitting}>
                    {t("common.cancel")}
                  </Button>
                  <Authorization
                    resource="order"
                    action="edit"
                    alwaysAuthorized={
                      (!copyId && !orderId) || (canEditOwn() && equalId(orderRef.current?.createdByUser?.id, userId))
                    }
                  >
                    <Button
                      variant="outlined"
                      type="submit"
                      loading={isDraft && isSubmitting}
                      disabled={!isDraft && isSubmitting}
                      onClick={handleSetDraft}
                    >
                      {t("order_new.save_draft")}
                    </Button>
                  </Authorization>
                  <Authorization resource="order" action="new">
                    <Button
                      type="submit"
                      loading={!isDraft && isSubmitting}
                      onClick={handleSaveNew}
                      disabled={isDraft && isSubmitting}
                    >
                      {t("order_new.save")}
                    </Button>
                  </Authorization>
                </div>
              </form>
            );
          }}
        </Formik>
      </>
    );
  },
  {
    resource: "order",
    action: ["new", "edit", "edit-own"],
  }
);
