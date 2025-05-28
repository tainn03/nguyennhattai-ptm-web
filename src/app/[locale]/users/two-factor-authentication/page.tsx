"use client";

import { EnvelopeIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

import { Link } from "@/components/atoms";
import { InputGroup } from "@/components/molecules";
import { ConfirmModal, VerificationModal } from "@/components/organisms";
import { useBreadcrumb } from "@/redux/actions";
import { withAuth } from "@/utils/client";

export default withAuth(() => {
  const { setBreadcrumb } = useBreadcrumb();
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    setBreadcrumb([
      { name: "Tài khoản", link: "/users/profile" },
      { name: "Bảo mật 2 lớp", link: "/users/two-factor-authentication" },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <form>
        <div className="space-y-12">
          <InputGroup
            title="Bảo mật 2 lớp"
            description="Bảo vệ tài khoản của bạn bằng cách sử dụng hai lớp xác thực khác nhau. Sau khi kích hoạt bạn cần cung cấp thông tin đăng nhập và mã xác thực để đăng nhập hệ thống."
          >
            <div className="col-span-full">
              <div className="rounded-md bg-red-50 p-4">
                <div className="md:flex md:justify-between">
                  <p className="text-sm text-red-800">
                    Vui lòng cập nhật email hoặc số điện thoại của bạn trước khi thực hiện việc kích hoạt bảo mật hai
                    lớp.
                  </p>
                  <p className="mt-3 text-sm md:ml-6 md:mt-0">
                    <Link
                      useDefaultStyle={false}
                      href="/users/profile#contact-information"
                      scroll
                      className="whitespace-nowrap font-medium text-red-800 hover:text-red-600"
                    >
                      Cập nhật ngay
                      <span aria-hidden="true"> &rarr;</span>
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-full">
              <h2 className="text-sm font-medium leading-6 text-gray-900">Kích hoạt / Hủy kích hoạt</h2>
              <p className="mt-1 text-sm text-gray-500">
                Bạn có thể lựa chọn kích hoạt hoặc hủy kích hoạt cùng lúc cho cả email và số điện thoại.
              </p>

              <ul role="list" className="mt-6 divide-y divide-gray-100 border-t border-gray-200 text-sm leading-6">
                <li className="flex justify-between gap-x-6 py-6">
                  <div className="flex flex-row items-center gap-x-3 font-medium text-gray-900">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    email@example.com
                    <span className="-ml-1 inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      Đã xác thực
                    </span>
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-red-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    onClick={() => setConfirmModalOpen(true)}
                  >
                    Hủy kích hoạt
                  </button>
                </li>
                <li className="flex justify-between gap-x-6 py-6">
                  <div className="flex flex-row items-center gap-x-3 font-medium text-gray-900">
                    <PhoneIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    0123456789
                    <span className="-ml-1 inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                      Chưa xác thực
                    </span>
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    onClick={() => setVerifyModalOpen(true)}
                  >
                    Kích hoạt
                  </button>
                </li>
              </ul>
            </div>
          </InputGroup>
        </div>
      </form>

      <VerificationModal
        open={verifyModalOpen}
        confirmType="email"
        onCancel={() => setVerifyModalOpen(false)}
        onConfirm={() => setVerifyModalOpen(false)}
      />

      <ConfirmModal
        open={confirmModalOpen}
        icon="error"
        color="error"
        title="Xác nhận hủy kích hoạt"
        message="Hành động này sẽ tắt tính năng bảo mật 2 lớp, hệ thống sẽ không yêu cầu cung cấp mã xác thực mỗi khi đăng nhập. Bạn có chắc chắn muốn hủy kích hoạt Bảo mật 2 lớp?"
        onClose={() => setConfirmModalOpen(false)}
        onCancel={() => setConfirmModalOpen(false)}
        onConfirm={() => setConfirmModalOpen(false)}
      />
    </>
  );
});
