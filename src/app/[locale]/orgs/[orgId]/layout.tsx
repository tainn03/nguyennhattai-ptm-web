import { Metadata } from "next";
import { createTranslator } from "next-intl";

import { AuthorizationProvider } from "@/providers";
import { DefaultReactProps, GenerateMetadataProps } from "@/types";
import { getMessages } from "@/utils/locale";
import { getCurrentOrganizationMemberInfo } from "@/utils/server";

export async function generateMetadata({ params: { locale } }: GenerateMetadataProps): Promise<Metadata> {
  const messages = await getMessages(locale);
  const t = createTranslator({ locale, messages });

  return {
    title: {
      template: t("common.app.browser_title_template"),
      default: t("org_welcome.title"),
    },
  };
}

export default async function Layout({ children, params }: DefaultReactProps) {
  const currentOrganizationMemberInfo = await getCurrentOrganizationMemberInfo(params?.orgId);

  return <AuthorizationProvider organizationMember={currentOrganizationMemberInfo}>{children}</AuthorizationProvider>;
}
