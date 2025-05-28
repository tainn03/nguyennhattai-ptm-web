import { EmailTemplateType, SMTPSetting, SMTPSettingSecurity } from "@prisma/client";
import Mustache from "mustache";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import { Options } from "nodemailer/lib/smtp-connection";

import { NEXTAUTH_URL } from "@/configs/environment";
import { APP_LOGO_PATH } from "@/constants/file";
import { getEmailTemplateByType } from "@/services/server/emailTemplate";
import { getSmtpSetting, getSmtpSettingByOrganizationId } from "@/services/server/smtpSetting";
import { AnyObject } from "@/types";
import { ApiError, HttpStatusCode } from "@/types/api";
import { LocaleType } from "@/types/locale";

import { getEmailRequestedDate } from "./date";
import { createTranslator } from "./locale";
import logger from "./logger";

/**
 * Get the default or organization-specific SMTP settings.
 *
 * @param organizationId ID organizationId.
 * @returns Install SMTP or undefined if not found.
 */
const getSMTPSetting = async (organizationId?: number): Promise<SMTPSetting | undefined> => {
  let data: SMTPSetting | undefined;
  if (organizationId) {
    data = await getSmtpSettingByOrganizationId(organizationId);
  }
  if (!data) {
    data = await getSmtpSetting();
  }
  return data;
};

export type EmailOptions = {
  toEmail: string | string[];
  type: EmailTemplateType;
  data?: AnyObject;
  organizationId?: number;
  locale?: LocaleType;
};

/**
 * Send an email using SMTP settings and email templates.
 *
 * @param options - Email options including recipient, type, and data.
 * @param silent - If silent is TRUE, always return false when error, otherwise will throw error exception
 * @returns A Promise that resolves to `true` if the email is sent successfully, or `false` otherwise.
 */
export const sendEmail = async (options: EmailOptions, silent = true) => {
  try {
    const smtp = await getSMTPSetting(options.organizationId);
    if (!smtp) {
      throw new ApiError(HttpStatusCode.InternalServerError, "SMTP configuration information cannot be found.");
    }
    const template = await getEmailTemplateByType(options.type, options.locale);
    if (!template) {
      throw new ApiError(HttpStatusCode.InternalServerError, "The corresponding email template cannot be found.");
    }

    // format options conned
    const { server, port, authenticationEnabled, username, password, security, timeout, fromName, fromEmail } = smtp;
    const { subject, body } = template;
    const optionsConned: Options = {
      host: server || undefined,
      port: port || undefined,
    };
    if (authenticationEnabled && username && password) {
      optionsConned.auth = {
        user: username,
        pass: password,
      };
    }
    switch (security) {
      case SMTPSettingSecurity.SSL_TLS:
        optionsConned.secure = false;
        break;
      case SMTPSettingSecurity.STARTTLS:
        optionsConned.ignoreTLS = false;
        break;
      case SMTPSettingSecurity.NONE:
        optionsConned.secure = false;
        break;
      case SMTPSettingSecurity.AUTO:
      default:
        break;
    }

    if (timeout) {
      optionsConned.connectionTimeout = timeout;
    }

    const transporter = nodemailer.createTransport(optionsConned);

    // format options sendMail
    const mainOptions: Mail.Options = {
      to: options.toEmail,
      replyTo: "noreply@autotms.vi",
    };
    if (fromEmail) {
      mainOptions.from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    }
    const t = await createTranslator(options.locale);
    const viewData = {
      ...options.data,
      subject,
      appName: t("common.app.name") || "AUTOTMS",
      logoUrl: `${NEXTAUTH_URL}${APP_LOGO_PATH}`,
      requestedAt: getEmailRequestedDate(),
    };
    if (subject) {
      mainOptions.subject = Mustache.render(subject, viewData);
      viewData.subject = mainOptions.subject;
    }
    if (body) {
      mainOptions.html = Mustache.render(body, viewData);
    }

    // send email
    const result = await transporter.sendMail(mainOptions);

    transporter.close();
    return result;
  } catch (error) {
    const { stack, message } = error as ApiError;
    logger.error(`#sendEmail: ${stack || message}`);
    if (silent) {
      return false;
    }
    throw error;
  }
};
