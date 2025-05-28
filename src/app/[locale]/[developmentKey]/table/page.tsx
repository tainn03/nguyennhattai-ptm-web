"use client";

import { Fragment, useState } from "react";

import { Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@/components/atoms";
import { PageHeader, RadioGroup, TableFilterMenu } from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { FilterProperty } from "@/types/filter";

const UNIT_NAME_FILTER: FilterProperty[] = [
  {
    type: "text",
    name: "keyword",
    id: "keyword",
    value: "Bảo trì",
    placeholder: "Nhập nội dung cần tìm",
  },
];

const STATUS_FILTER: FilterProperty[] = [
  {
    label: "Đang sử dụng",
    type: "checkbox",
    name: "active",
    id: "active",
  },
  {
    label: "Không sử dụng",
    type: "checkbox",
    name: "inactive",
    id: "inactive",
  },
];

const CREATED_BY_OPTION: FilterProperty[] = [
  {
    type: "text",
    name: "keyword",
    id: "keyword",
    placeholder: "Nhập nội dung cần tìm",
  },
];

const CREATED_AT_OPTION: FilterProperty[] = [
  {
    label: "Từ ngày",
    type: "date",
    name: "fromDate",
    id: "fromDate",
    value: "2021-10-01",
  },
  {
    label: "Đến ngày",
    type: "text",
    name: "toDate",
    id: "toDate",
    value: "2021-10-31",
  },
];

const alignOptions: RadioItem[] = [
  {
    label: "left",
    value: "left",
  },
  {
    label: "center",
    value: "center",
  },
  {
    label: "right",
    value: "right",
  },
];

export default function Page() {
  const [dense, setDense] = useState(false);
  const [uppercase, setUppercase] = useState(false);
  const [variant, setVariant] = useState(false);
  const [hover, setHover] = useState(false);
  const [striped, setStriped] = useState(false);
  const [align, setAlign] = useState<RadioItem>(alignOptions[0]);

  return (
    <div>
      <PageHeader title="Table component" actionHorizontal />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-row flex-wrap place-content-center justify-start gap-x-4 py-5">
          <div>
            <h2 className="mb-4 text-sm font-medium text-gray-900">TableContainer prop</h2>
            <Checkbox checked={variant} onChange={() => setVariant((prev) => !prev)} label="variant = card" />
          </div>
          <div>
            <h2 className="mb-4 text-sm font-medium text-gray-900">Table prop</h2>
            <Checkbox checked={dense} onChange={() => setDense((prev) => !prev)} label="dense" />
          </div>
          <div>
            <h2 className="mb-4 text-sm font-medium text-gray-900">TableHead prop</h2>
            <Checkbox checked={uppercase} onChange={() => setUppercase((prev) => !prev)} label="uppercase" />
          </div>
          <div>
            <h2 className="mb-4 text-sm font-medium text-gray-900">TableRow prop</h2>
            <Checkbox checked={hover} onChange={() => setHover((prev) => !prev)} label="hover" />
            <Checkbox checked={striped} onChange={() => setStriped((prev) => !prev)} label="striped" />
          </div>
          <div>
            <h2 className="mb-4 text-sm font-medium text-gray-900">TableRow prop</h2>
            <RadioGroup
              name="align"
              value={align.value}
              items={alignOptions}
              onChange={(value: RadioItem) => setAlign(value)}
            />
          </div>
        </div>

        <TableContainer variant={variant ? "card" : "paper"}>
          <Table dense={dense}>
            <TableHead uppercase={uppercase}>
              <TableRow>
                <TableCell align={align.value as "left" | "center" | "right"}>ID</TableCell>
                <TableCell>
                  <div className="flex flex-nowrap items-center gap-2">
                    <span>Tên đơn vị tính</span>
                    <div className="relative float-right inline-flex">
                      <TableFilterMenu filters={UNIT_NAME_FILTER} />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-nowrap items-center gap-2">
                    <span>Trạng thái</span>
                    <div className="relative float-right inline-flex">
                      <TableFilterMenu filters={STATUS_FILTER} />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-nowrap items-center gap-2">
                    <span>Ngày tạo</span>
                    <div className="relative float-right inline-flex">
                      <TableFilterMenu filters={CREATED_AT_OPTION} />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-nowrap items-center gap-2">
                    <span>Người tạo</span>
                    <div className="relative float-right inline-flex">
                      <TableFilterMenu filters={CREATED_BY_OPTION} />
                    </div>
                  </div>
                </TableCell>
                <TableCell action>
                  <span className="sr-only">Hành động</span>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <Fragment />
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}
