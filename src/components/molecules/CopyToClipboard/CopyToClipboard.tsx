"use client";

import { ClipboardDocumentCheckIcon, ClipboardDocumentIcon, LinkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { MouseEvent, useCallback, useMemo, useState } from "react";

export type CopyToClipboardProps = {
  value: string;
  title?: string;
  className?: string;
  isLink?: boolean;
};

const CopyToClipboard = ({ value, title, className, isLink }: CopyToClipboardProps) => {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(
    async (event?: MouseEvent<HTMLButtonElement>) => {
      event?.preventDefault();
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    },
    [value]
  );

  const tooltip = useMemo(() => title || t("components.copy_to_clipboard.tooltip"), [t, title]);

  return (
    <button
      type="button"
      className={clsx("relative ml-1 inline-flex", className)}
      title={tooltip}
      disabled={copied}
      onClick={handleClick}
    >
      <span className="absolute bottom-0 left-0 -mb-px">
        {copied ? (
          <>
            {isLink ? (
              <div className="flex w-full flex-nowrap items-center">
                <LinkIcon className="h-5 w-5 flex-shrink-0 -rotate-6 text-blue-400" aria-hidden="true" />
                <span className="ml-1 w-full flex-1 text-sm text-gray-500">{t("common.copy")}</span>
              </div>
            ) : (
              <ClipboardDocumentCheckIcon className="h-5 w-5 -rotate-6 text-blue-400" aria-hidden="true" />
            )}

            <span className="absolute -top-1 left-0 flex -translate-y-full whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-center text-sm font-normal text-white after:absolute after:left-1/2 after:top-[100%] after:-translate-x-1/2 after:border-4 after:border-x-transparent after:border-b-transparent after:border-t-gray-900 after:content-['']">
              {t("components.copy_to_clipboard.copied")}
            </span>
          </>
        ) : isLink ? (
          <div className="flex w-full flex-nowrap items-center">
            <LinkIcon
              className="h-5 w-5 flex-shrink-0 text-gray-400 hover:-rotate-6 hover:text-gray-500"
              aria-hidden="true"
            />
            <span className="ml-1 flex-1 text-sm text-gray-500">{t("common.copy")}</span>
          </div>
        ) : (
          <ClipboardDocumentIcon
            className="h-5 w-5 text-gray-400 hover:-rotate-6 hover:text-gray-500"
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  );
};

export default CopyToClipboard;
