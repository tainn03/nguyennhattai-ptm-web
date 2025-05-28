"use client";

import { Popover, Transition } from "@headlessui/react";
import {
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  InformationCircleIcon,
  KeyIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useMemo, useState } from "react";

import { Link } from "@/components/atoms";
import { Avatar } from "@/components/molecules";
import { AppInfoModal, ConfirmModal } from "@/components/organisms";
import { useAppState } from "@/redux/states";
import { getAccountInfo } from "@/utils/auth";

const AvatarMenu = () => {
  const t = useTranslations("components");
  const { userProfile, organizationMember } = useAppState();
  const [isConfirmLogoutModalOpen, setConfirmLogoutModalOpen] = useState(false);
  const [isAppInformationModalOpen, setIsAppInformationModalOpen] = useState(false);

  const navigation = useMemo(
    () => [
      {
        name: t("avatar_menu.profile_title"),
        description: t("avatar_menu.profile_description"),
        link: "/users/profile",
        icon: UserIcon,
      },
      {
        name: t("avatar_menu.change_password_title"),
        description: t("avatar_menu.change_password_description"),
        link: "/users/password-edit",
        icon: KeyIcon,
      },
      {
        name: t("avatar_menu.logout_title"),
        description: t("avatar_menu.logout_description"),
        link: "/auth/signin",
        icon: ArrowRightOnRectangleIcon,
        signOut: true,
      },
    ],
    [t]
  );

  const accountInfo = useMemo(() => getAccountInfo(userProfile, organizationMember), [userProfile, organizationMember]);

  const handleSignOut = useCallback(() => {
    setConfirmLogoutModalOpen(true);
  }, []);

  const handleSignOutCancel = useCallback(() => {
    setConfirmLogoutModalOpen(false);
  }, []);
  const handleSignOutConfirm = useCallback(async () => {
    await signOut({
      redirect: true,
      callbackUrl: "/auth/signin",
    });
  }, []);

  const handleToggleAppInformationModal = useCallback(() => {
    setIsAppInformationModalOpen((prev) => !prev);
  }, []);

  return (
    <>
      <Popover className="relative">
        <Popover.Button className="relative flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          <span className="absolute -inset-1.5" />
          <span className="sr-only">Open menu</span>
          <Avatar size="small" displayName={accountInfo.displayName} avatarURL={accountInfo.avatar} />
          <span className="hidden whitespace-pre-line lg:flex lg:items-center">
            <span className="ml-4 text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">
              {accountInfo.displayName}
            </span>
            <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
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
          <Popover.Panel className="fixed right-0 z-10 mt-3 flex w-screen px-4 sm:absolute sm:max-w-xs sm:p-0">
            <div className="w-screen flex-auto overflow-hidden rounded-3xl bg-white text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
              <div className="group block flex-shrink-0 border-b p-4">
                <div className="flex items-center">
                  <div>
                    <Avatar size="medium" displayName={accountInfo.displayName} avatarURL={accountInfo.avatar} />
                  </div>
                  <div className="ml-3 max-w-[80%]">
                    <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                      {accountInfo.displayName}
                    </p>
                    <p className="mt-1 break-words text-sm font-medium text-gray-500 group-hover:text-gray-700">
                      {accountInfo.contactInfo}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                {navigation.map((item) => (
                  <div key={item.name} className="group relative flex gap-x-6 rounded-lg p-4 hover:bg-gray-50">
                    <div className="mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                      <item.icon className="h-6 w-6 text-gray-600 group-hover:text-blue-600" aria-hidden="true" />
                    </div>
                    <div>
                      {item.signOut ? (
                        <button type="button" onClick={handleSignOut} className="font-semibold text-gray-900">
                          {item.name}
                          <span className="absolute inset-0" />
                        </button>
                      ) : (
                        <Link useDefaultStyle href={item.link} className="font-semibold text-gray-900">
                          {item.name}
                          <span className="absolute inset-0" />
                        </Link>
                      )}
                      <p className="mt-1 text-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="group block flex-shrink-0 border-t px-4 py-1 hover:bg-gray-50">
                <div className="group relative flex gap-x-6 rounded-lg p-4">
                  <div className="mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                    <InformationCircleIcon
                      className="h-6 w-6 text-gray-600 group-hover:text-blue-600"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleToggleAppInformationModal}
                      className="font-semibold text-gray-900"
                    >
                      {t("avatar_menu.app_info_title")}
                      <span className="absolute inset-0" />
                    </button>
                    <p className="mt-1 text-gray-600">{t("avatar_menu.app_info_description")}</p>
                  </div>
                </div>
              </div>
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>

      <ConfirmModal
        open={isConfirmLogoutModalOpen}
        icon="question"
        title={t("avatar_menu.logout_confirm_title")}
        message={t("avatar_menu.logout_confirm_message")}
        onClose={handleSignOutCancel}
        onCancel={handleSignOutCancel}
        onConfirm={handleSignOutConfirm}
      />
      <AppInfoModal open={isAppInformationModalOpen} onClose={handleToggleAppInformationModal} />
    </>
  );
};

export default AvatarMenu;
