"use client";

import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next-intl/client";
import { Fragment, useCallback, useEffect, useMemo, useTransition } from "react";
import { useState } from "react";
import { MdOutlineLanguage } from "react-icons/md";

import { Spinner } from "@/components/atoms";
import { DEFAULT_LOCALE, LOCALE_OPTIONS } from "@/constants/locale";
import { useAuth } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { updateUserLanguageSetting } from "@/services/client/user";
import { Locale, LocaleType } from "@/types/locale";

const LocaleSwitcher = () => {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const { user, reloadUserProfile } = useAuth(false);
  const { showNotification } = useNotification();

  const [isLocaleUpdating, setIsLocaleUpdating] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<Locale>();

  const isLoading = useMemo(
    () => !selectedLocale || isLocaleUpdating || isPending,
    [isLocaleUpdating, isPending, selectedLocale]
  );

  useEffect(() => {
    const localeCode = (user?.setting?.locale || DEFAULT_LOCALE) as LocaleType;
    const locale = LOCALE_OPTIONS.find(({ code }) => code === localeCode) || LOCALE_OPTIONS[0];
    setSelectedLocale(locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.setting?.locale]);

  const handleChange = useCallback(
    (locale: Locale) => async () => {
      // update current state
      setIsLocaleUpdating(true);
      setSelectedLocale(locale);

      // update language setting
      const settingId = user?.setting.id && Number(user.setting.id);
      if (settingId) {
        const result = await updateUserLanguageSetting(settingId, locale.code);
        if (result) {
          await reloadUserProfile();
        } else {
          showNotification({
            color: "error",
            title: t("common.message.save_error_title"),
            message: t("components.locale_switcher.save_error_message"),
          });
        }
      }

      // update router
      setIsLocaleUpdating(false);
      startTransition(() => {
        router.replace(pathname, { locale: locale.code });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, reloadUserProfile, user, t]
  );

  return (
    <Menu as="div" className="relative inline-block">
      <div>
        <Menu.Button
          className="inline-flex w-full justify-center gap-x-1.5 whitespace-nowrap rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
        >
          {selectedLocale?.name}
          {isLoading ? (
            <Spinner />
          ) : (
            <MdOutlineLanguage className="h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
          )}
          <ChevronDownIcon className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 z-10 mt-2 w-36 origin-top-right cursor-pointer divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {LOCALE_OPTIONS.map((item) => (
              <Menu.Item key={item.name}>
                {({ active }) => (
                  <a
                    onClick={handleChange(item)}
                    className={clsx("group flex items-center px-4 py-2 text-sm", {
                      "cursor-pointer bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                    })}
                  >
                    {item.name}
                  </a>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default LocaleSwitcher;
