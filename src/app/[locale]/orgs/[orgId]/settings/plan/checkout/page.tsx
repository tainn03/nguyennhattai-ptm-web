"use client";

import { useRouter } from "next-intl/client";

import { withOrg } from "@/utils/client";

// TODO
// import { RadioGroup } from "@headlessui/react";
// import { CheckCircleIcon } from "@heroicons/react/24/outline";
// import clsx from "clsx";
// import { useRouter } from "next-intl/client";
// import { useState } from "react";

// import { SectionHeader } from "@/components/molecules";

// const products = [
//   {
//     id: 0,
//     title: "Phí khởi tạo dịch vụ",
//     price: "2,000,000",
//   },
//   {
//     id: 1,
//     title: "Xe",
//     price: "1,500,000",
//   },
// ];

// const paymentMethods = [
//   { id: 1, title: "Momo" },
//   { id: 2, title: "Zalo Pay" },
// ];

// export default function Page({ params }: { params: { orgId: string } }) {
//   const { orgId } = params;
//   const router = useRouter();
//   const [selectedPaym1entMethod, setSelectedPaymentMethod] = useState(paymentMethods[0]);

//   return (
//     <div>
//       <SectionHeader
//         showBorderBottom
//         title="Thông tin đơn hàng"
//         description="Tùy chỉnh số lượng xe và tiến hành thanh toán để hoàn tất quá trình đặt hàng."
//       />

//       <dl className="space-y-6 divide-y divide-gray-100 text-sm leading-6">
//         <div className="pt-6 sm:flex">
//           <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Gói đang chọn</dt>
//           <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
//             <div className="text-gray-900">
//               <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
//                 TIÊU CHUẨN
//               </span>
//             </div>
//           </dd>
//         </div>
//         <div className="pt-6 sm:flex">
//           <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Hình thức thanh toán</dt>
//           <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
//             <div className="text-gray-900">Thanh toán theo năm</div>
//           </dd>
//         </div>
//       </dl>

//       <div className="mt-6 border-t border-gray-900/20 pt-6">
//         <form className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
//           <div>
//             <div>
//               <h2 className="text-lg font-medium text-gray-900">Thông tin liên hệ</h2>

//               <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-6 sm:gap-x-4">
//                 <div className="col-span-full">
//                   <label htmlFor="full-name" className="block text-sm font-medium text-gray-700">
//                     Họ tên
//                   </label>
//                   <div className="mt-1">
//                     <input
//                       type="text"
//                       id="full-name"
//                       name="full-name"
//                       autoComplete="text"
//                       className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//                     />
//                   </div>
//                 </div>

//                 <div className="sm:col-span-4">
//                   <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
//                     Địa chỉ email
//                   </label>
//                   <div className="mt-1">
//                     <input
//                       type="email"
//                       id="email-address"
//                       name="email-address"
//                       autoComplete="given-name"
//                       className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//                     />
//                   </div>
//                 </div>

//                 <div className="sm:col-span-2">
//                   <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700">
//                     Số điện thoại
//                   </label>
//                   <div className="mt-1">
//                     <input
//                       type="text"
//                       id="phone-number"
//                       name="phone-number"
//                       autoComplete="family-name"
//                       className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="mt-10 border-t border-gray-200 pt-10">
//               <h2 className="text-lg font-medium text-gray-900">Thông tin xuất hóa đơn</h2>

//               <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-6 sm:gap-x-4">
//                 <div className="col-span-full">
//                   <label htmlFor="company" className="block text-sm font-medium text-gray-700">
//                     Tên doanh nghiệp
//                   </label>
//                   <div className="mt-1">
//                     <input
//                       type="text"
//                       name="company"
//                       id="company"
//                       className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//                     />
//                   </div>
//                 </div>

//                 <div className="col-span-full">
//                   <label htmlFor="address" className="block text-sm font-medium text-gray-700">
//                     Địa chỉ
//                   </label>
//                   <div className="mt-1">
//                     <input
//                       type="text"
//                       name="address"
//                       id="address"
//                       autoComplete="street-address"
//                       className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//                     />
//                   </div>
//                 </div>

//                 <div className="sm:col-span-3">
//                   <label htmlFor="mst" className="block text-sm font-medium text-gray-700">
//                     Mã số thuế
//                   </label>
//                   <div className="mt-1">
//                     <input
//                       type="text"
//                       name="mst"
//                       id="mst"
//                       className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="mt-10 border-t border-gray-200 pt-10">
//               <RadioGroup value={selectedPaym1entMethod} onChange={setSelectedPaymentMethod}>
//                 <RadioGroup.Label className="text-lg font-medium text-gray-900">
//                   Phương thức thanh toán
//                 </RadioGroup.Label>

//                 <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
//                   {paymentMethods.map((deliveryMethod) => (
//                     <RadioGroup.Option
//                       key={deliveryMethod.id}
//                       value={deliveryMethod}
//                       className={({ checked, active }) =>
//                         clsx(
//                           checked ? "border-transparent" : "border-gray-300",
//                           active ? "ring-2 ring-indigo-500" : "",
//                           "relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none"
//                         )
//                       }
//                     >
//                       {({ checked, active }) => (
//                         <>
//                           <span className="flex flex-1">
//                             <span className="flex flex-col">
//                               <RadioGroup.Label as="span" className="block text-sm font-medium text-gray-900">
//                                 {deliveryMethod.title}
//                               </RadioGroup.Label>
//                               {/* <RadioGroup.Description
//                                 as="span"
//                                 className="mt-1 flex items-center text-sm text-gray-500"
//                               >
//                                 {deliveryMethod.turnaround} */}
//                             </span>
//                           </span>
//                           {checked ? <CheckCircleIcon className="h-5 w-5 text-indigo-600" aria-hidden="true" /> : null}
//                           <span
//                             className={clsx(
//                               active ? "border" : "border-2",
//                               checked ? "border-indigo-500" : "border-transparent",
//                               "pointer-events-none absolute -inset-px rounded-lg"
//                             )}
//                             aria-hidden="true"
//                           />
//                         </>
//                       )}
//                     </RadioGroup.Option>
//                   ))}
//                 </div>
//               </RadioGroup>
//             </div>
//           </div>

//           {/* Order summary */}
//           <div className="mt-10 lg:mt-0">
//             <h2 className="text-lg font-medium text-gray-900">Hóa đơn</h2>

//             <div className="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm">
//               <h3 className="sr-only">Items in your cart</h3>
//               <ul role="list" className="divide-y divide-gray-200">
//                 {products.map((item, index) => (
//                   <li key={item.id} className="flex px-4 py-6 sm:px-6">
//                     <div className="flex flex-1 flex-col">
//                       <div className="flex">
//                         <div className="min-w-0 flex-1">
//                           <h4 className="text-sm">
//                             <span className="font-semibold text-gray-700 hover:text-gray-800">
//                               {`${index + 1}. ${item.title}`}
//                             </span>
//                           </h4>
//                         </div>
//                       </div>

//                       <div className="flex flex-1 items-end justify-between pt-2">
//                         <p className="mt-1 text-sm font-medium text-gray-900">{item.price} ₫</p>

//                         {index > 0 && (
//                           <div className="ml-4">
//                             <label htmlFor="quantity" className="sr-only">
//                               Quantity
//                             </label>
//                             <input
//                               type="number"
//                               name="quantity"
//                               id="quantity"
//                               className="block w-16 rounded-md border-gray-300 py-1 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//                               defaultValue={10}
//                             />
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   </li>
//                 ))}
//               </ul>
//               <dl className="space-y-6 border-t border-gray-200 px-4 py-6 sm:px-6">
//                 <div className="flex items-center justify-between">
//                   <dt className="text-sm">Tổng phí</dt>
//                   <dd className="text-sm font-medium text-gray-900">17,000,000 ₫</dd>
//                 </div>
//                 <div className="flex items-center justify-between">
//                   <dt className="text-sm">Thuế</dt>
//                   <dd className="text-sm font-medium text-gray-900">1,360,000 ₫</dd>
//                 </div>
//                 <div className="flex items-center justify-between border-t border-gray-200 pt-6">
//                   <dt className="text-base font-medium">Tổng cộng</dt>
//                   <dd className="text-base font-medium text-gray-900">18,360,000 ₫</dd>
//                 </div>
//               </dl>

//               <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
//                 <button
//                   type="button"
//                   className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
//                   onClick={() => router.push(`/orgs/${orgId}/dashboard`)}
//                 >
//                   Thanh toán
//                 </button>
//               </div>
//             </div>
//           </div>
//         </form>
//       </div>

//       <div className="mt-6 flex items-center justify-between gap-x-6 border-t border-gray-900/20 pt-6">
//         <div>
//           <button
//             type="button"
//             className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
//             onClick={() => router.push(`/orgs/${orgId}/settings/plan/edit`)}
//           >
//             Hủy
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
