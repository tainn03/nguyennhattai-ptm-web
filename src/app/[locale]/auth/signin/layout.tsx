import { Metadata } from "next";
import { cookies } from "next/headers";
import { createTranslator } from "next-intl";

import { COOKIE_ORGANIZATION_CODE } from "@/constants/storage";
import SignInProvider from "@/providers/SignInProvider";
import { getBasicOrganizationByCodeOrAlias } from "@/services/server/organization";
import { DefaultReactProps, GenerateMetadataProps } from "@/types";
import { OrganizationInfo } from "@/types/strapi";
import { getMessages } from "@/utils/locale";

export async function generateMetadata({ params: { locale } }: GenerateMetadataProps): Promise<Metadata> {
  const messages = await getMessages(locale);
  const t = createTranslator({ locale, messages });

  return {
    title: t("sign_in.browser_title"),
  };
}

export default async function Layout({ children }: DefaultReactProps) {
  const cookieStore = cookies();
  const orgCode = cookieStore.get(COOKIE_ORGANIZATION_CODE);
  let organization: OrganizationInfo | undefined;
  if (orgCode?.value) {
    organization = await getBasicOrganizationByCodeOrAlias(orgCode.value);
  }

  return <SignInProvider organization={organization}>{children}</SignInProvider>;
}
