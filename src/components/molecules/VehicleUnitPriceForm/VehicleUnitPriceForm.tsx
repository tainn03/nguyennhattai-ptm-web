"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { SkeletonTableRow, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@/components/atoms";
import { EmptyListSection, NumberField } from "@/components/molecules";
import { VehicleTypeInfo } from "@/types/strapi";

const VehicleUnitPriceForm = () => {
  const t = useTranslations();
  const [vehicleTypes, _setVehicleTypes] = useState<Partial<VehicleTypeInfo>[]>([
    {
      id: 1,
      name: "2T",
    },
    {
      id: 2,
      name: "3T",
    },
  ]);
  const [isLoading, _setIsLoading] = useState(false);

  return (
    <>
      <div className="col-span-full">
        <label className="whitespace-nowrap text-sm font-medium leading-6 text-gray-900">Đơn giá theo chuyến</label>
        <TableContainer className="!my-0" inside variant="paper">
          <Table dense={!isLoading}>
            <TableHead>
              <TableRow>
                <TableCell className="w-5" align="left">
                  STT
                </TableCell>
                <TableCell className="w-56">Loại xe</TableCell>
                <TableCell className="w-56">Đơn giá</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton */}
              {isLoading && vehicleTypes.length === 0 && <SkeletonTableRow rows={5} columns={3} />}

              {/* Empty data */}
              {!isLoading && vehicleTypes.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={3} className="px-6 lg:px-8">
                    <EmptyListSection description={t("common.empty_list")} />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {!isLoading &&
                vehicleTypes.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell align="left">{index + 1}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <NumberField
                        name={`pricings_${item.id}.price`}
                        value={null}
                        suffixText={t("common.unit.currency")}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </>
  );
};

export default VehicleUnitPriceForm;
