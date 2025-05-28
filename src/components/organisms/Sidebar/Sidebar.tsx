"use client";

import { Dialog, Transition } from "@headlessui/react";
import { QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { Link, Logo } from "@/components/atoms";
import { Avatar } from "@/components/molecules";
import { OrganizationSwitcher, SidebarMenu, SkeletonUserInformation } from "@/components/organisms";
import { features, MenuGroup } from "@/configs/menu";
import { useAuth, useOrgSettingExtendedStorage } from "@/hooks";
import { useAppState } from "@/redux/states";
import { getAccountInfo } from "@/utils/auth";
import { addDynamicAnalysisToMenuGroup } from "@/utils/dynamicAnalysis";

export type SidebarProps = {
  scope?: "admin" | "user" | "organization" | "organization_settings";
  sidebarOpen: boolean;
  onSidebarOpen?: (_value: boolean) => void;
};

const Sidebar = ({ scope = "organization", sidebarOpen, onSidebarOpen }: SidebarProps) => {
  const t = useTranslations();
  const { organizationMember } = useAppState();
  const { orgId, org, orgLink, user } = useAuth();
  const { orderConsolidationEnabled } = useOrgSettingExtendedStorage();

  const [menuGroup, setMenuGroup] = useState<MenuGroup[]>(features(org?.code, orderConsolidationEnabled)[scope]);

  const accountInfo = useMemo(() => getAccountInfo(user, organizationMember), [user, organizationMember]);

  const mergedNavigation = useCallback(async () => {
    let menuGroupNew = features(org?.code, orderConsolidationEnabled)[scope];
    if (org?.dynamicAnalysis && org?.dynamicAnalysis?.length > 0) {
      menuGroupNew = addDynamicAnalysisToMenuGroup(menuGroupNew, org?.dynamicAnalysis, org);
    }
    setMenuGroup(menuGroupNew);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderConsolidationEnabled, org?.code, org?.dynamicAnalysis, scope]);

  useEffect(() => {
    mergedNavigation();
  }, [mergedNavigation]);

  const handleSidebarOpen = useCallback(() => {
    onSidebarOpen && onSidebarOpen(false);
  }, [onSidebarOpen]);

  const contentComponent = useMemo(
    () => (
      <>
        <div className="flex h-16 shrink-0 items-center">
          <Link useDefaultStyle href={orgId && orgLink ? `${orgLink}/dashboard` : "/orgs"} className="inline-flex">
            <Logo size="small" />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            {/* User */}
            {scope === "user" && (
              <li>
                {user ? (
                  <div className="group relative -mx-6 -mt-5 block flex-shrink-0 bg-gray-800 px-4 py-3">
                    <div className="flex items-center">
                      <div>
                        <Avatar size="large" displayName={accountInfo.displayName} avatarURL={accountInfo.avatar} />
                      </div>
                      <div className="ml-3 max-w-[80%]">
                        <p className="text-sm font-semibold text-gray-400 group-hover:text-white">
                          <Link useDefaultStyle href="/users/profile">
                            <span className="absolute inset-0" aria-hidden="true" />
                            <span>{accountInfo.displayName}</span>
                          </Link>
                        </p>
                        <p className="mt-1 break-words text-sm font-medium text-gray-500 group-hover:text-gray-400">
                          {accountInfo.contactInfo}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <SkeletonUserInformation />
                )}
              </li>
            )}

            {/* Organization */}
            {scope !== "user" && (
              <li>
                <OrganizationSwitcher />
              </li>
            )}

            {menuGroup.map((nav) => (
              <SidebarMenu key={nav.id} menuGroup={nav} />
            ))}

            {/* Menu footer */}
            <li className="mt-auto">
              {/* Help */}
              <div className="flex justify-center">
                <Link
                  useDefaultStyle={false}
                  href="https://help.autotms.vn/"
                  target="_blank"
                  className="inline-flex items-center whitespace-nowrap rounded-full bg-green-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                >
                  <QuestionMarkCircleIcon className="h-5 w-5 flex-shrink-0 sm:-ml-1" aria-hidden="true" />
                  <span className="ml-2 truncate">{t("components.sidebar_menu.support")}</span>
                </Link>
              </div>
            </li>
          </ul>
        </nav>
      </>
    ),
    [accountInfo, menuGroup, orgId, orgLink, scope, user, t]
  );

  return (
    <>
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 xl:hidden" onClose={handleSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button type="button" className="-m-2.5 p-2.5" onClick={handleSidebarOpen}>
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                {/* Sidebar component, swap this element with another sidebar if you like */}
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4 ring-1 ring-white/10">
                  {contentComponent}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden xl:fixed xl:inset-y-0 xl:z-50 xl:flex xl:w-72 xl:flex-col">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4">{contentComponent}</div>
      </div>
    </>
  );
};

export default Sidebar;
