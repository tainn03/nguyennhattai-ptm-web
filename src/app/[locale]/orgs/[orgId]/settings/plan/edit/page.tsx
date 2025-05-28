"use client";

import { RadioGroup } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useRouter } from "next-intl/client";
import { useState } from "react";

import { Link } from "@/components/atoms";
import { SectionHeader } from "@/components/molecules";

const frequencies = [
  { value: "monthly", label: "Thanh toán theo tháng", priceSuffix: "₫ xe/tháng" },
  { value: "annually", label: "Thanh toán theo năm", priceSuffix: "₫ xe/năm" },
];

const tiers = (orgId: string) => [
  {
    name: "Cơ bản",
    id: "basic",
    href: `/orgs/${orgId}/settings/plan/checkout`,
    price: { monthly: "100,000", annually: "1,200,000", annuallyPromotion: "1,000,000" },
    description: "Đảm bảo các chức năng cần thiết để vận hành doanh nghiệp vận tải của bạn.",
    features: [
      "Dữ liệu được lưu trữ trong vòng 1 năm",
      "Hỗ trợ các báo cáo thống kê cơ bản",
      "Phản hồi hỗ trợ trong vòng 48 giờ",
      "Tự động thay đổi logo, tên doanh nghiệp trong mẫu báo cáo",
    ],
    mostPopular: false,
  },
  {
    name: "Tiêu chuẩn",
    id: "standard",
    href: `/orgs/${orgId}/settings/plan/checkout`,
    price: { monthly: "150,000", annually: "1,800,000", annuallyPromotion: "1,500,000" },
    setupFee: { price: "+2,000,000", description: "phí khởi tạo dịch vụ" },
    description: "Giải pháp phù hợp với nhu cầu mở rộng của doanh nghiệp đang phát triển.",
    features: [
      "Dữ liệu được lưu trữ trong vòng 3 năm",
      "Hỗ trợ các báo cáo thống kê nâng cao",
      "Phản hồi hỗ trợ trong vòng 24 giờ",
      "Tùy chỉnh mẫu báo cáo theo mong muốn",
      "Tùy chỉnh các trường nhập liệu riêng biệt cho doanh nghiệp",
    ],
    mostPopular: true,
  },
  {
    name: "Nâng cao",
    id: "advanced",
    href: "/#get-in-touch",
    // price: { monthly: "200,000", annually: "2,400,000", annuallyPromotion: "2,000,000" },
    description: "Sử dụng cơ sở hạ tầng đặc biệt dành riêng cho doanh nghiệp của bạn.",
    features: [
      "Không giới hạn thời gian lưu trữ dữ liệu",
      "Hỗ trợ các báo cáo thống kê nâng cao",
      "Hỗ trợ nhanh chóng trong vòng 4 giờ",
      "Tùy chỉnh mẫu báo cáo theo mong muốn",
      "Tùy chỉnh các trường nhập liệu riêng biệt cho doanh nghiệp",
      "Thay đổi domain, logo hệ thống theo nhu cầu của doanh nghiệp",
    ],
    mostPopular: false,
  },
];

export default function Page({ params }: { params: { orgId: string } }) {
  const { orgId } = params;
  const router = useRouter();
  const [frequency, setFrequency] = useState(frequencies[0]);

  return (
    <div>
      <SectionHeader
        showBorderBottom
        title="Thay đổi gói dịch vụ"
        description="Xem thông tin chi tiết và tùy chỉnh gói dịch vụ theo nhu cầu của bạn, bao gồm các tính năng và khả năng quản lý phù hợp."
      />

      <div className="mt-6">
        <div className="flex justify-center">
          <RadioGroup
            value={frequency}
            onChange={setFrequency}
            className="grid grid-cols-2 gap-x-1 rounded-full p-1 text-center text-xs font-semibold leading-5 ring-1 ring-inset ring-gray-200"
          >
            <RadioGroup.Label className="sr-only">Payment frequency</RadioGroup.Label>
            {frequencies.map((option) => (
              <RadioGroup.Option
                key={option.value}
                value={option}
                className={({ checked }) =>
                  clsx("cursor-pointer rounded-full px-2.5 py-1", {
                    "bg-indigo-600 text-white": checked,
                    "text-gray-500": !checked,
                  })
                }
              >
                <span>{option.label}</span>
              </RadioGroup.Option>
            ))}
          </RadioGroup>
        </div>
        <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {tiers(orgId).map((tier) => (
            <div
              key={tier.id}
              className={clsx("rounded-3xl p-8 xl:p-10", {
                "ring-2 ring-indigo-600": tier.mostPopular,
                "ring-1 ring-gray-200": !tier.mostPopular,
              })}
            >
              <div className="flex items-center justify-between gap-x-4">
                <h3
                  id={tier.id}
                  className={clsx("text-lg font-semibold leading-8", {
                    "text-indigo-600": tier.mostPopular,
                    "text-gray-900": !tier.mostPopular,
                  })}
                >
                  {tier.name}
                </h3>
                {tier.mostPopular && (
                  <p className="rounded-full bg-indigo-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-indigo-600">
                    Phổ biến nhất
                  </p>
                )}
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">{tier.description}</p>

              {tier.price && (
                <>
                  {(tier.price as never)[`${frequency.value}Promotion`] && (
                    <>
                      <p className="mt-6 flex flex-wrap items-baseline gap-x-1">
                        <span className="text-3xl font-bold tracking-tight text-gray-500 line-through lg:text-2xl">
                          {(tier.price as never)[frequency.value]}
                        </span>
                        <span className="whitespace-nowrap text-sm font-semibold leading-6 text-gray-500 line-through">
                          ₫
                        </span>
                      </p>
                    </>
                  )}
                  <p
                    className={clsx("flex flex-wrap items-baseline gap-x-1", {
                      "mt-6": !(tier.price as never)[`${frequency.value}Promotion`],
                    })}
                  >
                    <span className="text-4xl font-bold tracking-tight text-gray-900 lg:text-3xl">
                      {(tier.price as never)[`${frequency.value}Promotion`]
                        ? (tier.price as never)[`${frequency.value}Promotion`]
                        : (tier.price as never)[frequency.value]}
                    </span>
                    <span className="whitespace-nowrap text-sm font-semibold leading-6 text-gray-600">
                      {frequency.priceSuffix}
                    </span>
                    {tier.setupFee && (
                      <span className="block w-full text-sm font-semibold text-gray-600">
                        {tier.setupFee.price} {tier.setupFee.description}
                      </span>
                    )}
                  </p>
                </>
              )}
              <Link
                useDefaultStyle={false}
                href={tier.href}
                aria-describedby={tier.id}
                className={clsx(
                  "mt-6 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
                  {
                    "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500": tier.mostPopular,
                    "text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300": !tier.mostPopular,
                  }
                )}
              >
                {tier.id === "advanced" ? "Liên hệ" : "Mua gói"}
              </Link>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600 xl:mt-10">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <CheckIcon className="h-6 w-5 flex-none text-indigo-600" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-gray-900/ mt-6 flex items-center justify-between gap-x-6 border-t pt-6">
        <div>
          <button
            type="button"
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            onClick={() => router.push(`/orgs/${orgId}/settings/plan`)}
          >
            Trở về
          </button>
        </div>
        <Link
          useDefaultStyle={false}
          href={`/orgs/${orgId}/settings/plan/comparison`}
          className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
        >
          So sánh tính năng
        </Link>
        {/* <button
          type="button"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => router.push(`/orgs/${orgId}/dashboard`)}
        >
          Hoàn thành
        </button> */}
      </div>
    </div>
  );
}
