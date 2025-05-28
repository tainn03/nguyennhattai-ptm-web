import { Prisma } from "@prisma/client";
import fse from "fs-extra";
import path from "path";

import { prisma } from "@/configs/prisma";

// Import file json
import emailTemplateData from "./data.json";

const TEMPLATE_FOLDER_PATH = path.resolve("./src/seed/EmailTemplate");

/**
 * Format an email template by reading its content from a file and setting additional properties.
 *
 * @param - The email template to format.
 * @returns A Promise that resolves with the formatted email template.
 */
const formatTemplate = async (
  emailTemplate?: Prisma.EmailTemplateCreateInput
): Promise<Prisma.EmailTemplateCreateInput | false> => {
  if (!emailTemplate || !emailTemplate.body) {
    return false;
  }
  const result = {
    ...emailTemplate,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  };
  const filePath = path.join(TEMPLATE_FOLDER_PATH, emailTemplate.body);
  try {
    const fileContent = await fse.readFile(filePath, "utf8");
    result.body = fileContent;
  } catch (err) {
    console.error(`The error occurred when reading data from ${filePath}:`, err);
  }
  return result;
};

/**
 * Import data into the database.
 *
 * @param data - An array of EmailTemplateCreateInput objects to import.
 * @param userId - The logged in user id.
 * @returns A Promise that resolves with the number of records imported.
 */
const importData = async (data: Prisma.EmailTemplateCreateInput[], userId: number): Promise<number> => {
  const startTimeOfBatch = Date.now();
  return await prisma.$transaction(
    async (prismaClient) => {
      const result = await prismaClient.emailTemplate.createMany({ data });

      // Link userId with createdBy and updatedBy user
      const ids = await prismaClient.emailTemplate.findMany({
        select: { id: true },
      });
      const createdOrUpdatedByUserData: Prisma.EmailTemplatesCreatedByUserLinksCreateInput[] = ids.map((item) => ({
        emailTemplateId: item.id,
        userId,
      }));
      await prismaClient.emailTemplatesCreatedByUserLinks.createMany({ data: createdOrUpdatedByUserData });
      await prismaClient.emailTemplatesUpdatedByUserLinks.createMany({ data: createdOrUpdatedByUserData });

      const duration = ((Date.now() - startTimeOfBatch) / 1000).toFixed(2);
      console.log(`Imported ${result.count} records in ${duration}s`);

      return result.count;
    },
    {
      maxWait: 5000, // default: 2000
      timeout: 10000, // default: 5000
    }
  );
};

/**
 * Main function for reading and importing administrative unit data from an Excel file.
 * @param userId - The logged in user id.
 */
const initialEmailTemplate = async (userId: number) => {
  const result: Prisma.EmailTemplateCreateInput[] = [];

  // format template and convert template email body
  for (let i = 0; i < emailTemplateData.length; i++) {
    const data = await formatTemplate(emailTemplateData[i] as Prisma.EmailTemplateCreateInput);
    data && result.push(data);
  }
  if (!result.length) {
    return false;
  }

  // Import data into MySQL
  const startImportTime = Date.now();
  const count = await importData(result, userId);
  const importDuration = ((Date.now() - startImportTime) / 1000).toFixed(2);
  console.log(`[EmailTemplate] Total of records ${count} in ${importDuration}s`);

  return count;
};

export default initialEmailTemplate;
