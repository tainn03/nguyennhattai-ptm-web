import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, memo } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  NumberLabel,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { AnyObject } from "@/types";

type ItemCardProps = {
  isLoading: boolean;
  items: AnyObject[];
};

const ItemCard = ({ isLoading, items }: ItemCardProps) => {
  return (
    <Card className="col-span-full">
      <CardHeader title="Danh sách hàng hóa" />
      <CardContent padding={false}>
        <TableContainer variant="paper" className="!mt-0">
          <Table dense={!isLoading}>
            <TableHead uppercase>
              <TableRow>
                <TableCell className="w-4">
                  <span className="sr-only">Mở rộng</span>
                </TableCell>
                <TableCell align="right" className="w-12 pl-2 sm:!pl-0">
                  STT
                </TableCell>
                <TableCell className="min-w-[6rem] max-w-[10rem]">Mã</TableCell>
                <TableCell className="min-w-[6rem] max-w-[10rem]">Tên hàng hoá</TableCell>
                <TableCell>Loại hàng hóa</TableCell>
                <TableCell>Quy cách đóng gói</TableCell>
                <TableCell>Khối lượng</TableCell>
                <TableCell>Số lượng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y divide-gray-200 bg-white">
              {isLoading && (!items || items.length === 0) && <SkeletonTableRow rows={3} columns={5} />}

              {(items || []).map((item, index) => (
                <Disclosure key={item.id} as={Fragment}>
                  {({ open }) => (
                    <Fragment key={`item-${item.id}`}>
                      <Disclosure.Button
                        as="tr"
                        className={clsx({
                          "bg-blue-50": open,
                          "hover:bg-gray-50": !open,
                        })}
                      >
                        <TableCell align="center" className="px-3 py-3.5">
                          <span className="ml-2 flex items-center">
                            {open ? (
                              <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            ) : (
                              <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            )}
                          </span>
                        </TableCell>
                        <TableCell align="center">{index + 1}</TableCell>
                        <TableCell className="max-w-[10rem]">{item.code}</TableCell>
                        <TableCell className="max-w-[10rem]">{item.name}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.packaging}</TableCell>
                        <TableCell>
                          <NumberLabel value={item.weight} unit="kg" showUnitWhenEmpty={false} />
                        </TableCell>
                        <TableCell>
                          <NumberLabel value={item.quantity} unit={item.unit} showUnitWhenEmpty={false} />
                        </TableCell>
                      </Disclosure.Button>

                      {/* Mở rộng chi tiết */}
                      <Disclosure.Panel as="tr">
                        <TableCell colSpan={5} className="p-4">
                          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                            <div className="col-span-full px-4">
                              <DescriptionProperty2 label="Ghi chú">{item.notes || "Không có"}</DescriptionProperty2>
                            </div>
                          </div>
                        </TableCell>
                      </Disclosure.Panel>
                    </Fragment>
                  )}
                </Disclosure>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default memo(ItemCard);
