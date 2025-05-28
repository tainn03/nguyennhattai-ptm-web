"use client";

import { Popover as PopoverUi, Transition } from "@headlessui/react";
import { ElementType, Fragment, ReactNode, useCallback, useEffect } from "react";

import { DefaultReactProps } from "@/types";
import { cn } from "@/utils/twcn";

export type PopoverProps = DefaultReactProps & {
  placement?: "bottom-left" | "bottom-right" | "bottom-center" | "top-left" | "top-right" | "top-center";
  clickable?: boolean;
  className?: string;
  icon?: ElementType;
  label?: ReactNode;
  onOpen?: () => void;
  onClose?: () => void;
};

const Popover = ({
  placement = "bottom-right",
  clickable = true,
  className,
  children,
  label,
  icon: Icon,
  onOpen,
  onClose,
}: PopoverProps) => {
  const handleClose = useCallback(
    (event: MouseEvent) => {
      document.body.removeEventListener("click", handleClose);
      onClose && event && onClose();
    },
    [onClose]
  );

  const handleOpen = useCallback(() => {
    document.body.addEventListener("click", handleClose);
    onOpen && onOpen();
  }, [handleClose, onOpen]);

  useEffect(() => {
    return () => document.body.removeEventListener("click", handleClose);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PopoverUi className="relative">
      {({ open }) => (
        <>
          <PopoverUi.Button
            onClick={handleOpen}
            disabled={!clickable}
            className="group inline-flex rounded-md text-left text-base font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
          >
            {label && <span>{label}</span>}
            {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
          </PopoverUi.Button>
          <PopoverUi.Overlay id="popoverOverlay" className="fixed inset-0 " />
          {children && (
            <>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <PopoverUi.Panel
                  className={cn(
                    "absolute z-10 w-screen max-w-sm transform bg-white px-4 sm:rounded-md sm:px-0 md:w-auto md:max-w-none",
                    {
                      "bottom-8 left-1/2 -translate-x-1/2": placement === "top-center",
                      "bottom-8 right-7": placement === "top-left",
                      "bottom-8 left-7": placement === "top-right",
                      "left-1/2 -translate-x-1/2": placement === "bottom-center",
                      "left-1/2 -translate-x-1/2 xl:-top-1 xl:left-0 xl:right-7 xl:translate-x-0":
                        placement === "bottom-left",
                      "left-1/2 -translate-x-1/2 xl:-top-1 xl:left-7 xl:translate-x-0": placement === "bottom-right",
                    }
                  )}
                >
                  {open && (
                    <div
                      className={cn(
                        "max-h-[500px] min-h-[450px] overflow-x-hidden shadow-lg ring-1 ring-black/5 sm:rounded-md",
                        className
                      )}
                    >
                      {children}
                    </div>
                  )}
                </PopoverUi.Panel>
              </Transition>
            </>
          )}
        </>
      )}
    </PopoverUi>
  );
};

export default Popover;
