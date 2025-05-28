"use client";

import { useRouter } from "next-intl/client";

import { withOrg } from "@/utils/client";

// TODO
// import { useRouter } from "next-intl/client";
// import { Link } from "@/components/atoms";
// import { useCallback } from "react";

// import { SectionHeader } from "@/components/molecules";
// export default function Page({ params }: { params: { orgId: string } }) {
//   const { orgId } = params;
//   const router = useRouter();

//   const getDateAfter = useCallback((dayNum: number) => {
//     const currentDt = new Date();
//     return new Date(currentDt.getFullYear(), currentDt.getMonth(), currentDt.getDay() + dayNum);
//   }, []);

//   return (
//     <div>
//       <SectionHeader
//         showBorderBottom
//         title="Thông tin gói dịch vụ"
//         description="Xem thông tin chi tiết và tùy chỉnh gói dịch vụ theo nhu cầu của bạn, bao gồm các tính năng và khả năng quản lý phù hợp."
//       />

//       <dl className="space-y-6 divide-y divide-gray-100 text-sm leading-6">
//         <div className="pt-6 sm:flex">
//           <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Gói hiện tại</dt>
//           <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
//             <div className="text-gray-900">
//               <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
//                 DÙNG THỬ
//               </span>
//               <p className="mt-2 text-sm text-gray-500">
//                 Dùng thử 30 ngày miễn phí, thời gian hết hạn gói {getDateAfter(30).toLocaleString()}
//               </p>
//             </div>
//           </dd>
//           <Link
//             href={`/orgs/${orgId}/settings/plan/edit`}
//             className="font-semibold text-indigo-600 hover:text-indigo-500"
//           >
//             Thay đổi
//           </Link>
//         </div>
//         <div className="pt-6 sm:flex">
//           <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Thời gian cập nhật gói</dt>
//           <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
//             <div className="text-gray-900">8/25/2023, 2:38:26 PM</div>
//           </dd>
//         </div>
//         <div className="pt-6 sm:flex">
//           <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Người cập nhật gói</dt>
//           <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
//             <div className="font-semibold text-gray-900">Ack user</div>
//           </dd>
//         </div>
//       </dl>

//       <div className="border-gray-900/ mt-6 flex items-center justify-between gap-x-6 border-t pt-6">
//         <div>
//           <button
//             type="button"
//             className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
//             onClick={() => router.push(`/orgs/${orgId}/settings/role`)}
//           >
//             Trở về
//           </button>
//         </div>
//         <button
//           type="button"
//           className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
//           onClick={() => router.push(`/orgs/${orgId}/dashboard`)}
//         >
//           Hoàn thành
//         </button>
//       </div>
//     </div>
//   );
// }

export default withOrg(({ orgLink }) => {
  const router = useRouter();

  return <>{router.push(`${orgLink}/`)}</>;
});
