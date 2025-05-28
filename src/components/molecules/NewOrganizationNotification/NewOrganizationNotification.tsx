import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { ReactNode } from "react";

import { Link } from "@/components/atoms";
import { Button } from "@/components/molecules";

export type NewOrganizationNotificationProps = {
  icon?: "info" | "success";
  title?: string;
  titleKey?: string;
  description?: ReactNode;
  descriptionKey?: ReactNode;
  organizationName?: string;
};

const NewOrganizationNotification = ({
  icon = "info",
  title,
  titleKey,
  description,
  descriptionKey,
  organizationName,
}: NewOrganizationNotificationProps) => {
  const t = useTranslations();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-12">
      {icon === "success" && <CheckCircleIcon className="h-20 w-20 text-green-600" aria-hidden="true" />}
      {icon === "info" && <ExclamationCircleIcon className="h-20 w-20 text-blue-700" aria-hidden="true" />}
      <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
        {title || t(titleKey)}
      </h2>
      <div className="mt-2 text-center text-sm leading-6 text-gray-500">
        {description ||
          t.rich(descriptionKey, {
            strong: (chunks) => <span className="font-semibold">{chunks}</span>,
            organizationName,
          })}
      </div>

      <div className="mt-6 sm:mx-auto">
        <Button as={Link} href="/orgs" variant="outlined">
          &larr; {t("new_org.notify_go_back")}
        </Button>
      </div>

      <div className="mt-6 text-center text-sm leading-6 text-gray-500">
        {t.rich("new_org.notify_support", {
          hotline: () => (
            <Link useDefaultStyle href={`tel:${t("common.app.hotline")}`} target="_top">
              {t("common.app.hotline_title")}
            </Link>
          ),
          email: () => (
            <Link useDefaultStyle href={`mailto:${t("common.app.contact_email")}`} target="_blank">
              {t("common.app.contact_email")}
            </Link>
          ),
        })}
      </div>
    </div>
  );
};

export default NewOrganizationNotification;
