import { EmailTemplate, EmailTemplateType } from "@prisma/client";
import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { LocaleType } from "@/types/locale";
import { fetcher } from "@/utils/graphql";

/**
 * Retrieve an email template by its type and locale.
 *
 * @param type - The type of the email template to retrieve.
 * @param locale - The locale of the email template to retrieve.
 * @returns A Promise that resolves to the retrieved email template or undefined if not found.
 */
export const getEmailTemplateByType = async (
  type: EmailTemplateType,
  locale: LocaleType = DEFAULT_LOCALE
): Promise<EmailTemplate | undefined> => {
  const query = gql`
    query ($type: String!) {
      emailTemplates(filters: { type: { eq: $type }, isActive: { eq: true } }) {
        data {
          id
          attributes {
            name
            locale
            type
            subject
            body
          }
        }
      }
    }
  `;
  const { data } = await fetcher<EmailTemplate[]>(STRAPI_TOKEN_KEY, query, { type });
  return data.emailTemplates.find((item) => !locale || (locale && item.locale === locale));
};
