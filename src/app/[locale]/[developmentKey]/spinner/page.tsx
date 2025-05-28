"use client";

import { Spinner } from "@/components/atoms";
import { PageHeader } from "@/components/molecules";

export default function Page() {
  return (
    <div>
      <PageHeader title="Spinner component" actionHorizontal />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Size</h2>
          <div className="flex items-center gap-x-6">
            <Spinner size="small" />
            <Spinner size="medium" />
            <Spinner size="large" />
          </div>
        </div>

        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Color</h2>
          <div className="flex items-center gap-x-6">
            <Spinner size="large" color="primary" />
            <Spinner size="large" color="secondary" />
            <Spinner size="large" color="info" />
            <Spinner size="large" color="success" />
            <Spinner size="large" color="warning" />
            <Spinner size="large" color="error" />
          </div>
        </div>
      </div>
    </div>
  );
}
