"use client";

import { Transition } from "@headlessui/react";
import { Fragment } from "react";
import React from "react";

import { Notification } from "@/components/molecules";
import { useAppState } from "@/redux/states";

const NotificationStack = () => {
  const { notifications } = useAppState();

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-[9999] flex items-end px-4 py-6 sm:items-start sm:p-6"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        <Transition
          show={notifications.length > 0}
          as={Fragment}
          enter="transform ease-out duration-300 transition"
          enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
          enterTo="translate-y-0 opacity-100 sm:translate-x-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="pointer-events-auto flex w-full max-w-sm flex-col space-y-4">
            {notifications.map((item) => (
              <Notification key={item.id} {...item} />
            ))}
          </div>
        </Transition>
      </div>
    </div>
  );
};

export default NotificationStack;
