"use client";

import { useCallback } from "react";

import { Button, PageHeader } from "@/components/molecules";
import { AlertProps } from "@/components/molecules/Alert/Alert";
import { useNotification } from "@/redux/actions";

export default function Page() {
  const { showNotification } = useNotification();

  const handleClick = useCallback(
    (color: AlertProps["color"]) => () => {
      showNotification({
        color,
        title: "Notification title",
        message: "This is a notification message",
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div>
      <PageHeader title="Notifications" />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Click to show notifications</h2>
          <div className="space-x-6">
            <Button color="info" onClick={handleClick("info")}>
              Info
            </Button>
            <Button color="success" onClick={handleClick("success")}>
              Success
            </Button>
            <Button color="warning" onClick={handleClick("warning")}>
              Warning
            </Button>
            <Button color="error" onClick={handleClick("error")}>
              Error
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
