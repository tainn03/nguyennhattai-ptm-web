"use client";

import { useTranslations } from "next-intl";
import { PiFileTextThin as PiFileTextThinIcon } from "react-icons/pi";

import { Link } from "@/components/atoms";
import { Button } from "@/components/molecules";

export type DetailDataNotFoundProps = {
  goBackText?: string;
  goBackLink: string;
};

const DetailDataNotFound = ({ goBackText, goBackLink }: DetailDataNotFoundProps) => {
  const t = useTranslations();

  return (
    <section className="mx-auto grid min-h-full max-w-lg place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <PiFileTextThinIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {t("common.message.data_not_found_title")}
        </h1>
        <p className="mt-6 text-base leading-7 text-gray-600">{t("common.message.data_not_found_message")}</p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button as={Link} href={goBackLink}>
            &larr; {goBackText || t("components.detail_data_not_found.back_to_list")}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DetailDataNotFound;
