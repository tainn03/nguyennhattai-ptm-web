"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { MouseEvent, useCallback } from "react";

import { Badge, Link } from "@/components/atoms";
import { OrganizationLogo } from "@/components/molecules";
import { OrganizationInfo, OrganizationMemberInfo } from "@/types/strapi";

export type OrganizationListProps = {
  organizationMembers: OrganizationMemberInfo[];
  onOrganizationSelect?: (_organization: OrganizationInfo) => void;
};

const OrganizationList = ({ organizationMembers, onOrganizationSelect }: OrganizationListProps) => {
  const t = useTranslations();

  /**
   * Handling the selection of an organization.
   *
   * @param {OrganizationInfo} organization - The selected organization.
   * @returns {Function} - An async function to handle the organization selection.
   */
  const handleOrganizationSelect = useCallback(
    (organization: OrganizationInfo) => async (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onOrganizationSelect && onOrganizationSelect(organization);
    },
    [onOrganizationSelect]
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {t("org_welcome.org_list_title")}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">{t("org_welcome.org_list_description")}</p>
      </div>

      <ul
        role="list"
        className="mt-10 divide-y divide-gray-100 overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl"
      >
        {organizationMembers.map(({ organization, role }) => (
          <li
            key={organization.id}
            className={clsx("relative flex justify-between gap-x-6 px-4 py-5 hover:bg-gray-50 sm:px-6", {
              "pointer-events-none": !organization.isActive,
            })}
          >
            <div className="flex shrink-0 gap-x-4">
              <OrganizationLogo
                displayName={organization.name || ""}
                logoURL={organization.logo?.url ?? organization.logo?.previewUrl ?? ""}
              />
              <div className="min-w-0 flex-auto">
                <p className="flex flex-row text-sm font-semibold leading-6 text-gray-900">
                  <Link
                    useDefaultStyle
                    color="secondary"
                    href={`/orgs/${organization.code}/dashboard`}
                    onClick={handleOrganizationSelect(organization as OrganizationInfo)}
                  >
                    <span className="absolute inset-x-0 -top-px bottom-0" />
                    {organization.abbreviationName}
                  </Link>
                  {!organization.isActive && (
                    <Badge color="warning" className="ml-2" label={t("org_welcome.create_org_wait_active")} />
                  )}
                </p>
                <p className="mt-1 flex text-xs leading-5 text-gray-500">
                  <span className="relative truncate" title={organization.name}>
                    {organization.name}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-x-4">
              <div className="hidden min-w-0 text-end sm:flex sm:flex-col">
                <p className="flex text-sm leading-6 text-gray-900">
                  <span className="relative truncate" title={organization.businessAddress || ""}>
                    {organization.businessAddress}
                  </span>
                </p>
                {(role?.name || organization.taxCode) && (
                  <p className="mt-1 flex flex-row items-center justify-end gap-x-2 text-xs leading-5 text-gray-500">
                    {role?.name && <Badge className="uppercase" label={role.name} />}
                    {organization.taxCode && <span>{t("org_welcome.tax_code", { code: organization.taxCode })}</span>}
                  </p>
                )}
              </div>
              <ChevronRightIcon className="h-5 w-5 flex-none text-gray-400" aria-hidden="true" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OrganizationList;
