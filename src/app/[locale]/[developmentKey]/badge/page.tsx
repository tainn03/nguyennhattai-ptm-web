"use client";

import { Badge } from "@/components/atoms";
import { PageHeader } from "@/components/molecules";

export default function Page() {
  const handleRemove = () => {
    console.log("remove clicked");
  };

  return (
    <div>
      <PageHeader title="Badge" actionHorizontal />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <h2 className="font-semibold text-gray-900">Color</h2>
        <div className="flex gap-4">
          {/* default badge type "success" */}
          <Badge label="Badge" color="primary" />
          <Badge label="Badge" color="secondary" />
          <Badge label="Badge" color="info" />
          <Badge label="Badge" color="success" />
          <Badge label="Badge" color="warning" />
          <Badge label="Badge" color="error" />
        </div>

        <h2 className="font-semibold text-gray-900">Rounded</h2>
        <div className="flex gap-4">
          {/* default badge type "success" */}
          <Badge label="Badge" />
          <Badge label="Badge" rounded />
        </div>

        <h2 className="font-semibold text-gray-900">Title & Icon</h2>
        <div className="flex gap-4">
          <Badge label="Badge" title="Title: " />
          <Badge label="Badge" onRemove={handleRemove} />
          <Badge label="Badge" title="Title: " sort="asc" onRemove={handleRemove} />
          <Badge label="Badge" title="Title: " sort="desc" onRemove={handleRemove} />
        </div>
      </div>
    </div>
  );
}
