"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/components/atoms";
import { Button } from "@/components/molecules";

const NewOrganization = () => {
  const t = useTranslations();

  return (
    <div className="overflow-hidden bg-white py-32">
      <div className="mx-auto max-w-7xl lg:flex">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-12 gap-y-16 lg:mx-0 lg:min-w-full lg:max-w-none lg:flex-none lg:gap-y-8">
          <div className="lg:col-end-1 lg:w-full lg:max-w-lg lg:pb-8">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("org_welcome.create_org_title")}
            </h2>
            <p className="mt-6 text-xl leading-8 text-gray-600">{t("org_welcome.create_org_welcome")}</p>
            <p className="mt-6 text-base leading-7 text-gray-600">{t("org_welcome.create_org_description")}</p>
            <div className="mt-10 flex">
              <Button as={Link} href="/orgs/new" size="large">
                {t("org_welcome.create_new")} <span aria-hidden="true">&rarr;</span>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-start justify-end gap-6 sm:gap-8 lg:contents">
            <div className="w-0 flex-auto lg:ml-auto lg:w-auto lg:flex-none lg:self-end">
              <img
                alt=""
                src="/assets/images/orgs-new-01-ai.jpg"
                className="aspect-[7/5] w-[37rem] max-w-none rounded-2xl bg-gray-50 object-cover"
              />
            </div>
            <div className="contents lg:col-span-2 lg:col-end-2 lg:ml-auto lg:flex lg:w-[37rem] lg:items-start lg:justify-end lg:gap-x-8">
              <div className="order-first flex w-64 flex-none justify-end self-end lg:w-auto">
                <img
                  alt=""
                  src="/assets/images/orgs-new-02-ai.jpg"
                  className="aspect-[4/3] w-[24rem] max-w-none flex-none rounded-2xl bg-gray-50 object-cover"
                />
              </div>
              <div className="flex w-96 flex-auto justify-end lg:w-auto lg:flex-none">
                <img
                  alt=""
                  src="/assets/images/orgs-new-03-ai.jpg"
                  className="aspect-[7/5] w-[37rem] max-w-none flex-none rounded-2xl bg-gray-50 object-cover"
                />
              </div>
              <div className="hidden sm:block sm:w-0 sm:flex-auto lg:w-auto lg:flex-none">
                <img
                  alt=""
                  src="/assets/images/orgs-new-04-ai.jpg"
                  className="aspect-[4/3] w-[24rem] max-w-none rounded-2xl bg-gray-50 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOrganization;
