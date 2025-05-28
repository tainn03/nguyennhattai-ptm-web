"use client";

import { Menu, Transition } from "@headlessui/react";
import { DocumentTextIcon, EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useParams } from "next/navigation";
import { Fragment } from "react";
import { BiSolidFileExport } from "react-icons/bi";

import { Link } from "@/components/atoms";

export type statisticDriverMenuProps = {
  code: string;
};

const StatisticDriverMenu = ({ code }: statisticDriverMenuProps) => {
  const { orgId } = useParams();
  // const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  return (
    <>
      <Menu as="div" className="relative inline-block">
        <div>
          <Menu.Button className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <span className="sr-only">Open options</span>
            <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
          </Menu.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <Link
                    useDefaultStyle
                    href={`/orgs/${orgId}/reports/drivers/${code}?start=1-1-2023&end=1-2-2023`}
                    className={clsx("flex px-4 py-2 text-sm", {
                      "bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                    })}
                  >
                    <DocumentTextIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                    <span>Chi tiết bản kê</span>
                  </Link>
                )}
              </Menu.Item>
              {/* <Menu.Item>
                {({ active }) => (
                  <Link
                    href={`/orgs/${orgId}/orders/edit/${code}`}
                    className={clsx("flex px-4 py-2 text-sm", {
                      "bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                    })}
                  >
                    <PencilSquareIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                    <span>Cập nhật đơn hàng</span>
                  </Link>
                )}
              </Menu.Item> */}
              <Menu.Item>
                {({ active }) => (
                  <Link
                    useDefaultStyle
                    href="/assets/files/example.docx"
                    target="_blank"
                    className={clsx("flex px-4 py-2 text-sm", {
                      "bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                    })}
                  >
                    <BiSolidFileExport className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                    <span>Xuất file excel</span>
                  </Link>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
      {/* <DeleteOrderModal
        order="DH001"
        open={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={() => setDeleteModalOpen(false)}
      /> */}
    </>
  );
};

export default StatisticDriverMenu;
