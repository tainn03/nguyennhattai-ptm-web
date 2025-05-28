"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { useBreadcrumb } from "@/redux/actions";
import { withAuth } from "@/utils/client";

export default withAuth(() => {
  const { setBreadcrumb } = useBreadcrumb();
  const { notificationId } = useParams();

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    setBreadcrumb([
      { name: "Tài khoản", link: "/users/profile" },
      { name: "Chi tiết thông báo", link: "/users/notifications" },
      { name: `${notificationId}`, link: `/users/notifications/${notificationId}` },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form className="space-y-4" method="POST">
      <div className="max-sm:px-4">Chi tiết thông báo</div>
    </form>
  );
});
