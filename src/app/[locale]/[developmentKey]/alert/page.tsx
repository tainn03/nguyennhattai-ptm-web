"use client";

import { useCallback } from "react";

import { PageHeader } from "@/components/molecules";
import Alert from "@/components/molecules/Alert/Alert";

export default function Page() {
  const handleClose = useCallback(() => {
    console.log("close");
  }, []);

  return (
    <div>
      <PageHeader title="Spinner component" actionHorizontal />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Level</h2>
          <div className="grid grid-cols-4 gap-x-6">
            <Alert color="info" title="Lorem ipsum dolor sit amet consectetur." />
            <Alert color="success" title="Lorem ipsum dolor sit amet consectetur." />
            <Alert color="warning" title="Lorem ipsum dolor sit amet consectetur." />
            <Alert color="error" title="Lorem ipsum dolor sit amet consectetur." />
          </div>
        </div>

        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Close button</h2>
          <div className="grid grid-cols-4 gap-x-6">
            <Alert color="info" title="Lorem ipsum dolor sit amet consectetur." onClose={handleClose} />
            <Alert color="success" title="Lorem ipsum dolor sit amet consectetur." onClose={handleClose} />
            <Alert color="warning" title="Lorem ipsum dolor sit amet consectetur." onClose={handleClose} />
            <Alert color="error" title="Lorem ipsum dolor sit amet consectetur." onClose={handleClose} />
          </div>
        </div>

        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Detail Link</h2>
          <div className="grid grid-cols-4 gap-x-6">
            <Alert color="info" title="Lorem ipsum dolor sit amet consectetur." detailLinkText="Chi tiết" />
            <Alert color="success" title="Lorem ipsum dolor sit amet consectetur." detailLinkText="Chi tiết" />
            <Alert color="warning" title="Lorem ipsum dolor sit amet consectetur." detailLinkText="Chi tiết" />
            <Alert color="error" title="Lorem ipsum dolor sit amet consectetur." detailLinkText="Chi tiết" />
          </div>
        </div>

        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Accent border</h2>
          <div className="grid grid-cols-4 gap-x-6">
            <Alert accentBorder color="info" title="Lorem ipsum dolor sit amet consectetur." onClose={handleClose} />
            <Alert accentBorder color="success" title="Lorem ipsum dolor sit amet consectetur." onClose={handleClose} />
            <Alert accentBorder color="warning" title="Lorem ipsum dolor sit amet consectetur." onClose={handleClose} />
            <Alert accentBorder color="error" title="Lorem ipsum dolor sit amet consectetur." onClose={handleClose} />
          </div>
        </div>

        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Description</h2>
          <div className="grid grid-cols-4 gap-x-6">
            <Alert accentBorder color="info" title="Attention needed" onClose={handleClose}>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Lorem ipsum dolor sit amet.
            </Alert>
            <Alert accentBorder color="success" title="Attention needed" onClose={handleClose}>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Lorem ipsum dolor sit amet.
            </Alert>
            <Alert accentBorder color="warning" title="Attention needed" onClose={handleClose}>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Lorem ipsum dolor sit amet.
            </Alert>
            <Alert accentBorder color="error" title="Attention needed" onClose={handleClose}>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Lorem ipsum dolor sit amet.
            </Alert>
          </div>
        </div>

        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Slot</h2>
          <div className="grid grid-cols-4 gap-x-6">
            <Alert
              accentBorder
              color="info"
              title="Attention needed"
              onClose={handleClose}
              slotComponent={
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    type="button"
                    className="rounded-md bg-sky-50 px-2 py-1.5 text-sm font-medium text-sky-600 hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 focus:ring-offset-sky-50"
                  >
                    View status
                  </button>
                  <button
                    type="button"
                    className="ml-3 rounded-md bg-sky-50 px-2 py-1.5 text-sm font-medium text-sky-600 hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 focus:ring-offset-sky-50"
                  >
                    Dismiss
                  </button>
                </div>
              }
            >
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Lorem ipsum dolor sit amet.
            </Alert>
            <Alert
              accentBorder
              color="success"
              title="Attention needed"
              onClose={handleClose}
              slotComponent={
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    type="button"
                    className="rounded-md bg-green-50 px-2 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50"
                  >
                    View status
                  </button>
                  <button
                    type="button"
                    className="ml-3 rounded-md bg-green-50 px-2 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50"
                  >
                    Dismiss
                  </button>
                </div>
              }
            >
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Lorem ipsum dolor sit amet.
            </Alert>
            <Alert
              accentBorder
              color="warning"
              title="Attention needed"
              onClose={handleClose}
              slotComponent={
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    type="button"
                    className="rounded-md bg-yellow-50 px-2 py-1.5 text-sm font-medium text-yellow-600 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50"
                  >
                    View status
                  </button>
                  <button
                    type="button"
                    className="ml-3 rounded-md bg-yellow-50 px-2 py-1.5 text-sm font-medium text-yellow-600 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50"
                  >
                    Dismiss
                  </button>
                </div>
              }
            >
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Lorem ipsum dolor sit amet.
            </Alert>
            <Alert
              accentBorder
              color="error"
              title="Attention needed"
              onClose={handleClose}
              slotComponent={
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    type="button"
                    className="rounded-md bg-red-50 px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                  >
                    View status
                  </button>
                  <button
                    type="button"
                    className="ml-3 rounded-md bg-red-50 px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                  >
                    Dismiss
                  </button>
                </div>
              }
            >
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Lorem ipsum dolor sit amet.
            </Alert>
          </div>
        </div>
      </div>
    </div>
  );
}
