"use client";

import { Gender } from "@prisma/client";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AddressInformation, Avatar, Button, DatePicker, InputGroup, TextField } from "@/components/molecules";
import RadioGroup, { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { avatarOptions } from "@/configs/media";
import { ProfileForm, profileFormSchema } from "@/forms/userProfile";
import { useAuth } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useAppState } from "@/redux/states";
import { updateAddressInformation } from "@/services/client/addressInformation";
import { getUser, updateUserAndUserDetail } from "@/services/client/user";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { UserDetailInfo } from "@/types/strapi";
import { post, postForm } from "@/utils/api";
import { isOrganizationOwner as checkIsOrganizationOwner } from "@/utils/auth";
import { getAccountInfo } from "@/utils/auth";
import { withAuth } from "@/utils/client";
import { bytesToSize, getFileExtension } from "@/utils/file";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

const initialFormValues: ProfileForm = {
  avatarName: "",
  avatarUrl: "",
  email: "",
  emailVerified: false,
  phoneNumber: "",
  detail: {
    id: 0,
    lastName: "",
    firstName: "",
    gender: Gender.UNKNOWN,
    dateOfBirth: null,
    description: "",
    address: {
      country: {
        id: 0,
        code: "",
        name: "",
      },
      city: {
        id: 0,
        code: "",
        name: "",
      },
      district: {
        id: 0,
        code: "",
        name: "",
      },
      ward: {
        id: 0,
        code: "",
        name: "",
      },
      addressLine1: "",
    },
  },
};

const AVATAR_ALLOWED_FILE_TYPES = avatarOptions.fileTypes.map((item) => `*${item}`.toLowerCase()).join(", ");

export default withAuth(({ userId, user }) => {
  const t = useTranslations();
  const { organizationMember } = useAppState();
  const { reloadUserProfile } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();

  const [profileInfo, setProfileInfo] = useState<ProfileForm | undefined>(user);
  const [isAvatarProcessing, setIsAvatarProcessing] = useState(false);

  const accountInfo = useMemo(() => getAccountInfo(profileInfo), [profileInfo]);
  const isOrganizationOwner = useMemo(
    () => checkIsOrganizationOwner(organizationMember?.organization, profileInfo),
    [organizationMember, profileInfo]
  );

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    setBreadcrumb([
      { name: t("user_profile.account"), link: "/users/profile" },
      { name: t("user_profile.title"), link: "/users/profile" },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const genderOptions: RadioItem[] = useMemo(
    () => [
      { value: Gender.MALE, label: t("user_profile.gender_male") },
      { value: Gender.FEMALE, label: t("user_profile.gender_female") },
      { value: Gender.UNKNOWN, label: t("user_profile.gender_unknown") },
    ],
    [t]
  );

  /**
   * This function handles the form submission when the user updates their profile information.
   * It performs the following steps:
   * 1. If an avatar file is selected, it uploads the file and retrieves its file ID.
   * 2. It updates the user's phone number.
   * 3. It updates the user's detail information, including the avatar file ID if applicable.
   * 4. It updates the user's address information.
   * 5. It displays a success notification.
   *
   * @param values - The form values containing user profile information.
   */
  const handleSubmitFormik = useCallback(
    async (values: ProfileForm, formikHelpers: FormikHelpers<ProfileForm>) => {
      if (values.avatarName) {
        const { status, message } = await post<ApiResult>("/api/users/profile/upload", {
          fileName: values.avatarName,
          userDetailId: profileInfo?.detail?.id,
        });
        if (status !== 200) {
          showNotification({
            color: "error",
            message,
          });
          return;
        }
      }

      const { detail } = values;
      await updateUserAndUserDetail(
        userId,
        Number(profileInfo?.detail?.id),
        values,
        Number(organizationMember?.id),
        isOrganizationOwner
      );
      const address = profileInfo?.detail?.address;
      const result = await updateAddressInformation(
        Number(address?.id),
        userId,
        detail?.address?.country?.id,
        detail?.address?.city?.id,
        detail?.address?.district?.id,
        detail?.address?.ward?.id,
        ensureString(detail?.address?.addressLine1)
      );

      formikHelpers.setSubmitting(false);
      if (result) {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("user_profile.save_success_message"),
        });
        formikHelpers.setFieldValue("avatarName", "");
        reloadUserProfile();
        return;
      }

      showNotification({
        color: "error",
        title: t("common.message.save_error_title"),
        message: t("user_profile.save_error_message"),
      });
    },
    [
      isOrganizationOwner,
      organizationMember?.id,
      profileInfo?.detail?.address,
      profileInfo?.detail?.id,
      reloadUserProfile,
      showNotification,
      t,
      userId,
    ]
  );

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFieldValue,
    setFieldError,
    resetForm,
    getFieldMeta,
  } = useFormik({
    initialValues: initialFormValues,
    validationSchema: profileFormSchema,
    enableReinitialize: true,
    onSubmit: handleSubmitFormik,
  });

  /**
   * This function fetches user data based on the provided userId and updates the profile information state.
   * It checks if a userId is available before making the request to get user data.
   */
  const fetchUser = async () => {
    if (userId) {
      const userData = await getUser(userId);
      userData && setProfileInfo(userData);
    }
  };

  /**
   * This effect is triggered when the 'profileInfo' prop changes.
   * It updates the form values with user profile information, including email, phone number,
   * email verification status, user detail, and user address if available.
   *
   * @param profileInfo - User profile information.
   */
  useEffect(() => {
    if (profileInfo) {
      const { email, phoneNumber, emailVerified } = profileInfo;

      const detail = profileInfo.detail as UserDetailInfo;
      resetForm({
        values: {
          email: (isOrganizationOwner ? email : organizationMember?.email) || "",
          phoneNumber:
            (isOrganizationOwner ? organizationMember?.phoneNumber || phoneNumber : organizationMember?.phoneNumber) ||
            "",
          emailVerified: !!emailVerified,

          // user detail
          detail,
          avatarUrl: detail?.avatar?.url || "",
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileInfo]);

  // init value
  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /**
   * This function is a callback that handles avatar file selection and upload.
   * It performs checks for file extension and size, updates the form's avatar URL,
   * and uploads the selected file to the server.
   *
   * @param event - The change event triggered by the file input element.
   */
  const handlerAvatarChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.target instanceof HTMLInputElement && event.target.files) {
        const file = event.target.files[0];

        // Check file extension
        const ext = getFileExtension(file.name);
        if (!avatarOptions.fileTypes.includes(ext)) {
          setFieldError("avatarName", t("error.file_types", { types: AVATAR_ALLOWED_FILE_TYPES }));
          return false;
        }

        // Check file size
        if (file.size > avatarOptions.maxFileSize) {
          setFieldError("avatarName", t("error.file_size", { size: bytesToSize(avatarOptions.maxFileSize) }));
          return false;
        }

        setFieldValue("avatarUrl", URL.createObjectURL(file));

        setIsAvatarProcessing(true);
        const { data, status } = await postForm<ApiResult>("/api/upload", { file, type: "AVATAR" });
        setIsAvatarProcessing(false);
        if (status === HttpStatusCode.Ok) {
          setFieldValue("avatarName", data.fileName);
        }
      }
    },
    [setFieldError, setFieldValue, t]
  );

  /**
   * This function is a callback that handles the date change event.
   * It sets the "dateOfBirth" field value to the selected date.
   *
   * @param date - The selected date to set in the form field.
   */
  const handlerGenderChange = useCallback(
    (item: RadioItem) => {
      setFieldValue("detail.gender", item.value as Gender);
    },
    [setFieldValue]
  );

  /**
   * This function is a callback that handles the date change event.
   * It sets the "dateOfBirth" field value to the selected date.
   *
   * @param date - The selected date to set in the form field.
   */
  const handleDateChange = useCallback(
    (date: Date) => {
      setFieldValue("detail.dateOfBirth", date);
    },
    [setFieldValue]
  );

  return (
    <form className="space-y-4" method="POST" onSubmit={handleSubmit}>
      <div className="space-y-12">
        <InputGroup title={t("user_profile.title")} description={t("user_profile.title_description")}>
          <div className="col-span-full">
            <label htmlFor="avatar" className="block text-sm font-medium leading-6 text-gray-900">
              {t("user_profile.avatar")}
            </label>
            <div className="mt-2 flex items-center gap-x-3 md:gap-x-6">
              <Avatar
                size="xlarge"
                displayName={values.avatarName || accountInfo.displayName}
                avatarURL={values.avatarUrl || accountInfo.avatar}
              />
              <div>
                <label
                  htmlFor="avatar"
                  className="cursor-pointer rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  <span>{t("user_profile.change_avatar")}</span>
                  <TextField
                    id="avatar"
                    type="file"
                    accept={avatarOptions.fileTypes.join(",")}
                    className="sr-only"
                    onChange={handlerAvatarChange}
                  />
                </label>
                <p className="mt-3 text-xs text-gray-500">
                  {t("user_profile.avatar_description", {
                    fileTypes: AVATAR_ALLOWED_FILE_TYPES,
                    maxFileSize: bytesToSize(avatarOptions.maxFileSize),
                  })}
                </p>
                <TextField type="hidden" name="avatarName" value={values.avatarName ?? ""} />
              </div>
            </div>
            {errors.avatarName && <p className="mt-2 text-xs text-red-600 ">{errors.avatarName}</p>}
          </div>

          <div className="sm:col-span-3">
            <TextField
              required
              label={t("user_profile.last_name")}
              id="lastName"
              name="detail.lastName"
              type="text"
              onChange={handleChange}
              value={values.detail?.lastName || ""}
              maxLength={255}
              errorText={formatError(
                t,
                getFieldMeta("detail.lastName").touched && getFieldMeta("detail.lastName").error
              )}
            />
          </div>

          <div className="sm:col-span-2">
            <TextField
              required
              label={t("user_profile.first_name")}
              id="firstName"
              name="detail.firstName"
              type="text"
              onChange={handleChange}
              value={values.detail?.firstName || ""}
              maxLength={255}
              errorText={formatError(
                t,
                getFieldMeta("detail.firstName").touched && getFieldMeta("detail.firstName").error
              )}
            />
          </div>

          <div className="sm:col-span-2 sm:col-start-1">
            <DatePicker
              label={t("user_profile.date_of_birth")}
              id="dateOfBirth"
              name="detail.dateOfBirth"
              placeholder="DD/MM/YYYY"
              selected={values.detail?.dateOfBirth && new Date(values.detail?.dateOfBirth)}
              onChange={handleDateChange}
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="detail.gender" className="relative block text-sm font-medium leading-6 text-gray-900">
              {t("user_profile.gender")}
            </label>
            <div className="mt-2 flex flex-row items-end gap-x-3">
              <RadioGroup
                name="detail.gender"
                items={genderOptions}
                value={ensureString(values.detail?.gender || "UNKNOWN")}
                onChange={handlerGenderChange}
              />
            </div>
          </div>

          <div className="col-span-full">
            <TextField
              showCount
              maxLength={500}
              label={t("user_profile.description")}
              id="detail.description"
              name="detail.description"
              multiline
              onChange={handleChange}
              value={values.detail?.description || ""}
              helperText={t("user_profile.description_message")}
              errorText={formatError(
                t,
                getFieldMeta("detail.description").touched && getFieldMeta("detail.description").error
              )}
            />
          </div>
        </InputGroup>

        <InputGroup
          id="contact-information"
          title={t("user_profile.contact_title")}
          description={t("user_profile.contact_description")}
        >
          {(isOrganizationOwner || values.email) && (
            <div className="sm:col-span-4">
              <label htmlFor="phone" className="relative block text-sm font-medium leading-6 text-gray-900">
                {t("user_profile.email")}
                {/* {values?.emailVerified ? (
                <Badge color="success" label={t("user_profile.email_verified")} rounded className="ml-2" />
              ) : (
                <Badge color="error" label={t("user_profile.email_not_verified")} rounded className="ml-2" />
              )} */}
              </label>
              <div className="mt-2 flex flex-row items-end gap-x-3">
                <TextField
                  disabled
                  id="email"
                  name="email"
                  type="text"
                  value={ensureString(values.email)}
                  className="w-full"
                  helperText={isOrganizationOwner && t("user_profile.email_helper_text")}
                />
              </div>
            </div>
          )}

          <div className="sm:col-span-4 sm:col-start-1">
            <TextField
              label={t("user_profile.phone_number")}
              id="phoneNumber"
              name="phoneNumber"
              type="text"
              value={ensureString(values.phoneNumber)}
              onChange={handleChange}
              className="w-full"
              errorText={formatError(t, touched.phoneNumber && errors.phoneNumber)}
            />
          </div>

          <AddressInformation
            parentName="detail.address"
            address={values.detail?.address}
            setFieldValue={setFieldValue}
            getFieldMeta={getFieldMeta}
          />
        </InputGroup>
      </div>

      <div className="flex flex-row justify-end gap-x-4 max-sm:px-4">
        <Button type="submit" disabled={isAvatarProcessing} loading={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
});
