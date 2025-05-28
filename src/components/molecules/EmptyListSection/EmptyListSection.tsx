"use client";

import { InboxIcon, PlusIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { ElementType, ReactNode } from "react";

import { Link } from "@/components/atoms";
import { Button } from "@/components/molecules";

export type EmptyListSectionProps = {
  title?: string;
  description?: ReactNode;
  icon?: ElementType | false;
  actionLabel?: string;
  actionLink?: string;
  className?: string;
  onClick?: () => void;
  showCreationSuggestion?: boolean;
};

const EmptyListSection = ({
  title,
  description,
  icon: Icon = InboxIcon,
  actionLabel,
  actionLink,
  onClick,
  className,
  showCreationSuggestion = true,
}: EmptyListSectionProps) => {
  const t = useTranslations();

  return (
    <div className={clsx(className, "mx-auto my-6 max-w-lg text-center")}>
      {Icon && <Icon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />}
      <h3 className="mt-2 text-sm font-semibold text-gray-900">
        {title || t("components.empty_list_section.not_found_title")}
      </h3>
      <p className={clsx("mt-1 whitespace-pre-wrap text-sm text-gray-500", { "mx-1": !description })}>
        {description ? (
          description
        ) : (
          <>
            {t("components.empty_list_section.not_found_message")}
            {showCreationSuggestion &&
              t.rich("components.empty_list_section.creation_suggestion_message", {
                strong: (chunks) => <span className="font-bold">{chunks}</span>,
                new: t("common.new"),
              })}
          </>
        )}
      </p>
      {(onClick || actionLink) && (
        <div className="mt-6">
          {onClick && (
            <Button size="small" type="button" icon={PlusIcon} onClick={onClick}>
              {actionLabel || t("common.new")}
            </Button>
          )}
          {actionLink && (
            <Button size="small" type="button" as={Link} icon={PlusIcon} href={actionLink}>
              {actionLabel || t("common.new")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyListSection;
