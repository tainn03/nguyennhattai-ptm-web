"use client";

import { Popover, Transition } from "@headlessui/react";
import { MagnifyingGlassIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { ChangeEvent, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SearchMenuGroup } from "@/components/molecules";
import { EmptySearchMenu } from "@/components/organisms";
import { features, MenuGroup, MenuItem, Navigation } from "@/configs/menu";
import { useAuth, useOrgSettingExtendedStorage } from "@/hooks";
import { addDynamicAnalysisToMenuGroup } from "@/utils/dynamicAnalysis";

const SearchMenu = () => {
  const t = useTranslations();
  const { orgId, org } = useAuth();
  const [keywords, setKeywords] = useState("");
  const { orderConsolidationEnabled } = useOrgSettingExtendedStorage();
  const [navigation, setNavigation] = useState<Navigation>(features(org?.code, orderConsolidationEnabled));
  const inputRef = useRef<HTMLInputElement>(null);

  const joinName = useCallback(
    (menu: MenuItem, prefix?: string) => {
      const menuPrefix = prefix ? `${t(prefix)} >` : "";
      return `${menuPrefix} ${menu.process === "finished" ? t(menu.name) : menu.name}`;
    },
    [t]
  );

  const mergedNavigation = useCallback(async () => {
    let nav = features(org?.code);
    if (keywords) {
      const newKeywords = keywords.toLowerCase();
      for (const key in nav) {
        const groups = nav[key];
        groups.forEach((group) => {
          const filteredMenus = group.menus.filter((menu) => {
            const name = joinName(menu, group.prefix).toLowerCase();
            return name.includes(newKeywords);
          });
          group.menus = filteredMenus;
        });
      }
    }

    if (org?.dynamicAnalysis && org?.dynamicAnalysis?.length > 0) {
      const organizationNew = addDynamicAnalysisToMenuGroup(nav.organization, org?.dynamicAnalysis, org);
      nav = {
        ...nav,
        organization: organizationNew,
      };
    }

    setNavigation(nav);
  }, [joinName, keywords, org]);

  useEffect(() => {
    mergedNavigation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywords, orgId, org?.code]);

  const focusInputSearch = useCallback((open: boolean) => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      });
    }
  }, []);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setKeywords(event.target.value);
  }, []);

  const mapMenus = useCallback((groups: MenuGroup[]) => {
    const result: MenuItem[] = [];
    groups.forEach((group) => {
      const menus = [...group.menus].map((menu) => ({
        ...menu,
        name: joinName(menu, group.prefix),
      }));
      result.push(...menus);
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [orgOneMenus, orgTwoMenus] = useMemo(() => {
    if (!org?.code) {
      return [[], []];
    }
    const menus = mapMenus(navigation.organization);
    const firstMenuSize = Math.ceil((menus.length - (org?.dynamicAnalysis?.length || 0)) / 2);
    const firstMenus = menus.splice(0, firstMenuSize + (org?.dynamicAnalysis?.length || 0));
    return [firstMenus, menus];
  }, [mapMenus, navigation.organization, org?.code, org?.dynamicAnalysis?.length]);

  const orgSettingMenus = useMemo(() => {
    if (!org?.code) {
      return [];
    }
    return mapMenus(navigation.organization_settings);
  }, [mapMenus, navigation.organization_settings, org?.code]);

  const userMenus = useMemo(() => mapMenus(navigation.user), [mapMenus, navigation.user]);

  return (
    <Popover className="flex h-full items-center">
      {({ open }) => {
        focusInputSearch(open);
        return (
          <>
            <Popover.Button className="flex h-8 min-w-[32px] flex-row items-center justify-center rounded-full font-semibold leading-6 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              <Squares2X2Icon className="h-6 w-6" aria-hidden="true" />
              <span className="ml-2 hidden md:block">{t("components.search_features.feature_list")}</span>
            </Popover.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 -translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 -translate-y-1"
            >
              <Popover.Panel className="fixed inset-x-0 top-0 -z-10 pt-16 shadow-lg ring-1 ring-gray-900/5 transition-all max-xl:bottom-0 xl:pl-72">
                <div className="border-t border-white bg-white max-xl:h-full">
                  <div className="mx-auto max-w-7xl pb-10 max-xl:h-full">
                    <div className="relative mx-6 my-4 flex lg:mx-8">
                      <label htmlFor="search-features" className="sr-only">
                        Search
                      </label>
                      <MagnifyingGlassIcon
                        className="pointer-events-none absolute inset-y-0 left-0 ml-3 h-full w-5 text-gray-400"
                        aria-hidden="true"
                      />
                      <input
                        ref={inputRef}
                        id="search-features"
                        className="block w-full rounded-full border-0 px-4 py-1.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                        placeholder={t("components.search_features.search_placeholder")}
                        type="search"
                        name="search"
                        value={keywords}
                        onChange={handleChange}
                      />
                    </div>

                    {/* Empty features */}
                    {orgOneMenus.length === 0 && orgSettingMenus.length === 0 && userMenus.length === 0 && (
                      <EmptySearchMenu />
                    )}

                    <div className="grid grid-cols-1 gap-x-8 gap-y-10 px-6 max-xl:max-h-[calc(100%_-_76px)] max-xl:overflow-auto lg:grid-cols-2 lg:px-8">
                      {orgOneMenus.length > 0 && (
                        <div className="grid grid-cols-2 gap-x-6 sm:gap-x-8">
                          <SearchMenuGroup
                            title={t("components.search_features.group_feature_organization")}
                            menus={orgOneMenus}
                          />
                          <SearchMenuGroup menus={orgTwoMenus} />
                        </div>
                      )}
                      {(orgSettingMenus.length > 0 || userMenus.length > 0) && (
                        <div className="grid grid-cols-2 gap-x-6 sm:gap-x-8">
                          <SearchMenuGroup
                            title={t("components.search_features.group_feature_organization_settings")}
                            menus={orgSettingMenus}
                          />
                          <SearchMenuGroup
                            title={t("components.search_features.group_feature_user")}
                            menus={userMenus}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </>
        );
      }}
    </Popover>
  );
};

export default SearchMenu;
