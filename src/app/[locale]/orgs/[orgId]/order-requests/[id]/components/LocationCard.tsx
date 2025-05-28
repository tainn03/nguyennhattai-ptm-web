import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, memo } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  InfoBox,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { AnyObject } from "@/types";

type LocationCardProps = {
  title: string;
  isLoading: boolean;
  locations: AnyObject[];
};

const LocationCard = ({ title, isLoading, locations = [] }: LocationCardProps) => {
  function formatAddress(address?: string) {
    return address || "Không có địa chỉ";
  }

  return (
    <Card className="col-span-full">
      <CardHeader title={title} />
      <CardContent padding={false}>
        <TableContainer variant="paper" className="!mt-0">
          <Table dense={!isLoading}>
            <TableHead uppercase>
              <TableRow>
                <TableCell align="right" className="w-12 pl-2 sm:!pl-0">
                  <span className="sr-only">Mở rộng</span>
                </TableCell>
                <TableCell className="min-w-[6rem] max-w-[10rem]">Người liên hệ</TableCell>
                <TableCell>Điện thoại</TableCell>
                <TableCell>Địa chỉ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y divide-gray-200 bg-white">
              {isLoading && (!locations || locations.length === 0) && <SkeletonTableRow rows={3} columns={4} />}

              {(locations || []).map((point) => (
                <Disclosure key={point.id} as={Fragment}>
                  {({ open }) => (
                    <Fragment key={`point-${point.id}`}>
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
                        <TableCell className="max-w-[10rem]">
                          <InfoBox label={point.contactName} />
                        </TableCell>
                        <TableCell>{point.phone}</TableCell>
                        <TableCell>{formatAddress(point.address)}</TableCell>
                      </Disclosure.Button>

                      <Disclosure.Panel as="tr">
                        <TableCell colSpan={4} className="p-4">
                          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                            <div className="col-span-full px-4">
                              <DescriptionProperty2 label="Email">{point.email}</DescriptionProperty2>
                              <DescriptionProperty2 label="Ghi chú">{point.note}</DescriptionProperty2>
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

export default memo(LocationCard);
