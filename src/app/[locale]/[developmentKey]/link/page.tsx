"use client";

import Link from "@/components/atoms/Link/Link";
import { PageHeader } from "@/components/molecules";

export default function Page() {
  return (
    <div>
      <PageHeader title="Link component" actionHorizontal />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Target</h2>
          <div className="flex items-center gap-x-6">
            <Link href="https://tailwindcss.com/docs/animation">Normal Link</Link>
            <Link target="_blank" href="https://tailwindcss.com/docs/animation">
              Target Blank
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Color</h2>
          <div className="flex items-center gap-x-6">
            <Link href="https://tailwindcss.com/docs/animation" color="primary">
              primary
            </Link>
            <Link href="https://tailwindcss.com/docs/animation" color="secondary">
              secondary
            </Link>
            <Link href="https://tailwindcss.com/docs/animation" color="info">
              info
            </Link>
            <Link href="https://tailwindcss.com/docs/animation" color="success">
              success
            </Link>
            <Link href="https://tailwindcss.com/docs/animation" color="warning">
              warning
            </Link>
            <Link href="https://tailwindcss.com/docs/animation" color="error">
              error
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
