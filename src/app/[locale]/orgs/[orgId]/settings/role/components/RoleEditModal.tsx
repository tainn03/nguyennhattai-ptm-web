"use client";

import { Dialog, Transition } from "@headlessui/react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { OrganizationRoleType } from "@prisma/client";
import clsx from "clsx";
import { FormikHelpers, useFormik } from "formik";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { KeyedMutator } from "swr";

import { Checkbox } from "@/components/atoms";
import { Button, TextField } from "@/components/molecules";
import { OrganizationRoleInputForm, organizationRoleInputFormSchema } from "@/forms/organizationRole";
import { useResources } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { createOrganizationRole, updateOrganizationRole } from "@/services/client/organizationRole";
import { AnyObject, ErrorType } from "@/types";
import { MutationResult } from "@/types/graphql";
import { ActionType, Permission, ResourceType } from "@/types/permission";
import { OrganizationRoleInfo, ResourceInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";
import { errorExists, formatError } from "@/utils/yup";

export type RoleUpdateModalProps = {
  orgId: number;
  userId: number;
  open: boolean;
  orgRole?: OrganizationRoleInfo;
  mutate: KeyedMutator<OrganizationRoleInfo[]>;
  onClose?: () => void;
};

const initialFormValues: OrganizationRoleInputForm = {
  name: "",
  description: "",
  rolePermissions: {},
};

const RoleUpdateModal = ({ orgId, userId, open, orgRole, mutate, onClose }: RoleUpdateModalProps) => {
  const t = useTranslations();
  const { showNotification } = useNotification();
  const { resources } = useResources(orgId);
  const [keyword, setKeyword] = useState("");

  /**
   * Handle the form submission for creating or updating an organization role.
   * @param {OrganizationRoleInputForm} values - The form values.
   * @param {FormikHelpers<OrganizationRoleInputForm>} formikHelpers - Formik form helpers.
   */
  const handleSubmitFormik = useCallback(
    async (values: OrganizationRoleInputForm, formikHelpers: FormikHelpers<OrganizationRoleInputForm>) => {
      let result: MutationResult<OrganizationRoleInfo> | undefined;
      const { rolePermissions, ...organizationRole } = values;
      let permissions: Permission[] = [];

      if (orgRole?.type !== OrganizationRoleType.ADMIN) {
        permissions = Object.keys(rolePermissions)
          .filter((key) => {
            const [resource, _action] = key.split(".");
            delete rolePermissions[`${resource}._all`];
            return rolePermissions[key];
          })
          .map((key) => {
            const [resource, action] = key.split(".");
            return {
              resource: resource as ResourceType,
              action: action as ActionType,
            };
          });
      }

      // Check if it's a new organization role or an update
      if (!orgRole) {
        result = await createOrganizationRole({
          ...(organizationRole as OrganizationRoleInfo),
          permissions: permissions,
          organizationId: orgId,
          createdById: userId,
        });
      } else {
        if (orgRole?.id) {
          result = await updateOrganizationRole(
            {
              ...(organizationRole as OrganizationRoleInfo),
              permissions: permissions,
              organizationId: orgId,
              type: orgRole.type,
              id: Number(orgRole?.id),
              updatedById: userId,
            },
            orgRole?.updatedAt
          );
        }
      }

      formikHelpers.setSubmitting(false);
      if (!result) {
        return;
      }

      if (result.error) {
        // Handle different error types
        let message = "";
        switch (result.error) {
          case ErrorType.EXISTED:
            message = errorExists("org_setting_role.name");
            formikHelpers.setFieldError("name", message);
            return;
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: values.name });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: values.name });
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
        // Show a success notification and navigate to the maintenance types page
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: values.name }),
        });
        mutate();
        formikHelpers.resetForm({ values: initialFormValues });
        onClose && onClose();
      }
    },
    [mutate, onClose, orgId, orgRole, showNotification, t, userId]
  );

  const { values, touched, errors, isSubmitting, handleChange, handleSubmit, resetForm } =
    useFormik<OrganizationRoleInputForm>({
      initialValues: initialFormValues,
      validationSchema: organizationRoleInputFormSchema,
      enableReinitialize: true,
      onSubmit: handleSubmitFormik,
    });

  /**
   * Handle the click event for checking or unchecking all operations for a specific resource.
   * @param {ResourceInfo} resource - The resource for which to check or uncheck all operations.
   */
  const handleCheckAllClick = useCallback(
    (resource: ResourceInfo) => () => {
      const rolePermissions = { ...values.rolePermissions };

      if (!rolePermissions[`${resource.action}._all`]) {
        resource.operations.forEach((operation) => {
          rolePermissions[`${resource.action}.${operation.action}`] = true;
        });
        rolePermissions[`${resource.action}._all`] = true;
      } else {
        resource.operations.forEach((operation) => {
          rolePermissions[`${resource.action}.${operation.action}`] = false;
        });

        rolePermissions[`${resource.action}._all`] = false;
      }

      resetForm({
        values: {
          ...values,
          rolePermissions,
        },
      });
    },
    [resetForm, values]
  );

  /**
   * Handle checkbox click event to update role permissions.
   *
   * @param {string} name - The name of the clicked checkbox representing a role permission.
   */
  const handleCheckboxClick = useCallback(
    (name: string) => () => {
      let count = 0;
      const rolePermissions = {
        ...values.rolePermissions,
        [name]: !values.rolePermissions[name],
      };

      const [resource, _action] = name.split(".");

      resources.forEach((item) => {
        const actionCount = item.operations.length;
        if (item.action === resource) {
          for (const [key, value] of Object.entries(rolePermissions)) {
            const [keyResource, keyAction] = key.split(".");

            if (keyResource === resource && keyAction !== "_all") {
              if (value) {
                count++;
              }
            }
          }
          rolePermissions[`${item.action}._all`] = actionCount === count;
        }
      });

      resetForm({
        values: {
          ...values,
          rolePermissions,
        },
      });
    },
    [resetForm, resources, values]
  );

  /**
   * Handle the closing of a modal by resetting the form values to the initial state.
   */
  const handleClose = useCallback(() => {
    resetForm({ values: initialFormValues });
    onClose && onClose();
  }, [onClose, resetForm]);

  useEffect(() => {
    if (open && orgRole) {
      const permissions = (orgRole.permissions || []) as Permission[];
      const rolePermissions = permissions.reduce((prevValue: AnyObject, item: Permission) => {
        prevValue[`${item.resource}.${item.action}`] = true;
        return prevValue;
      }, {});

      resources.forEach((resource) => {
        const actionCount = resource.operations.length;
        const permittedActionCount = permissions.filter((item) => item.resource === resource.action).length;
        rolePermissions[`${resource.action}._all`] = actionCount === permittedActionCount;
      });

      resetForm({
        values: {
          name: orgRole.name,
          description: orgRole.description,
          rolePermissions,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resources, orgRole]);

  /**
   * Handles the search action.
   */
  const handleSearch = useCallback(() => {
    setKeyword(keyword);
  }, [keyword]);

  /**
   * Handles the key down event for the search input or textarea.
   *
   * @param event - The key down event object.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  /**
   * Handles the change event of the search input or textarea.
   *
   * @param event - The change event object.
   */
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setKeyword(event.target.value);
  }, []);

  const filterResources = useCallback(() => {
    return resources.filter((item) => {
      const includesKeyword = t(`resource.${item.name}`).toLowerCase().includes(keyword.toLowerCase());
      return includesKeyword;
    });
  }, [resources, keyword, t]);

  const resourcesFilter = useMemo(() => {
    return filterResources();
  }, [filterResources]);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <form method="POST" onSubmit={handleSubmit}>
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-500 sm:duration-700"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-500 sm:duration-700"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto lg:w-screen lg:max-w-screen-md">
                    <div className="flex h-full flex-col divide-gray-200 bg-white shadow-xl">
                      <div className="flex flex-col border-b bg-gray-50 px-4 py-6 sm:px-6">
                        <div className="flex items-start justify-between space-x-3">
                          <div className="space-y-1">
                            <Dialog.Title className="text-base font-semibold leading-6 text-gray-900">
                              {orgRole
                                ? t("org_setting_role.modal_title_update")
                                : t("org_setting_role.modal_title_create")}
                            </Dialog.Title>
                          </div>
                          <div className="flex h-7 items-center">
                            <button
                              type="button"
                              className="relative text-gray-400 hover:text-gray-500"
                              onClick={handleClose}
                            >
                              <span className="absolute -inset-2.5" />
                              <span className="sr-only">Close panel</span>
                              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto">
                        <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                          <div>
                            <label
                              htmlFor="role-name"
                              className="block text-sm font-medium leading-6 text-gray-900 sm:mt-1.5"
                            >
                              {t("org_setting_role.name")}
                              <span className="ml-1 text-red-600">(*)</span>
                            </label>
                          </div>
                          <div className="sm:col-span-2">
                            <TextField
                              name="name"
                              value={values.name ?? ""}
                              required
                              maxLength={255}
                              onChange={handleChange}
                              errorText={formatError(t, touched.name && errors.name)}
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                          <div>
                            <label
                              htmlFor="description"
                              className="block text-sm font-medium leading-6 text-gray-900 sm:mt-1.5"
                            >
                              {t("org_setting_role.description")}
                            </label>
                          </div>
                          <div className="sm:col-span-2">
                            <TextField
                              name="description"
                              value={ensureString(values.description)}
                              multiline
                              rows={4}
                              maxLength={500}
                              onChange={handleChange}
                              errorText={formatError(t, touched.description && errors.description)}
                            />
                          </div>
                        </div>

                        {/* Permissions */}
                        <fieldset
                          className={clsx("flex flex-col gap-4 space-y-2 px-4 sm:px-6 sm:py-5", {
                            "pointer-events-none": orgRole?.type === OrganizationRoleType.ADMIN,
                          })}
                        >
                          <legend className="sr-only">{t("org_setting_role.authorization_title")}</legend>
                          <div className="text-sm font-medium leading-6 text-gray-900" aria-hidden="true">
                            {t("org_setting_role.authorization_title")}

                            <TextField
                              name="keywords"
                              value={keyword}
                              icon={MagnifyingGlassIcon}
                              rightAddon={t("components.quick_search.search")}
                              rightAddonClick={handleSearch}
                              onKeyDown={handleKeyDown}
                              onChange={handleSearchChange}
                              placeholder={t("components.quick_search.placeholder")}
                              className="py-4 sm:w-[50%] [&_input]:rounded-r-none"
                            />
                          </div>

                          {resourcesFilter.map((resource) => (
                            <div key={resource.action} className="bg:gray-200 !mb-6 rounded-md border border-gray-300">
                              <div className="relative -mt-3.5 ml-2 justify-around">
                                <span className="bg-white px-2 text-sm text-gray-500">
                                  {resource.id ? t(`resource.${resource.name}`) : resource.name}
                                </span>
                                <div className="-mt-[23px] flex items-center justify-end px-3">
                                  <div className="bg-white px-2">
                                    <Checkbox
                                      label={t("org_setting_role.select_all_button")}
                                      direction="row"
                                      name={`${resource.action}._all`}
                                      checked={
                                        values.rolePermissions[`${resource.action}._all`] ||
                                        orgRole?.type === OrganizationRoleType.ADMIN
                                      }
                                      onChange={handleCheckAllClick(resource)}
                                      disabled={orgRole?.type === OrganizationRoleType.ADMIN}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-row flex-wrap gap-x-4 gap-y-2 p-3">
                                {resource.operations.map((operation) => (
                                  <div
                                    key={`${resource.action}-${operation.action}`}
                                    className="flex min-w-[20%] items-center p-1 hover:cursor-pointer hover:rounded hover:bg-gray-200"
                                    onClick={handleCheckboxClick(`${resource.action}.${operation.action}`)}
                                  >
                                    <Checkbox
                                      label={t(`operation.${operation.name}`)}
                                      direction="row"
                                      name={`${resource.action}.${operation.action}`}
                                      checked={
                                        values.rolePermissions[`${resource.action}.${operation.action}`] ||
                                        orgRole?.type === OrganizationRoleType.ADMIN
                                      }
                                      onChange={handleCheckboxClick(`${resource.action}.${operation.action}`)}
                                      disabled={orgRole?.type === OrganizationRoleType.ADMIN}
                                      isHtmlFor={false}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </fieldset>
                      </div>

                      {/* Action buttons */}
                      <div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6">
                        <div className="flex justify-end space-x-3">
                          <Button
                            type="button"
                            variant="outlined"
                            onClick={handleClose}
                            color="secondary"
                            disabled={isSubmitting}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button type="submit" loading={isSubmitting}>
                            {t("common.save")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </form>
      </Dialog>
    </Transition.Root>
  );
};

export default RoleUpdateModal;
