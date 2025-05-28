"use client";

import { ChevronRightIcon, HomeIcon, UserIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { ElementType, useMemo } from "react";
import { PiSquaresFourThin as PiSquaresFourThinIcon } from "react-icons/pi";

import { useAuth } from "@/hooks";

type SuggestMenu = {
  name: string;
  description: string;
  href: string;
  iconColor: string;
  icon: ElementType;
};

const EmptySearchMenu = () => {
  const t = useTranslations("components");
  const { org } = useAuth();

  const suggestMenus = useMemo(() => {
    const menus: SuggestMenu[] = [
      {
        name: t("empty_search_features.account_and_profile_title"),
        description: t("empty_search_features.account_and_profile_description"),
        href: "/users/profile",
        iconColor: "bg-green-500",
        icon: UserIcon,
      },
    ];
    if (org) {
      menus.unshift({
        name: t("empty_search_features.transport_manage_title"),
        description: t("empty_search_features.transport_manage_description"),
        href: `/orgs/${org.code}/dashboard`,
        iconColor: "bg-blue-500",
        icon: HomeIcon,
      });
    }
    return menus;
  }, [org, t]);

  return (
    <div className="mx-auto max-w-lg px-6 lg:px-8">
      <div className="text-center">
        <PiSquaresFourThinIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
        <h2 className="mt-2 text-base font-semibold leading-6 text-gray-900">
          {t("empty_search_features.not_found_title")}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{t("empty_search_features.not_found_message")}</p>
      </div>
      <div className="mt-10">
        <h3 className="text-sm font-medium text-gray-500">{t("empty_search_features.suggest_other_functions")}</h3>
        <ul role="list" className="mt-4 divide-y divide-gray-200 border-b border-t border-gray-200">
          {suggestMenus.map((item) => (
            <li key={item.name}>
              <div className="group relative flex items-start space-x-3 py-4">
                <div className="flex-shrink-0">
                  <span
                    className={clsx("inline-flex h-10 w-10 items-center justify-center rounded-lg", item.iconColor)}
                  >
                    <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    <a href={item.href}>
                      <span className="absolute inset-0" aria-hidden="true" />
                      {item.name}
                    </a>
                  </div>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <div className="flex-shrink-0 self-center">
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default EmptySearchMenu;
