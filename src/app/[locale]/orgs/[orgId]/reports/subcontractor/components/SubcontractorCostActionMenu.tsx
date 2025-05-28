"use client";

import { Menu, Transition } from "@headlessui/react";
import { ArrowDownTrayIcon, EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Fragment } from "react";

type SubcontractorCostActionMenuProps = {
  actionPlacement?: "start" | "center" | "end";
  onExport?: () => void;
};

const SubcontractorCostActionMenu = ({ actionPlacement, onExport }: SubcontractorCostActionMenuProps) => {
  const t = useTranslations();

  return (
    <Menu as="div" className="relative flex justify-center">
      <div>
        <Menu.Button className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2">
          <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
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
        <Menu.Items
          className={clsx(
            "absolute right-9 z-10 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
            {
              "bottom-0": actionPlacement === "start",
              "top-1/2 -translate-y-1/2": actionPlacement === "center",
              "top-0": actionPlacement === "end",
            }
          )}
        >
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  type="button"
                  className={clsx("group flex w-full items-center px-4 py-2 text-sm", {
                    "bg-gray-100 text-gray-900": active,
                    "text-gray-700": !active,
                  })}
                  onClick={onExport}
                >
                  <ArrowDownTrayIcon
                    className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                    aria-hidden="true"
                  />
                  {t("report.drivers.download")}
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default SubcontractorCostActionMenu;
