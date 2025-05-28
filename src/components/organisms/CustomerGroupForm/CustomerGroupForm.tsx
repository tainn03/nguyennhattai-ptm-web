"use client";

import { OrganizationRoleType } from "@prisma/client";
import { FormikHelpers, getIn, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createCustomerGroup, updateCustomerGroup } from "@/actions/customerGroup";
import { Authorization, Button, Combobox, InputGroup, PageHeader, RadioGroup, TextField } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { ConfirmModal } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { CustomerGroupInputForm, customerGroupInputFormSchema } from "@/forms/customerGroup";
import { useOrganizationMemberOptionsByRoles, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useDriverExpenseState } from "@/redux/states";
import { getCustomerGroup } from "@/services/client/customerGroup";
import { BreadcrumbItem, ErrorType } from "@/types";
import { ScreenMode } from "@/types/form";
import { MutationResult } from "@/types/graphql";
import { CustomerGroupInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

const initialFormValues: CustomerGroupInputForm = {
  name: "",
  description: "",
  isActive: true,
  manager: {
    id: undefined,
  },
};

export type CustomerGroupFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const CustomerGroupForm = ({ screenMode, id, orgId, orgLink, userId, encryptedId }: CustomerGroupFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { searchQueryString } = useDriverExpenseState();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const { canEdit, canEditOwn } = usePermission("customer-group");
  const [awaitFetchData, setAwaitFetchData] = useState(true);
  const customerGroupRef = useRef<CustomerGroupInputForm>();

  const { organizationMembers } = useOrganizationMemberOptionsByRoles({
    organization: { id: orgId },
    roles: [OrganizationRoleType.DISPATCH_MANAGER],
  });

  const orgMemberOptions: ComboboxItem[] = useMemo(
    () =>
      organizationMembers.map((item) => ({
        value: ensureString(item.id),
        label: getFullName(item.member.detail?.firstName, item.member.detail?.lastName),
        imageSrc: item.member.detail?.avatar?.url,
      })),
    [organizationMembers]
  );
  // Get the screen mode of form
  const [newMode, editMode, copyMode] = useMemo(
    () => [screenMode === "NEW", screenMode === "EDIT", screenMode === "NEW" && id],
    [id, screenMode]
  );

  const isActiveOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("customer_group.status_active") },
      { value: "false", label: t("customer_group.status_inactive") },
    ],
    [t]
  );

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    const payload: BreadcrumbItem[] = [
      { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
      { name: t("customer_group.title"), link: `${orgLink}/customer-groups${searchQueryString}` },
    ];
    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/customer-groups/new` });
    }
    if (editMode) {
      payload.push({
        name: customerGroupRef.current?.name || `${encryptedId}`,
        link: `${orgLink}/customer-groups/${encryptedId}/edit`,
      });
    }
    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerGroupRef.current?.name, orgLink]);

  /**
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Handles the submission of a driver report form using Formik.
   *
   * @param {CustomerGroupInputForm} values - The form values representing a driver report.
   * @param {FormikHelpers<CustomerGroupInputForm>} formikHelpers - Formik form helpers.
   * @returns {Promise<void>} A promise that handles driver report creation or update.
   */
  const handleSubmitFormik = useCallback(
    async (values: CustomerGroupInputForm, formikHelpers: FormikHelpers<CustomerGroupInputForm>) => {
      // Check if it's a new driver report or an update
      let result: MutationResult<Partial<CustomerGroupInfo>> | undefined;
      if (newMode) {
        result = await createCustomerGroup({ ...values, organizationId: orgId, createdById: userId });
      } else if (customerGroupRef.current?.id) {
        result = await updateCustomerGroup(
          { ...values, organizationId: orgId, id: customerGroupRef.current.id, updatedById: userId },
          customerGroupRef.current.updatedAt
        );
      }

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }

      if (result.error) {
        // Handle different error types
        switch (result.error) {
          case ErrorType.EXISTED:
            formikHelpers.setFieldError("name", errorExists("customer_group.name"));
            return;
          case ErrorType.UNKNOWN:
            // Show an error notification
            showNotification({
              color: "error",
              title: t("common.message.save_error_title"),
              message: t("common.message.save_error_unknown", { name: values.name }),
            });
            break;
        }
      } else {
        // Show a success notification and navigate to the driver reports page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.name }),
        });

        setItemString(SESSION_FLASHING_ID, ensureString(result.data?.id), {
          security: false,
        });
        router.push(`${orgLink}/customer-groups${searchQueryString}`);
      }
    },
    [newMode, orgId, userId, showNotification, t, router, orgLink, searchQueryString]
  );

  const { values, touched, errors, dirty, isSubmitting, handleChange, handleSubmit, setFieldValue, resetForm } =
    useFormik({
      initialValues: initialFormValues,
      validationSchema: customerGroupInputFormSchema,
      enableReinitialize: true,
      onSubmit: handleSubmitFormik,
    });

  /**
   * Fetching driver report data when in edit or copy mode.
   * If the data is found, it sets the driver report initial the form with the retrieved values.
   * If the data is not found, it shows a notification and redirects the user to the driver reports settings page.
   */
  const fetchCustomerGroup = useCallback(async () => {
    if (!id) {
      setAwaitFetchData(false);
      return;
    }

    const result = await getCustomerGroup(orgId, id);
    setAwaitFetchData(false);

    if (result) {
      customerGroupRef.current = result;
      resetForm({
        values: result,
      });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.data_not_found_title"),
        message: t("common.message.data_not_found_message"),
      });
      if (editMode) {
        router.push(`${orgLink}/customer-groups${searchQueryString}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetching driver report data when in edit or copy mode.
   */
  useEffect(() => {
    if (editMode || copyMode) {
      fetchCustomerGroup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Show confirmation to the user before leaving the page if there are unsaved changes.
   */
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = t("common.cancel_message");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty, t]);

  /**
   * Handle the cancel button click event. If there are unsaved changes (dirty),
   * it opens a confirmation dialog. Otherwise, it navigates back to the previous page.
   */
  const handleCancelClick = useCallback(() => {
    if (dirty) {
      setIsCancelConfirmOpen(true);
    } else {
      router.back();
    }
  }, [dirty, router]);

  /**
   * Handle the cancellation of confirmation dialog.
   */
  const handleCancel = useCallback(() => {
    setIsCancelConfirmOpen(false);
  }, []);

  /**
   * Callback function for handling changes in the radio group.
   *
   * @param name - The name of the radio group.
   * @param item - The radio item that is selected.
   * @returns A callback function that handles the change event of the radio group.
   */
  const handleRadioChange = useCallback(
    (name: string) => (item: RadioItem) => setFieldValue(name, item.value === "true"),
    [setFieldValue]
  );

  /**
   * Handle changes to select inputs in a form.
   *
   * @param {string} name - The name of the select input.
   * @param {string} value - The selected value.
   */
  const handleManagerChange = useCallback(
    (value: string) => {
      setFieldValue("manager.id", Number(value));
    },
    [setFieldValue]
  );

  const actionComponent = useMemo(
    () => (
      <div className="flex flex-row justify-end gap-x-4">
        <Button type="button" variant="outlined" onClick={handleCancelClick} disabled={isSubmitting}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    ),
    [handleCancelClick, isSubmitting, t]
  );

  return (
    <Authorization
      showAccessDenied
      resource="customer-group"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        !awaitFetchData &&
        editMode &&
        !canEdit() &&
        canEditOwn() &&
        !equalId(customerGroupRef.current?.createdByUser?.id, userId)
      }
    >
      <form method="POST" onSubmit={handleSubmit}>
        <PageHeader
          title={t("customer_group.title")}
          description={t("customer_group.title_description")}
          actionHorizontal
          actionComponent={actionComponent}
        />
        <div className="space-y-12">
          <InputGroup title={t("customer_group.general_title")}>
            <div className="sm:col-span-3">
              <TextField
                label={t("customer_group.name")}
                name="name"
                value={values.name}
                required
                maxLength={255}
                onChange={handleChange}
                errorText={formatError(t, touched.name && errors.name)}
              />
            </div>
            <div className="sm:col-span-3">
              <Combobox
                label={t("customer_group.manager")}
                required
                showAvatar
                items={orgMemberOptions}
                value={ensureString(values.manager?.id)}
                placeholder={t("customer_group.manager_placeholder")}
                onChange={handleManagerChange}
                errorText={formatError(t, getIn(touched, "manager.id") && getIn(errors, "manager.id"))}
              />
            </div>
            <div className="col-span-full">
              <TextField
                label={t("customer_group.description")}
                name="description"
                value={ensureString(values.description)}
                multiline
                rows={4}
                maxLength={500}
                showCount
                onChange={handleChange}
                errorText={formatError(t, touched.description && errors.description)}
              />
            </div>
            <div className="col-span-full">
              <RadioGroup
                label={t("customer_group.status")}
                name="isActive"
                items={isActiveOptions}
                value={ensureString(values.isActive)}
                onChange={handleRadioChange("isActive")}
              />
            </div>
          </InputGroup>
        </div>

        <div className="mt-4 max-sm:px-4">{actionComponent}</div>
      </form>

      {/* Cancel confirmation dialog */}
      <ConfirmModal
        open={isCancelConfirmOpen}
        icon="question"
        title={t("common.confirmation.cancel_title")}
        message={t("common.confirmation.cancel_message")}
        onClose={handleCancel}
        onCancel={handleCancel}
        onConfirm={goBack}
      />
    </Authorization>
  );
};

export default CustomerGroupForm;
