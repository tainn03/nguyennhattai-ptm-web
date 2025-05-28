import { driverReportTemps } from "@/constants/prototype";
import { AnyObject } from "@/types";
import { randomInt } from "@/utils/number";
import { generateRandomDriver } from "@/utils/prototype";

const generateUserDetails = () => {
  const driver = generateRandomDriver().split(" ");
  return {
    lastName: driver[0],
    firstName: driver.slice(1).join(" "),
  };
};

export const workflowsFetcher = async (): Promise<AnyObject[]> => {
  const workflows = [
    "Quy trình xuất khẩu hàng hóa",
    "Quy trình nhập khẩu hàng hóa",
    "Quy trình vận chuyển hàng hóa tại cảng Cam Ranh",
    "Quy trình vận chuyển hàng hóa tại cảng Cát Lái",
    "Quy trình vận chuyển hàng hóa tại cảng Hải Phòng",
  ];

  return workflows.map((name, index) => ({
    id: index + 1,
    name,
    status: index % 2 === 0,
    createdByUser: { detail: generateUserDetails() },
    createdAt: new Date(),
    updatedByUser: { detail: generateUserDetails() },
    updatedAt: new Date(),
  }));
};

export const workflowFetcher = async (): Promise<AnyObject> => {
  const user = generateUserDetails();

  return {
    id: randomInt(1, 10),
    name: "Quy trình xuất khẩu hàng hóa",
    description: "Danh sách các bước thực hiện quy trình xuất khẩu hàng hoá. Mỗi bước là một công việc cụ thể.",
    driverReports: driverReportTemps,
    isActive: true,
    createdByUser: { detail: user },
    createdAt: new Date(),
    updatedByUser: { detail: user },
    updatedAt: new Date(),
  };
};
