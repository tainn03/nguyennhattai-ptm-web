"use client";

import { useRouter } from "next/router";

import { withOrg } from "@/utils/client";

// TODO
// import { CheckIcon, MinusIcon } from "@heroicons/react/24/outline";
// import clsx from "clsx";
// import { useRouter } from "next-intl/client";
// import { Link } from "@/components/atoms";
// import { Fragment, useState } from "react";

// import { SectionHeader } from "@/components/molecules";

// const frequencies = [
//   { value: "monthly", label: "Thanh toán theo tháng", priceSuffix: "₫ xe/tháng" },
//   { value: "annually", label: "Thanh toán theo năm", priceSuffix: "₫ xe/năm" },
// ];

// const tiers = (orgId: string) => [
//   {
//     name: "Cơ bản",
//     id: "basic",
//     href: `/orgs/${orgId}/settings/plan/checkout`,
//     price: { monthly: "100,000", annually: "1,200,000", annuallyPromotion: "1,000,000" },
//     description: "Đảm bảo các chức năng cần thiết để vận hành doanh nghiệp vận tải của bạn.",
//     features: [
//       "Dữ liệu được lưu trữ trong vòng 1 năm",
//       "Hỗ trợ các báo cáo thống kê cơ bản",
//       "Phản hồi hỗ trợ trong vòng 48 giờ",
//       "Tự động thay đổi logo, tên doanh nghiệp trong mẫu báo cáo",
//     ],
//     mostPopular: false,
//   },
//   {
//     name: "Tiêu chuẩn",
//     id: "standard",
//     href: `/orgs/${orgId}/settings/plan/checkout`,
//     price: { monthly: "150,000", annually: "1,800,000", annuallyPromotion: "1,500,000" },
//     setupFee: { price: "+2,000,000", description: "phí khởi tạo dịch vụ" },
//     description: "Giải pháp phù hợp với nhu cầu mở rộng của doanh nghiệp đang phát triển.",
//     features: [
//       "Dữ liệu được lưu trữ trong vòng 3 năm",
//       "Hỗ trợ các báo cáo thống kê nâng cao",
//       "Phản hồi hỗ trợ trong vòng 24 giờ",
//       "Tùy chỉnh mẫu báo cáo theo mong muốn",
//       "Tùy chỉnh các trường nhập liệu riêng biệt cho doanh nghiệp",
//     ],
//     mostPopular: true,
//   },
//   {
//     name: "Nâng cao",
//     id: "advanced",
//     href: "/#get-in-touch",
//     // price: { monthly: "200,000", annually: "2,400,000", annuallyPromotion: "2,000,000" },
//     description: "Sử dụng cơ sở hạ tầng đặc biệt dành riêng cho doanh nghiệp của bạn.",
//     features: [
//       "Không giới hạn thời gian lưu trữ dữ liệu",
//       "Hỗ trợ các báo cáo thống kê nâng cao",
//       "Hỗ trợ nhanh chóng trong vòng 4 giờ",
//       "Tùy chỉnh mẫu báo cáo theo mong muốn",
//       "Tùy chỉnh các trường nhập liệu riêng biệt cho doanh nghiệp",
//       "Thay đổi domain, logo hệ thống theo nhu cầu của doanh nghiệp",
//     ],
//     mostPopular: false,
//   },
// ];

// const sections = [
//   {
//     name: "Features",
//     features: [
//       { name: "Integrations", tiers: { basic: true, standard: true, advanced: true } },
//       { name: "Shared links", tiers: { basic: true, standard: true, advanced: true } },
//       { name: "Importing and exporting", tiers: { standard: true, advanced: true } },
//       { name: "Team members", tiers: { standard: "Up to 20 users", advanced: "Up to 50 users" } },
//       { name: "Lưu trữ dữ liệu", tiers: { standard: "Up to 20 users", advanced: "Up to 50 users" } },
//     ],
//   },
//   {
//     name: "Reporting",
//     features: [
//       { name: "Advanced analytics", tiers: { basic: true, standard: true, advanced: true } },
//       { name: "Basic reports", tiers: { standard: true, advanced: true } },
//       { name: "Professional reports", tiers: { advanced: true } },
//       { name: "Custom report builder", tiers: { advanced: true } },
//     ],
//   },
//   {
//     name: "Support",
//     features: [
//       { name: "24/7 online support", tiers: { basic: true, standard: true, advanced: true } },
//       { name: "Quarterly product workshops", tiers: { standard: true, advanced: true } },
//       { name: "Priority phone support", tiers: { standard: true, advanced: true } },
//       { name: "1:1 onboarding tour", tiers: { advanced: true } },
//     ],
//   },
// ];

// export default function Page({ params }: { params: { orgId: string } }) {
//   const { orgId } = params;
//   const router = useRouter();
//   const [frequency, _setFrequency] = useState(frequencies[0]);

//   return (
//     <div>
//       <SectionHeader
//         showBorderBottom
//         title="So sách tính năng"
//         description="Xem thông tin chi tiết và tùy chỉnh gói dịch vụ theo nhu cầu của bạn, bao gồm các tính năng và khả năng quản lý phù hợp."
//       />

//       <div className="mt-6">
//         <div className="mx-auto px-6 lg:px-8">
//           {/* xs to lg */}
//           <div className="mx-auto mt-12 max-w-md space-y-8 sm:mt-16 lg:hidden">
//             {tiers(orgId).map((tier) => (
//               <section
//                 key={tier.id}
//                 className={clsx("p-8", {
//                   "rounded-xl bg-gray-400/5 ring-1 ring-inset ring-gray-200": tier.mostPopular,
//                 })}
//               >
//                 <h3 id={tier.id} className="text-sm font-semibold leading-6 text-gray-900">
//                   {tier.name}
//                 </h3>
//                 {tier.price && (
//                   <p className="mt-2 flex items-baseline gap-x-1 text-gray-900">
//                     <span className="text-4xl font-bold">{(tier.price as never)[frequency.value]}</span>
//                     <span className="text-sm font-semibold">{frequency.priceSuffix}</span>
//                   </p>
//                 )}
//                 <Link
//                   href={tier.href}
//                   aria-describedby={tier.id}
//                   className={clsx(
//                     "mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
//                     {
//                       "bg-indigo-600 text-white hover:bg-indigo-500": tier.mostPopular,
//                       "text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300": !tier.mostPopular,
//                     }
//                   )}
//                 >
//                   {tier.id === "tier-advanced" ? "Liên hệ" : "Mua gói"}
//                 </Link>
//                 <ul role="list" className="mt-10 space-y-4 text-sm leading-6 text-gray-900">
//                   {sections.map((section) => (
//                     <li key={section.name}>
//                       <ul role="list" className="space-y-4">
//                         {section.features.map((feature) =>
//                           (feature.tiers as never)[tier.id] ? (
//                             <li key={feature.name} className="flex gap-x-3">
//                               <CheckIcon className="h-6 w-5 flex-none text-indigo-600" aria-hidden="true" />
//                               <span>
//                                 {feature.name}{" "}
//                                 {typeof (feature.tiers as never)[tier.id] === "string" ? (
//                                   <span className="text-sm leading-6 text-gray-500">
//                                     ({(feature.tiers as never)[tier.id]})
//                                   </span>
//                                 ) : null}
//                               </span>
//                             </li>
//                           ) : null
//                         )}
//                       </ul>
//                     </li>
//                   ))}
//                 </ul>
//               </section>
//             ))}
//           </div>

//           {/* lg+ */}
//           <div className="isolate mt-10 hidden lg:block">
//             <div className="relative -mx-8">
//               {tiers(orgId).some((tier) => tier.mostPopular) ? (
//                 <div className="absolute inset-x-4 inset-y-0 -z-10 flex">
//                   <div
//                     className="flex w-1/4 px-4"
//                     aria-hidden="true"
//                     style={{ marginLeft: `${(tiers(orgId).findIndex((tier) => tier.mostPopular) + 1) * 25}%` }}
//                   >
//                     <div className="w-full rounded-t-xl border-x border-t border-gray-900/10 bg-gray-400/5" />
//                   </div>
//                 </div>
//               ) : null}
//               <table className="w-full table-fixed border-separate border-spacing-x-8 text-left">
//                 <caption className="sr-only">Pricing plan comparison</caption>
//                 <colgroup>
//                   <col className="w-1/4" />
//                   <col className="w-1/4" />
//                   <col className="w-1/4" />
//                   <col className="w-1/4" />
//                 </colgroup>
//                 <thead>
//                   <tr>
//                     <td />
//                     {tiers(orgId).map((tier) => (
//                       <th key={tier.id} scope="col" className="px-6 pt-6 xl:px-8 xl:pt-8">
//                         <div className="text-sm font-semibold leading-7 text-gray-900">{tier.name}</div>
//                       </th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   <tr>
//                     <th scope="row">
//                       <span className="sr-only">Price</span>
//                     </th>
//                     {tiers(orgId).map((tier) => (
//                       <td key={tier.id} className="px-6 pt-2 xl:px-8">
//                         {tier.price && (
//                           <div className="flex items-baseline gap-x-1 text-gray-900">
//                             <span className="text-4xl font-bold">{(tier.price as never)[frequency.value]}</span>
//                             <span className="text-sm font-semibold leading-6">{frequency.priceSuffix}</span>
//                           </div>
//                         )}
//                         <Link
//                           href={tier.href}
//                           className={clsx(
//                             "mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
//                             {
//                               "bg-indigo-600 text-white hover:bg-indigo-500": tier.mostPopular,
//                               "text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300":
//                                 !tier.mostPopular,
//                             }
//                           )}
//                         >
//                           {tier.id === "tier-advanced" ? "Liên hệ" : "Mua gói"}
//                         </Link>
//                       </td>
//                     ))}
//                   </tr>
//                   {sections.map((section, sectionIdx) => (
//                     <Fragment key={section.name}>
//                       <tr>
//                         <th
//                           scope="colgroup"
//                           colSpan={4}
//                           className={clsx("pb-4 text-sm font-semibold leading-6 text-gray-900", {
//                             "pt-8": sectionIdx === 0,
//                             "pt-16": sectionIdx !== 0,
//                           })}
//                         >
//                           {section.name}
//                           <div className="absolute inset-x-8 mt-4 h-px bg-gray-900/10" />
//                         </th>
//                       </tr>
//                       {section.features.map((feature) => (
//                         <tr key={feature.name}>
//                           <th scope="row" className="py-4 text-sm font-normal leading-6 text-gray-900">
//                             {feature.name}
//                             <div className="absolute inset-x-8 mt-4 h-px bg-gray-900/5" />
//                           </th>
//                           {tiers(orgId).map((tier) => (
//                             <td key={tier.id} className="px-6 py-4 xl:px-8">
//                               {typeof (feature.tiers as never)[tier.id] === "string" ? (
//                                 <div className="text-center text-sm leading-6 text-gray-500">
//                                   {(feature.tiers as never)[tier.id]}
//                                 </div>
//                               ) : (
//                                 <>
//                                   {(feature.tiers as never)[tier.id] === true ? (
//                                     <CheckIcon className="mx-auto h-5 w-5 text-indigo-600" aria-hidden="true" />
//                                   ) : (
//                                     <MinusIcon className="mx-auto h-5 w-5 text-gray-400" aria-hidden="true" />
//                                   )}

//                                   <span className="sr-only">
//                                     {(feature.tiers as never)[tier.id] === true ? "Included" : "Not included"} in{" "}
//                                     {tier.name}
//                                   </span>
//                                 </>
//                               )}
//                             </td>
//                           ))}
//                         </tr>
//                       ))}
//                     </Fragment>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="border-gray-900/ mt-6 flex items-center justify-between gap-x-6 border-t pt-6">
//         <div>
//           <button
//             type="button"
//             className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
//             onClick={() => router.push(`/orgs/${orgId}/settings/plan`)}
//           >
//             Trở về
//           </button>
//         </div>
//         {/* <button
//           type="button"
//           className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
//           onClick={() => router.push(`/orgs/${orgId}/dashboard`)}
//         >
//           Hoàn thành
//         </button> */}
//       </div>
//     </div>
//   );
// }

export default withOrg(({ orgLink }) => {
  const router = useRouter();

  return <>{router.push(`${orgLink}/`)}</>;
});
