import { AdministrativeUnitType, Prisma } from "@prisma/client";
import Excel from "exceljs";
import fse from "fs-extra";
import path from "path";

import { prisma } from "@/configs/prisma";

// Define a type for raw administrative unit data
type AdministrativeUnitRaw = {
  code: string;
  name: string;
  type: AdministrativeUnitType;
  parentCode?: string;
  level?: string;
};

// Define the batch size for data processing
const CHUNK_BATCH_SIZE = 500;

// Data file path
const ADMINISTRATIVE_UNIT_DATA_PATH = path.resolve("./src/seed/AdministrativeUnit/data_14_09_2023.xlsx");

// Max linked id of administrative unit
let maxLinkedIdOfAdministrativeUnit = 0;

/**
 * Read and parse data from an Excel file into an array of Prisma.AdministrativeUnitCreateInput objects.
 *
 * @param filePath - The path to the Excel file.
 * @returns A promise that resolves to an array of Prisma.AdministrativeUnitCreateInput objects.
 */
const readData = async (filePath: string): Promise<Prisma.AdministrativeUnitCreateInput[]> => {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filePath);

  const result: Prisma.AdministrativeUnitCreateInput[] = [];
  let country: Prisma.AdministrativeUnitCreateInput | undefined;
  const administrativeUnitMap = new Map<string, AdministrativeUnitRaw>();

  const worksheet = workbook.getWorksheet("VN");
  worksheet.eachRow((row: Excel.Row, rowNumber: number) => {
    if (rowNumber === 2) {
      country = {
        code: String(row.getCell("B").value),
        name: String(row.getCell("A").value),
        type: AdministrativeUnitType.COUNTRY,
        countryCode: String(row.getCell("C").value),
      };
      result.push(country);
    }

    // read city, district and ward info
    if (rowNumber > 4) {
      const cityName = String(row.getCell("A").value);
      const cityCode = String(row.getCell("B").value);
      administrativeUnitMap.set(cityCode, {
        code: cityCode,
        name: cityName,
        type: AdministrativeUnitType.CITY,
        parentCode: country?.code,
      });

      const districtName = String(row.getCell("C").value);
      const districtCode = String(row.getCell("D").value);
      administrativeUnitMap.set(districtCode, {
        code: districtCode,
        name: districtName,
        type: AdministrativeUnitType.DISTRICT,
        parentCode: cityCode,
      });

      const wardName = String(row.getCell("E").value);
      const wardCode = String(row.getCell("F").value);
      const level = String(row.getCell("G").value);
      administrativeUnitMap.set(wardCode, {
        code: wardCode,
        name: wardName,
        type: AdministrativeUnitType.WARD,
        parentCode: districtCode,
        level,
      });
    }
  });

  administrativeUnitMap.forEach((item) => {
    result.push({
      code: item.code,
      name: item.name,
      type: item.type,
      parentCode: item.parentCode,
      ...(item.level && { level: item.level }),
    });
  });

  return result;
};

/**
 * Import a batch of administrative unit data into the database and log progress.
 *
 * @param administrativeUnits - The batch of administrative units to import.
 * @param percent - The percentage of data processed.
 * @param userId - The logged in user id.
 * @returns A promise that resolves to the total count of records imported.
 */
const importDataBlock = async (
  administrativeUnits: Prisma.AdministrativeUnitCreateInput[],
  percent: number,
  userId: number
): Promise<number> => {
  const startTimeOfBatch = Date.now();

  // Insert data into database using prisma
  return await prisma.$transaction(
    async (prismaClient) => {
      const result = await prismaClient.administrativeUnit.createMany({
        data: administrativeUnits,
      });

      // Link userId with createdBy and updatedBy user
      const ids = await prismaClient.administrativeUnit.findMany({
        where: {
          id: { gt: maxLinkedIdOfAdministrativeUnit },
        },
        select: { id: true },
      });
      const createdOrUpdatedByUserData: Prisma.AdministrativeUnitsCreatedByUserLinksCreateInput[] = ids.map((item) => ({
        administrativeUnitId: item.id,
        userId,
      }));
      await prismaClient.administrativeUnitsCreatedByUserLinks.createMany({ data: createdOrUpdatedByUserData });
      await prismaClient.administrativeUnitsUpdatedByUserLinks.createMany({ data: createdOrUpdatedByUserData });
      maxLinkedIdOfAdministrativeUnit = Math.max(...ids.map(({ id }) => id));

      const duration = ((Date.now() - startTimeOfBatch) / 1000).toFixed(2);
      console.log(`Imported ${administrativeUnits.length} records in ${duration}s (${Number(percent.toFixed(2))}%)`);
      return result.count;
    },
    {
      maxWait: 10000, // default: 2000
      timeout: 30000, // default: 5000
    }
  );
};

/**
 * Import administrative unit data in chunks, using a specified batch size.
 *
 * @param administrativeUnits - The administrative units to import.
 * @param batchSize - The size of each batch for import.
 * @param userId - The logged in user id.
 * @returns A promise that resolves to the total count of records imported.
 */
const importData = async (
  administrativeUnits: Prisma.AdministrativeUnitCreateInput[],
  batchSize: number,
  userId: number
): Promise<number> => {
  let total = 0;
  let processedCount = 0;
  const buffer: Prisma.AdministrativeUnitCreateInput[] = [];
  for (let index = 0; index < administrativeUnits.length; index++) {
    const administrativeUnit = administrativeUnits[index];
    buffer.push(administrativeUnit);
    processedCount++;

    if (buffer.length >= batchSize || (index === administrativeUnits.length - 1 && buffer.length > 0)) {
      const percent = (processedCount / administrativeUnits.length) * 100;
      total += await importDataBlock(buffer, percent, userId);
      buffer.splice(0);
    }
  }
  return total;
};

/**
 * Main function for reading and importing administrative unit data from an Excel file.
 * @param userId - The logged in user id.
 */
const initialAdministrativeUnit = async (userId: number) => {
  const filePath = ADMINISTRATIVE_UNIT_DATA_PATH;
  console.log(`Read resource file: ${filePath}`);

  if (!fse.existsSync(filePath)) {
    throw new Error(`Resource file "${filePath}" does not exist.`);
  }

  const startReadTime = Date.now();
  // Read and format data before insert
  const administrativeUnits = (await readData(filePath)).map((item) => ({
    ...item,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  }));
  const readDuration = ((Date.now() - startReadTime) / 1000).toFixed(2);
  console.log(`Read ${administrativeUnits.length} records in ${readDuration}s`);

  // Import data
  const startImportTime = Date.now();
  const count = await importData(administrativeUnits, CHUNK_BATCH_SIZE, userId);
  const importDuration = ((Date.now() - startImportTime) / 1000).toFixed(2);
  console.log(`[AdministrativeUnit] Total of records ${count} in ${importDuration}s`);

  return count;
};

export default initialAdministrativeUnit;
