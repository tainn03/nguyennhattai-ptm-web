"use client";

import { OrganizationRoleType } from "@prisma/client";
import { FormikHelpers, getIn, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AddressInformation,
  Authorization,
  Button,
  Combobox,
  InputGroup,
  PageHeader,
  PasswordField,
  RadioGroup,
  Select,
  TextField,
} from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { SelectItem } from "@/components/molecules/Select/Select";
import { ConfirmModal, NewDriverModal } from "@/components/organisms";
import { OrganizationMemberInputForm, organizationMemberInputFormSchema } from "@/forms/organizationMember";
import { useDriverOptions, useOrganizationRoleOptions, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useMaintenanceTypeState } from "@/redux/states";
import { getDriverIdByOrganizationMember } from "@/services/client/driver";
import { getOrganizationMember } from "@/services/client/organizationMember";
import { BreadcrumbItem } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { ScreenMode } from "@/types/form";
import { LocaleType } from "@/types/locale";
import { DriverInfo, OrganizationMemberInfo, OrganizationRoleInfo } from "@/types/strapi";
import { post, put } from "@/utils/api";
import { getFullName, isOrganizationOwner } from "@/utils/auth";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { moveDisabledToBottom } from "@/utils/sort";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

// Set init value
const initialFormValues: OrganizationMemberInputForm = {
  screenMode: "NEW",
  isOwnerOrYou: false,
  role: {
    id: undefined,
  },
  driverId: undefined,
  username: "",
  email: "",
  phoneNumber: "",
  description: "",
  isActive: true,
  member: {
    password: "",
    detail: {
      lastName: "",
      firstName: "",
      address: {
        country: {
          code: "",
          name: "",
        },
        city: {
          code: "",
          name: "",
        },
        district: {
          code: "",
          name: "",
        },
        ward: {
          code: "",
          name: "",
        },
        addressLine1: "",
      },
    },
  },
  confirmPassword: "",
};

export type OrganizationMembersFormProps = OrgPageProps & {
  screenMode: ScreenMode;
  id?: number | null;
  encryptedId?: string | null;
};

const MemberForm = ({
  org,
  orgId,
  orgLink,
  user,
  userId,
  screenMode,
  id,
  encryptedId,
}: OrganizationMembersFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();

  const { canEdit, canEditOwn } = usePermission("organization-member");
  const { canNew: canNewDriver } = usePermission("driver");
  const { searchQueryString } = useMaintenanceTypeState();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const { organizationRoles } = useOrganizationRoleOptions({ organizationId: orgId });
  const [isNewDriverModalOpen, setIsNewDriverModalOpen] = useState(false);
  const [awaitFetchData, setAwaitFetchData] = useState(true);
  const organizationMembersRef = useRef<OrganizationMemberInfo>();

  const { drivers, isLoading: isDriverOptionsLoading, mutate } = useDriverOptions({ organizationId: orgId });

  /**
   * Checks if the provided provided id of user member isn't you.
   *
   * @param memberId - The id of member to check.
   * @returns {boolean} - `true` if the organization member is the owner; otherwise, `false`.
   */
  const isNotYou = useCallback(
    (memberId?: number) => {
      return !equalId(userId, memberId);
    },
    [userId]
  );

  const organizationRoleOptions: SelectItem[] = useMemo(
    () =>
      organizationRoles.map((item: OrganizationRoleInfo) => ({
        label: item.name,
        value: ensureString(item.id),
        type: item.type,
      })),
    [organizationRoles]
  );

  const fullName = useMemo(
    () =>
      getFullName(
        organizationMembersRef.current?.member.detail?.firstName,
        organizationMembersRef.current?.member.detail?.lastName,
        user.setting.locale as LocaleType
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [organizationMembersRef.current]
  );

  // Get the screen mode of form
  const [newMode, editMode] = useMemo(() => [screenMode === "NEW", screenMode === "EDIT"], [screenMode]);

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    const payload: BreadcrumbItem[] = [
      { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
      { name: t("org_setting_member.title"), link: `${orgLink}/settings/members${searchQueryString}` },
    ];

    if (newMode) {
      payload.push({ name: t("common.new"), link: `${orgLink}/settings/members/new` });
    }

    if (editMode) {
      payload.push({
        name: fullName || values?.username || `${encryptedId}`,
        link: `${orgLink}/settings/members/${encryptedId}/edit`,
      });
    }

    setBreadcrumb(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationMembersRef.current, orgLink, searchQueryString]);

  const statusOptions: RadioItem[] = useMemo(
    () => [
      { value: "true", label: t("org_setting_member.status_active") },
      { value: "false", label: t("org_setting_member.status_inactive") },
    ],
    [t]
  );

  /**
   * Handles form submission for creating or editing organization members.
   *
   * @param {OrganizationMemberInputForm} values - Form values submitted by the user.
   * @param {FormikHelpers<OrganizationMemberInputForm>} formikHelpers - Formik helper functions for manipulation.
   * @returns {Promise<void>}
   */
  const handleSubmitFormik = useCallback(
    async (values: OrganizationMemberInputForm, formikHelpers: FormikHelpers<OrganizationMemberInputForm>) => {
      let result: ApiResult<number>;

      const { confirmPassword: _, member, ...otherEntities } = values;
      if (editMode && organizationMembersRef.current?.id) {
        result = await put<ApiResult<number>>(`/api${orgLink}/settings/members/${encryptedId}/edit`, {
          ...otherEntities,
          member: {
            id: member?.id,
            password: member?.password,
            detail: {
              id: member?.detail?.id,
              firstName: member?.detail?.firstName,
              lastName: member?.detail?.lastName,
              address: member?.detail?.address,
            },
          },
        });
      } else {
        result = await post<ApiResult>(`/api${orgLink}/settings/members/new`, {
          ...otherEntities,
          member,
        });
      }
      formikHelpers.setSubmitting(false);

      if (result.status === HttpStatusCode.Conflict) {
        formikHelpers.setFieldError(ensureString(result.code), ensureString(result.message));
        return;
      }

      const name = getFullName(member?.detail?.firstName, member?.detail?.lastName, user.setting.locale as LocaleType);
      if (result.status === HttpStatusCode.Ok) {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name }),
        });
        router.push(`${orgLink}/settings/members${searchQueryString}`);
      } else {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("common.message.save_error_unknown", { name }),
        });
      }
    },
    [editMode, encryptedId, orgLink, router, searchQueryString, showNotification, t, user.setting.locale]
  );

  const {
    values,
    errors,
    dirty,
    touched,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFieldValue,
    resetForm,
    getFieldMeta,
  } = useFormik({
    initialValues: initialFormValues,
    validationSchema: organizationMemberInputFormSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  /**
   * This function fetches user data based on the provided userId and updates the profile information state.
   * It checks if a userId is available before making the request to get user data.
   */
  const fetchOrganizationMember = useCallback(async () => {
    if (id) {
      const result = await getOrganizationMember(orgId, Number(id));
      const isOwner = isOrganizationOwner(org, result?.member);
      const isYou = !isNotYou(result?.member.id);
      const isOwnerOrYou = isOwner || isYou ? true : false;
      const isDriver = result?.role?.type === OrganizationRoleType.DRIVER;
      let driver = null;
      if (isDriver) {
        driver = await getDriverIdByOrganizationMember({
          organization: { id: orgId },
          member: { id: result?.member.id },
        });
      }
      if (result) {
        organizationMembersRef.current = result;
        resetForm({
          values: {
            ...values,
            ...result,
            role: {
              ...values.role,
              ...result.role,
            },
            ...(isDriver && { driverId: Number(driver?.id) }),
            ...(isOwner && {
              username: result.username || result.member.username || "",
              email: result.email || result.member.email || "",
              phoneNumber: result.phoneNumber || result.member.phoneNumber || "",
            }),
            isOwnerOrYou,
            screenMode: "EDIT",
          },
        });
      } else {
        showNotification({
          color: "error",
          title: t("common.message.data_not_found_title"),
          message: t("common.message.data_not_found_message"),
        });
        if (editMode) {
          router.push(`${orgLink}/settings/members${searchQueryString}`);
        }
      }
    }
    setAwaitFetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const driverOptions: ComboboxItem[] = useMemo(
    () =>
      moveDisabledToBottom(
        drivers.map((item: DriverInfo) => ({
          value: ensureString(item.id),
          label: getFullName(item.firstName, item.lastName),
          subLabel: item.vehicle?.vehicleNumber,
          disabled: !!item.user && !equalId(item.user.id, values?.member?.id),
        }))
      ),
    [drivers, values?.member?.id]
  );

  /**
   * Fetching maintenance type data when in edit or copy mode.
   */
  useEffect(() => {
    if (editMode) {
      fetchOrganizationMember();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * This function is a callback that handles the radio change event.
   * It sets the "gender" field value to the radio.
   *
   * @param item - The selected item to set in the form field.
   */
  const handleActiveChange = useCallback(
    (item: RadioItem) => {
      setFieldValue("isActive", item.value === "true");
    },
    [setFieldValue]
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

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
   * Navigate back to the previous page.
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

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

  /**
   * Handles the change of role for an organization member.
   * This function is triggered when the user selects a new role for a member.
   * It sends a request to the server to update the role of the specified organization member.
   *
   * @param value - The new role value selected by the user.
   */
  const handleRoleChange = useCallback(
    (value: string) => {
      const newRole = organizationRoles.find((item) => equalId(item.id, value));
      setFieldValue("role", newRole ? { id: newRole.id, type: newRole.type } : null);

      const isAdmin = organizationRoles.some(
        (item) => equalId(item.id, value) && item.type === OrganizationRoleType.ADMIN
      );
      setFieldValue("isAdmin", isAdmin);

      const isDriver = organizationRoles.some(
        (item) => equalId(item.id, value) && item.type === OrganizationRoleType.DRIVER
      );
      if (!isDriver) {
        setFieldValue("driverId", null);
      }
    },
    [organizationRoles, setFieldValue]
  );

  /**
   * Handles the change event when the selected driver is changed in the form.
   *
   * @param {string} value - The new value representing the selected driver.
   */
  const handleDriverChange = useCallback(
    (value: string) => {
      setFieldValue("driverId", value ? Number(value) : null);
    },
    [setFieldValue]
  );

  /**
   * Closes the modal for adding a new driver.
   */
  const handleCloseNewDriverModal = useCallback(() => {
    setIsNewDriverModalOpen(false);
  }, []);

  /**
   * Opens the modal for adding a new driver.
   */
  const handleOpenNewDriverModal = useCallback(() => {
    setIsNewDriverModalOpen(true);
  }, []);

  /**
   * Handles the submission of the new driver modal, updates the form values, and triggers a data re-fetch.
   *
   * @param {number} id - The ID of the newly added driver.
   */
  const handleSubmitNewDriverModal = useCallback(
    (id: number) => {
      setIsNewDriverModalOpen(false);
      mutate();
      setFieldValue("driverId", id);
    },
    [mutate, setFieldValue]
  );

  return (
    <Authorization
      showAccessDenied
      resource="organization-member"
      action={["new", "edit", "edit-own"]}
      type="oneOf"
      isAccessDenied={
        !awaitFetchData &&
        editMode &&
        !canEdit() &&
        canEditOwn() &&
        !equalId(organizationMembersRef.current?.createdByUser?.id, userId)
      }
    >
      <form className="space-y-4" method="POST" onSubmit={handleSubmit}>
        <PageHeader
          title={t("org_setting_member.title")}
          description={t("org_setting_member.title_description")}
          actionHorizontal
          actionComponent={actionComponent}
        />

        <div className="space-y-12">
          <InputGroup
            title={t("org_setting_member.account_info_title")}
            description={t("org_setting_member.account_info_description")}
          >
            <div className="sm:col-span-3">
              <TextField
                required
                label={t("org_setting_member.last_name")}
                id="lastName"
                name="member.detail.lastName"
                type="text"
                onChange={handleChange}
                value={values.member?.detail?.lastName || ""}
                maxLength={255}
                errorText={formatError(
                  t,
                  getIn(touched, "member.detail.lastName") && getIn(errors, "member.detail.lastName")
                )}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                required
                label={t("org_setting_member.first_name")}
                id="firstName"
                name="member.detail.firstName"
                type="text"
                onChange={handleChange}
                value={values.member?.detail?.firstName || ""}
                maxLength={255}
                errorText={formatError(
                  t,
                  getIn(touched, "member.detail.firstName") && getIn(errors, "member.detail.firstName")
                )}
              />
            </div>

            <div className="sm:col-span-2">
              <TextField
                required
                label={t("org_setting_member.username")}
                id="username"
                name="username"
                type="text"
                onChange={handleChange}
                value={values.username || ""}
                maxLength={255}
                errorText={formatError(t, touched.username && errors.username)}
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="email" className="relative block text-sm font-medium leading-6 text-gray-900">
                {t("org_setting_member.email")}
              </label>
              <div className="mt-2 flex flex-row items-end gap-x-3">
                <TextField
                  id="email"
                  name="email"
                  value={ensureString(values.email)}
                  onChange={handleChange}
                  errorText={formatError(t, touched.email && errors.email)}
                  className="w-full"
                />
              </div>
            </div>
            {!isOrganizationOwner(org, values?.member) && isNotYou(values?.member?.id) && (
              <>
                <div className="sm:col-span-2">
                  <Select
                    required
                    label={t("org_setting_member.role")}
                    items={organizationRoleOptions}
                    value={ensureString(values.role?.id)}
                    onChange={handleRoleChange}
                    errorText={formatError(t, getIn(touched, "role.id") && getIn(errors, "role.id"))}
                  />
                </div>
                {values.role?.type === OrganizationRoleType.DRIVER && (
                  <div className="sm:col-span-3">
                    <Combobox
                      label={t("org_setting_member.driver")}
                      items={driverOptions}
                      required
                      value={ensureString(values.driverId)}
                      loading={isDriverOptionsLoading}
                      onChange={handleDriverChange}
                      placeholder={t("vehicle.select_driver")}
                      newButtonText={canNewDriver() ? t("vehicle.new_driver") : undefined}
                      onNewButtonClick={canNewDriver() ? handleOpenNewDriverModal : undefined}
                      emptyLabel={t("vehicle.none_select_label_driver")}
                      errorText={formatError(t, touched.driverId && errors.driverId)}
                    />
                  </div>
                )}
              </>
            )}

            <div className="col-span-full">
              <TextField
                showCount
                maxLength={500}
                label={t("org_setting_member.description")}
                id="description"
                name="description"
                multiline
                onChange={handleChange}
                value={values.description || ""}
                errorText={formatError(t, touched.description && errors.description)}
              />
            </div>

            {!isOrganizationOwner(org, values?.member) && isNotYou(values?.member?.id) && (
              <div className="col-span-full">
                <RadioGroup
                  label={t("org_setting_member.status")}
                  name="isActive"
                  items={statusOptions}
                  value={ensureString(values?.isActive)}
                  onChange={handleActiveChange}
                />
              </div>
            )}
          </InputGroup>
          <InputGroup
            title={t("org_setting_member.password_title")}
            description={editMode && t("org_setting_member.password_description")}
          >
            <div className="sm:col-span-full">
              <PasswordField
                required={newMode}
                label={t("org_setting_member.password")}
                id="password"
                name="member.password"
                onChange={handleChange}
                value={values.member?.password || ""}
                maxLength={255}
                errorText={formatError(t, getIn(touched, "member.password") && getIn(errors, "member.password"))}
              />
            </div>

            <div className="sm:col-span-full">
              <PasswordField
                required={newMode}
                label={t("org_setting_member.confirm_password")}
                id="confirmPassword"
                name="confirmPassword"
                onChange={handleChange}
                value={values.confirmPassword}
                maxLength={255}
                errorText={formatError(t, touched.confirmPassword && errors.confirmPassword)}
              />
            </div>
          </InputGroup>

          <InputGroup
            id="contact-information"
            title={t("org_setting_member.contact_title")}
            description={t("org_setting_member.contact_description")}
          >
            <div className="sm:col-span-2 sm:col-start-1">
              <TextField
                label={t("org_setting_member.phone_number")}
                id="phoneNumber"
                name="phoneNumber"
                type="text"
                value={ensureString(values?.phoneNumber)}
                onChange={handleChange}
                errorText={formatError(t, touched.phoneNumber && errors.phoneNumber)}
              />
            </div>

            <AddressInformation
              parentName="member.detail.address"
              address={values.member?.detail?.address}
              setFieldValue={setFieldValue}
              getFieldMeta={getFieldMeta}
            />
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

      {/* New Driver Modal */}
      <NewDriverModal
        orgId={orgId}
        orgLink={orgLink}
        open={isNewDriverModalOpen}
        onClose={handleCloseNewDriverModal}
        onSubmit={handleSubmitNewDriverModal}
      />
    </Authorization>
  );
};

export default MemberForm;
