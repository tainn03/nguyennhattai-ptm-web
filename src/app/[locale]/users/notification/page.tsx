"use client";

import { useEffect } from "react";

import { useBreadcrumb } from "@/redux/actions";
import { withAuth } from "@/utils/client";

export default withAuth(() => {
  const { setBreadcrumb } = useBreadcrumb();

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    setBreadcrumb([
      { name: "Tài khoản", link: "/users/profile" },
      { name: "Thông báo", link: "/users/notification" },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form className="space-y-4" method="POST">
      <div className="max-sm:px-4">Cài đặt thông báo</div>
    </form>
  );
});
