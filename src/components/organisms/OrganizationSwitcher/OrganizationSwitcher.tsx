"use client";

import { Popover, Transition } from "@headlessui/react";
import { ArrowsRightLeftIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next-intl/client";
import { Fragment, MouseEvent, useCallback, useMemo } from "react";

import { Link } from "@/components/atoms";
import { OrganizationLogo } from "@/components/molecules";
import { SkeletonOrganizationSwitcher } from "@/components/organisms";
import { useAuth } from "@/hooks";
import useOrganizationsByUserId from "@/hooks/useOrganizationsByUserId";
import { updateUserOrganizationIdSetting } from "@/services/client/user";
import { OrganizationInfo } from "@/types/strapi";
import { getOrganizationCodeFromPathname } from "@/utils/auth";
import { ensureString } from "@/utils/string";

const OrganizationSwitcher = () => {
  const t = useTranslations("components");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { orgId, orgLink, userId, user, reloadUserProfile } = useAuth();
  const { organizationMembers, isLoading } = useOrganizationsByUserId({ id: userId || 0 });

  const currentUrl = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  const myOrgs = useMemo(
    () => organizationMembers.map(({ organization }) => organization as OrganizationInfo),
    [organizationMembers]
  );
  const currentOrg = useMemo(() => myOrgs.find(({ id }) => Number(id) === orgId), [orgId, myOrgs]);
  const otherOrgs = useMemo(() => myOrgs.filter(({ id }) => Number(id) !== orgId), [orgId, myOrgs]);

  const getUrl = useCallback(
    (newCode: string) => {
      const orgCode = getOrganizationCodeFromPathname(currentUrl);
      return orgCode ? currentUrl.replace(orgCode, newCode) : currentUrl;
    },
    [currentUrl]
  );

  const handleSelectClick = useCallback(
    (selectedOrg: OrganizationInfo) => async (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (!user) {
        return;
      }

      const orgId = Number(selectedOrg.id);
      const settingId = Number(user.setting.id);
      if (settingId && orgId) {
        const result = await updateUserOrganizationIdSetting(settingId, orgId);
        if (result) {
          await reloadUserProfile();
        }

        // Affect new link
        const newLink = getUrl(selectedOrg.code);
        router.replace(newLink);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, getUrl, reloadUserProfile]
  );

  if (isLoading) {
    return <SkeletonOrganizationSwitcher />;
  }

  return (
    <Popover className="relative">
      <Popover.Button
        as="div"
        className="group relative -mx-6 -mt-5 flex items-start space-x-4 bg-gray-800 p-2 focus-within:ring-2 focus-within:ring-blue-500 hover:bg-gray-600"
      >
        <div className="flex flex-shrink-0 items-center justify-center">
          <OrganizationLogo
            displayName={ensureString(currentOrg?.name)}
            logoURL={currentOrg?.logo?.previewUrl || currentOrg?.logo?.url}
          />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-400 group-hover:text-white">
            <button type="button" className="text-left">
              <span className="absolute inset-0" aria-hidden="true" />
              <span>{currentOrg?.abbreviationName || currentOrg?.name}</span>
            </button>
          </h3>
          {currentOrg?.abbreviationName && (
            <p className="mt-1 text-xs text-gray-500 group-hover:text-gray-400">{currentOrg?.name}</p>
          )}
        </div>
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute inset-x-0 top-20 z-10 -mx-6 flex">
          <div className="w-screen flex-auto divide-y divide-gray-400 overflow-hidden bg-gray-800 text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
            {/* Organization settings */}
            <Link
              useDefaultStyle={false}
              href={`${orgLink}/settings/general`}
              className="group flex gap-x-3 px-2 py-3 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-600 hover:text-white"
            >
              <div className="flex w-16 flex-shrink-0 items-center justify-center">
                <Cog6ToothIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
              </div>
              {t("organization_switcher.organization_settings")}
            </Link>

            {/* List of Organization */}
            {otherOrgs.length > 0 && (
              <div className="max-h-[calc(100vh_-_280px)] divide-y divide-gray-500 overflow-auto">
                {otherOrgs.map((item) => (
                  <div key={item.id} className="group relative flex space-x-4 p-2 hover:bg-gray-600">
                    <div className="flex flex-shrink-0 items-center justify-center">
                      <OrganizationLogo
                        size="small"
                        displayName={ensureString(item?.name)}
                        logoURL={item?.logo?.previewUrl || item?.logo?.url}
                      />
                    </div>
                    <div className="flex flex-1 items-center justify-between space-x-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 group-hover:text-white">
                          <Link useDefaultStyle href={getUrl(item.code)} onClick={handleSelectClick(item)}>
                            <span className="absolute inset-0" aria-hidden="true" />
                            <span>{item.abbreviationName || item.name}</span>
                          </Link>
                        </h3>
                        {item.abbreviationName && (
                          <p className="mt-1 text-sm text-gray-500 group-hover:text-gray-400">{item.name}</p>
                        )}
                      </div>
                      <div>
                        <ArrowsRightLeftIcon
                          className="h-6 w-6 text-gray-400 group-hover:text-white"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create new Organization */}
            {/* <Link
              href="/orgs/new"
              className="group flex gap-x-3 px-2 py-3 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-600 hover:text-white"
            >
              <div className="flex w-16 flex-shrink-0 items-center justify-center">
                <PlusIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
              </div>
              {t("organization_switcher.new_organization")}
            </Link> */}
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
};

export default OrganizationSwitcher;
