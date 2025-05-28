"use client";

import { OrganizationSettingOrderCodeGenerationType } from "@prisma/client";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import numeral from "numeral";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { Authorization, Button, InputGroup, NumberField, PageHeader } from "@/components/molecules";
import {
  CUSTOMER_CODE_PREFIX_MAX_LENGTH,
  CUSTOMER_CODE_PREFIX_MIN_LENGTH,
  ORDER_CODE_MAX_LENGTH,
  ORDER_CODE_MIN_LENGTH,
  ORDER_CODE_MIN_LENGTH_BY_ROUTE_CODE,
  ROUTE_CODE_PREFIX_MAX_LENGTH,
  ROUTE_CODE_PREFIX_MIN_LENGTH,
} from "@/constants/organizationSetting";
import { organizationOrderCodeSettingInputFormSchema, OrganizationSettingInputForm } from "@/forms/organizationSetting";
import { usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import {
  getOrganizationOrderCodeSetting,
  updateOrganizationOrderCodeSetting,
} from "@/services/client/organizationSetting";
import { ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { OrganizationSettingInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { formatError } from "@/utils/yup";

import { OrderCodeGenerationTypeRadio } from "./components";

const initialFormValues: OrganizationSettingInputForm = {
  orderCodeGenerationType: null,
  defaultTypeOrderCodeMaxLength: null,
  customerSpecificOrderCodeMaxLength: null,
  customerCodePrefixMaxLength: null,
  routeSpecificOrderCodeMaxLength: null,
  routeCodePrefixMaxLength: null,
};

export default withOrg(
  ({ orgLink, orgId }) => {
    const t = useTranslations();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const { canEdit } = usePermission("order-codes");

    const currentSettingRef = useRef<OrganizationSettingInfo>();

    /**
     * Sets breadcrumb links for general organization settings and the order code section.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("org_setting_order_code.title"), link: `${orgLink}/settings/order-codes` },
      ]);

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Handles the form submission for organization order code settings.
     *
     * @param {OrganizationSettingInputForm} values - Form values.
     * @param {FormikHelpers<OrganizationSettingInputForm>} formikHelpers - Formik helpers.
     */
    const handleSubmitFormik = useCallback(
      async (values: OrganizationSettingInputForm, formikHelpers: FormikHelpers<OrganizationSettingInputForm>) => {
        let result: MutationResult<OrganizationSettingInfo> | undefined;

        // Destructure relevant values
        const {
          defaultTypeOrderCodeMaxLength,
          customerSpecificOrderCodeMaxLength,
          customerCodePrefixMaxLength,
          routeSpecificOrderCodeMaxLength,
          routeCodePrefixMaxLength,
        } = values;
        if (currentSettingRef.current?.id) {
          const updatedSetting: Partial<OrganizationSettingInfo> = {
            id: currentSettingRef.current.id,
            orderCodeGenerationType: values.orderCodeGenerationType,
          };

          switch (values.orderCodeGenerationType) {
            case OrganizationSettingOrderCodeGenerationType.CUSTOMER_SPECIFIC:
              updatedSetting.orderCodeMaxLength = customerSpecificOrderCodeMaxLength;
              updatedSetting.customerCodePrefixMaxLength = customerCodePrefixMaxLength;
              break;

            case OrganizationSettingOrderCodeGenerationType.ROUTE_SPECIFIC:
              updatedSetting.orderCodeMaxLength = routeSpecificOrderCodeMaxLength;
              updatedSetting.routeCodePrefixMaxLength = routeCodePrefixMaxLength;
              break;
            default:
              updatedSetting.orderCodeMaxLength = defaultTypeOrderCodeMaxLength;
              break;
          }

          // Update organization order code setting
          result = await updateOrganizationOrderCodeSetting(updatedSetting, currentSettingRef.current?.updatedAt);
        }

        formikHelpers.setSubmitting(false);
        if (!result) {
          return;
        }

        if (result.error) {
          let message = "";
          // Handle different result scenarios
          switch (result.error) {
            case ErrorType.EXCLUSIVE:
              message = t("common.message.save_error_exclusive", { name: t("org_setting_order_code.feature") });
              break;
            case ErrorType.UNKNOWN:
              message = t("common.message.save_error_unknown", { name: t("org_setting_order_code.feature") });
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
          // Show a success notification
          showNotification({
            color: "success",
            title: t("common.message.save_success_title"),
            message: t("common.message.save_success_message", { name: t("org_setting_order_code.feature") }),
          });
        }
      },
      [showNotification, t]
    );

    const { values, touched, errors, isSubmitting, handleSubmit, handleChange, resetForm } = useFormik({
      initialValues: initialFormValues,
      validationSchema: organizationOrderCodeSettingInputFormSchema,
      onSubmit: handleSubmitFormik,
    });

    /**
     * Fetches and sets the organization order code setting.
     */
    const fetchOrganizationOrderCodeSetting = useCallback(async () => {
      // Fetch the organization order code setting
      const result = await getOrganizationOrderCodeSetting({ organizationId: orgId });

      if (result) {
        const { orderCodeGenerationType, orderCodeMaxLength, customerCodePrefixMaxLength, routeCodePrefixMaxLength } =
          result;
        currentSettingRef.current = result;
        // Reset the form with fetched values
        resetForm({
          values: {
            orderCodeGenerationType: orderCodeGenerationType || OrganizationSettingOrderCodeGenerationType.DEFAULT,
            defaultTypeOrderCodeMaxLength: orderCodeMaxLength || ORDER_CODE_MIN_LENGTH,
            customerSpecificOrderCodeMaxLength: orderCodeMaxLength || ORDER_CODE_MIN_LENGTH,
            customerCodePrefixMaxLength: customerCodePrefixMaxLength || CUSTOMER_CODE_PREFIX_MAX_LENGTH,
            routeSpecificOrderCodeMaxLength: orderCodeMaxLength || ORDER_CODE_MIN_LENGTH_BY_ROUTE_CODE,
            routeCodePrefixMaxLength: routeCodePrefixMaxLength || ROUTE_CODE_PREFIX_MAX_LENGTH,
          },
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      // Fetch the organization order code setting on component mount
      fetchOrganizationOrderCodeSetting();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Ensures that a numeric value is within a specified range.
     *
     * @param {number} min - The minimum value of the range.
     * @param {number} max - The maximum value of the range.
     * @param {string | number | null} value - The value to ensure within the range.
     * @returns {number} The value within the specified range.
     */
    const ensureWithinRange = useCallback((min: number, max: number, value?: string | number | null) => {
      const numericValue = numeral(value).value();
      if (numericValue === null || numericValue < min) {
        return min;
      }
      if (numericValue > max) {
        return max;
      }
      return numericValue;
    }, []);

    /**
     * Memoized action component for a form.
     * Displays a submit button with loading state.
     *
     * @type {JSX.Element} The memoized JSX element.
     */
    const actionComponent = useMemo(
      () => (
        <Authorization resource="order-codes" action="edit" alwaysAuthorized={canEdit()}>
          <Button type="submit" loading={isSubmitting}>
            {t("common.save")}
          </Button>
        </Authorization>
      ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [isSubmitting, t]
    );

    return (
      <>
        <form method="POST" onSubmit={handleSubmit}>
          <PageHeader
            title={t("org_setting_order_code.title")}
            description={t("org_setting_order_code.description")}
            actionHorizontal
            actionComponent={actionComponent}
          />
          <div className="space-y-12">
            <InputGroup
              title={t("org_setting_order_code.default_title")}
              description={
                <span className="whitespace-pre-wrap">
                  {t.rich("org_setting_order_code.default_description", {
                    strong: (chunks) => <span className="font-medium">{chunks}</span>,
                  })}
                </span>
              }
            >
              <div className="col-span-full">
                <OrderCodeGenerationTypeRadio
                  loading={!currentSettingRef.current}
                  label={t("org_setting_order_code.default_radio_label", {
                    length: ensureWithinRange(
                      ORDER_CODE_MIN_LENGTH,
                      ORDER_CODE_MAX_LENGTH,
                      values?.defaultTypeOrderCodeMaxLength
                    ),
                  })}
                  description={t("org_setting_order_code.default_radio_description", {
                    length: ensureWithinRange(
                      ORDER_CODE_MIN_LENGTH,
                      ORDER_CODE_MAX_LENGTH,
                      values?.defaultTypeOrderCodeMaxLength
                    ),
                  })}
                  orderCodeGenerationType={OrganizationSettingOrderCodeGenerationType.DEFAULT}
                  value={values?.orderCodeGenerationType}
                  name="orderCodeGenerationType"
                  onChange={handleChange("orderCodeGenerationType")}
                />
              </div>
              {values.orderCodeGenerationType === OrganizationSettingOrderCodeGenerationType.DEFAULT && (
                <div className="sm:col-span-3">
                  <NumberField
                    label={t("org_setting_order_code.order_code_length")}
                    required
                    name="defaultTypeOrderCodeMaxLength"
                    value={values?.defaultTypeOrderCodeMaxLength}
                    onChange={handleChange}
                    helperText={t("org_setting_order_code.length_helper_text", {
                      min: ORDER_CODE_MIN_LENGTH,
                      max: ORDER_CODE_MAX_LENGTH,
                    })}
                    errorText={formatError(
                      t,
                      touched.defaultTypeOrderCodeMaxLength && errors.defaultTypeOrderCodeMaxLength
                    )}
                  />
                </div>
              )}
            </InputGroup>

            <InputGroup
              title={t("org_setting_order_code.customer_specific_label")}
              description={
                <span className="whitespace-pre-wrap">
                  {t.rich("org_setting_order_code.customer_specific_description", {
                    strong: (chunks) => <span className="font-medium">{chunks}</span>,
                  })}
                </span>
              }
            >
              <div className="col-span-full">
                <OrderCodeGenerationTypeRadio
                  loading={!currentSettingRef.current}
                  label={t("org_setting_order_code.customer_specific_radio_label")}
                  description={t("org_setting_order_code.customer_specific_radio_description", {
                    customerPrefixLength: ensureWithinRange(
                      CUSTOMER_CODE_PREFIX_MIN_LENGTH,
                      CUSTOMER_CODE_PREFIX_MAX_LENGTH,
                      values?.customerCodePrefixMaxLength
                    ),
                  })}
                  value={values?.orderCodeGenerationType}
                  orderCodeGenerationType={OrganizationSettingOrderCodeGenerationType.CUSTOMER_SPECIFIC}
                  name="orderCodeGenerationType"
                  onChange={handleChange("orderCodeGenerationType")}
                />
              </div>

              {values.orderCodeGenerationType === OrganizationSettingOrderCodeGenerationType.CUSTOMER_SPECIFIC && (
                <>
                  <div className="sm:col-span-3">
                    <NumberField
                      label={t("org_setting_order_code.order_code_length")}
                      required
                      value={values?.customerSpecificOrderCodeMaxLength}
                      name="customerSpecificOrderCodeMaxLength"
                      onChange={handleChange}
                      helperText={t("org_setting_order_code.length_helper_text", {
                        min: ORDER_CODE_MIN_LENGTH,
                        max: ORDER_CODE_MAX_LENGTH,
                      })}
                      errorText={formatError(
                        t,
                        touched.customerSpecificOrderCodeMaxLength && errors.customerSpecificOrderCodeMaxLength
                      )}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <NumberField
                      label={t("org_setting_order_code.customer_code_prefix_length")}
                      required
                      value={values?.customerCodePrefixMaxLength}
                      name="customerCodePrefixMaxLength"
                      onChange={handleChange}
                      helperText={t("org_setting_order_code.length_helper_text", {
                        min: CUSTOMER_CODE_PREFIX_MIN_LENGTH,
                        max: CUSTOMER_CODE_PREFIX_MAX_LENGTH,
                      })}
                      errorText={formatError(
                        t,
                        touched.customerCodePrefixMaxLength && errors.customerCodePrefixMaxLength
                      )}
                    />
                  </div>
                </>
              )}
            </InputGroup>

            <InputGroup
              className="hidden"
              title={t("org_setting_order_code.route_specific_label")}
              description={
                <span className="whitespace-pre-wrap">
                  {t.rich("org_setting_order_code.route_specific_description", {
                    strong: (chunks) => <span className="font-medium">{chunks}</span>,
                  })}
                </span>
              }
            >
              <div className="col-span-full">
                <OrderCodeGenerationTypeRadio
                  loading={!currentSettingRef.current}
                  label={t("org_setting_order_code.route_specific_radio_label")}
                  description={t("org_setting_order_code.route_specific_radio_description", {
                    routePrefixLength: ensureWithinRange(
                      ROUTE_CODE_PREFIX_MIN_LENGTH,
                      ROUTE_CODE_PREFIX_MAX_LENGTH,
                      values?.routeCodePrefixMaxLength
                    ),
                  })}
                  value={values?.orderCodeGenerationType}
                  orderCodeGenerationType={OrganizationSettingOrderCodeGenerationType.ROUTE_SPECIFIC}
                  name="orderCodeGenerationType"
                  onChange={handleChange("orderCodeGenerationType")}
                />
              </div>

              {values.orderCodeGenerationType === OrganizationSettingOrderCodeGenerationType.ROUTE_SPECIFIC && (
                <>
                  <div className="sm:col-span-3">
                    <NumberField
                      label={t("org_setting_order_code.order_code_length")}
                      required
                      value={values?.routeSpecificOrderCodeMaxLength}
                      name="routeSpecificOrderCodeMaxLength"
                      onChange={handleChange}
                      helperText={t("org_setting_order_code.length_helper_text", {
                        min: ORDER_CODE_MIN_LENGTH_BY_ROUTE_CODE,
                        max: ORDER_CODE_MAX_LENGTH,
                      })}
                      errorText={formatError(
                        t,
                        touched.routeSpecificOrderCodeMaxLength && errors.routeSpecificOrderCodeMaxLength
                      )}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <NumberField
                      label={t("org_setting_order_code.route_code_prefix_length")}
                      required
                      value={values?.routeCodePrefixMaxLength}
                      name="routeCodePrefixMaxLength"
                      onChange={handleChange}
                      helperText={t("org_setting_order_code.length_helper_text", {
                        min: ROUTE_CODE_PREFIX_MIN_LENGTH,
                        max: ROUTE_CODE_PREFIX_MAX_LENGTH,
                      })}
                      errorText={formatError(t, touched.routeCodePrefixMaxLength && errors.routeCodePrefixMaxLength)}
                    />
                  </div>
                </>
              )}
            </InputGroup>
          </div>
        </form>
      </>
    );
  },
  {
    resource: "order-codes",
    action: ["find"],
  }
);
