"use client";

import { ArrowTopRightOnSquareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCallback } from "react";

import { useUserGuide } from "@/hooks";

type UserGuideModalProps = {
  children: React.ReactNode;
};

const UserGuideModal = ({ children }: UserGuideModalProps) => {
  const { open, documentationLink, closeUserGuide } = useUserGuide();

  const handleOpenInNewTab = useCallback(() => {
    if (documentationLink) {
      window.open(documentationLink, "_blank");
    }
  }, [documentationLink]);

  if (!open || !documentationLink) {
    return children;
  }

  return (
    <div className="flex flex-nowrap">
      <div className="max-h-screen flex-1">{children}</div>
      <div className="fixed bottom-0 right-0 top-16 h-full max-h-screen w-96 overflow-y-hidden rounded-md border border-gray-50 bg-white shadow-lg transition-all 2xl:static 2xl:flex-shrink-0">
        {/* Header */}
        <div className="relative z-10 flex h-[63px] w-full flex-nowrap items-center justify-between gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm">
          <div className="flex flex-nowrap items-center gap-x-2">
            <div className="font-semibold text-gray-900">Hướng dẫn sử dụng</div>
          </div>

          <div className="flex flex-nowrap items-center gap-x-4">
            <button
              data-tooltip-id="tooltip"
              data-tooltip-content="Mở trang trong tab mới"
              className="text-gray-500 hover:text-gray-700"
              onClick={handleOpenInNewTab}
            >
              <ArrowTopRightOnSquareIcon className="h-6 w-6" />
            </button>
            <button className="text-gray-500 hover:text-gray-700" onClick={closeUserGuide}>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="-mt-[80px] h-[calc(100vh+16px)]">
          <iframe
            className="h-full w-full"
            src={documentationLink}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};

export default UserGuideModal;
