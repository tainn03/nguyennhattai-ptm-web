"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { FormikErrors } from "formik";
import { useTranslations } from "next-intl";
import { ChangeEvent, useCallback, useEffect, useState } from "react";

import { Spinner } from "@/components/atoms";
import { OrganizationLogo, TextField } from "@/components/molecules";
import { PERSISTENT_ORGANIZATION, SESSION_ORGANIZATION_CACHED } from "@/constants/storage";
import { SignInForm } from "@/forms/auth";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { OrganizationInfo } from "@/types/strapi";
import { get } from "@/utils/api";
import { getItemObject, setItemObject, setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";

type OrganizationInputProps = {
  values: SignInForm;
  setFieldValue: (field: string, value: string | number) => Promise<void> | Promise<FormikErrors<SignInForm>>;
  onChange: (_event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

const OrganizationInput = ({ values, setFieldValue, onChange }: OrganizationInputProps) => {
  const t = useTranslations();
  const [organization, setOrganization] = useState<OrganizationInfo>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get organization from local storage
    const storedOrganization = getItemObject<OrganizationInfo>(PERSISTENT_ORGANIZATION, { provider: "persistent" });
    if (storedOrganization) {
      setOrganization(storedOrganization);
      setFieldValue("userType", "MEMBER");
      setFieldValue("code", storedOrganization.code);
      setFieldValue("alias", storedOrganization.alias || storedOrganization.code);
      setFieldValue("organizationId", ensureString(storedOrganization.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClearClick = useCallback(() => {
    setOrganization(undefined);
  }, []);

  const handleAliasBlur = useCallback(async () => {
    setFieldValue("code", "");
    setFieldValue("organizationId", "");
    if ((values.alias?.length || 0) >= 3) {
      setIsLoading(true);
      const { status, data } = await get<ApiResult<OrganizationInfo>>(`/api/orgs/${values.alias}`);
      if (status === HttpStatusCode.Ok && data) {
        setOrganization(data);
        setFieldValue("code", data.code);
        setFieldValue("organizationId", ensureString(data.id));

        // Update the cache if the data is successfully fetched
        setItemObject(PERSISTENT_ORGANIZATION, data, { provider: "persistent" });
        setItemString(SESSION_ORGANIZATION_CACHED, data.code);
      }
      setIsLoading(false);
    }
  }, [setFieldValue, values.alias]);

  // if (values.userType === "ADMIN") {
  //   return null;
  // }

  return (
    <>
      {organization ? (
        <div className="relative flex items-start space-x-4 rounded-md border border-blue-200 bg-blue-50 p-2">
          <div className="flex flex-shrink-0 items-center justify-center">
            <OrganizationLogo
              size="small"
              displayName={ensureString(organization?.name)}
              logoURL={organization?.logo?.previewUrl || organization?.logo?.url}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              <div>
                <span className="absolute inset-0" aria-hidden="true" />
                <span>{organization?.abbreviationName || organization?.name}</span>
              </div>
            </h3>
            {organization?.abbreviationName && <p className="mt-1 text-sm text-gray-500">{organization?.name}</p>}
          </div>
          <span
            className="absolute right-0 top-0 cursor-pointer p-1 text-gray-500 hover:text-gray-700"
            onClick={handleClearClick}
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
      ) : (
        <TextField
          id="alias"
          name="alias"
          label={t("sign_in.alias")}
          onChange={onChange}
          onBlur={handleAliasBlur}
          value={values.alias}
          rightAddon={isLoading && <Spinner />}
          rightAddonBorder={!isLoading}
        />
      )}
    </>
  );
};

export default OrganizationInput;
