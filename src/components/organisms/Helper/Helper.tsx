"use client";

import { useTranslations } from "next-intl";
import { MouseEvent, useCallback, useState } from "react";

import { Button } from "@/components/molecules";

const Helper = () => {
  const t = useTranslations();
  const [copyId, setCopyId] = useState(0);
  const listHelper = [
    {
      id: 1,
      name: t("components.helper.app_store"),
      img: "app-store",
      url: "https://apps.apple.com/vn/app/autotms/id6474239084?l=vi",
    },
    {
      id: 2,
      name: t("components.helper.google_play"),
      img: "google-play",
      url: "https://play.google.com/store/apps/details?id=vn.autotms.app",
    },
  ];

  const handleClick = useCallback(
    (value: string, id: number) => async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      await navigator.clipboard.writeText(value);
      setCopyId(id);
      setTimeout(() => setCopyId(0), 3000);
    },
    []
  );

  return (
    <div className="w-full px-4 pb-4 pt-5 text-center sm:p-6">
      <h5 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{t("components.helper.title")}</h5>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{t("components.helper.description")}</p>
      <div className="flex items-center justify-around">
        {listHelper.map((item) => (
          <div className="flex flex-col items-center gap-5" key={item.id}>
            <img
              src={`/assets/qr-code/${item.img}.svg`}
              alt={item.name}
              className="h-32 w-32 rounded-md object-cover"
            />
            <Button
              onClick={handleClick(item.url, item.id)}
              className="relative inline-flex !h-auto w-4/5 items-center justify-center bg-transparent !px-0 hover:!bg-transparent md:w-3/5"
            >
              <img className="h-12 max-w-none" src={`/assets/icons/${item.img}.png`} alt={item.name} />
              {copyId === item.id && (
                <span className="absolute -top-1 left-0 flex -translate-y-full whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-center text-sm font-normal text-white after:absolute after:left-1/2 after:top-[100%] after:-translate-x-1/2 after:border-4 after:border-x-transparent after:border-b-transparent after:border-t-gray-900 after:content-['']">
                  {t("components.copy_to_clipboard.copied")}
                </span>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Helper;
