"use client";

import { ChangeEvent, useCallback, useState } from "react";

import { PageHeader, TextField } from "@/components/molecules";
import { Pagination } from "@/components/organisms";

export default function Page() {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [record, setRecord] = useState<number>(500);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return (
    <div>
      <PageHeader title="Pagination component" actionHorizontal />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <div>
            <TextField
              className="w-1/5"
              type="number"
              label="Số lượng record"
              value={record}
              onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setRecord(Number(e.target.value))}
              placeholder="Nhập tổng số record"
            />
            <p className="mt-2 text-sm text-gray-900">Trang hiện tại: {currentPage}</p>
          </div>

          <div className="flex flex-col gap-y-4">
            <h2 className="font-semibold text-gray-900">Normal</h2>
            {record && <Pagination page={currentPage} total={record} onPageChange={handlePageChange} />}
          </div>

          <div className="flex flex-col gap-y-4">
            <h2 className="font-semibold text-gray-900">showPageSizeOptions</h2>
            {record && (
              <Pagination showPageSizeOptions page={currentPage} total={record} onPageChange={handlePageChange} />
            )}
          </div>

          <div className="flex flex-col gap-y-4">
            <h2 className="font-semibold text-gray-900">resultUnit = xe</h2>
            {record && <Pagination unit="xe" page={currentPage} total={record} onPageChange={handlePageChange} />}
          </div>

          <div className="flex flex-col gap-y-4">
            <h2 className="font-semibold text-gray-900">Color</h2>
            {record && (
              <>
                <Pagination color="secondary" page={currentPage} total={record} onPageChange={handlePageChange} />
                <Pagination color="info" page={currentPage} total={record} onPageChange={handlePageChange} />
                <Pagination color="success" page={currentPage} total={record} onPageChange={handlePageChange} />
                <Pagination color="warning" page={currentPage} total={record} onPageChange={handlePageChange} />
                <Pagination color="error" page={currentPage} total={record} onPageChange={handlePageChange} />
              </>
            )}
          </div>

          <div className="flex flex-col gap-y-4">
            <h2 className="font-semibold text-gray-900">showBorderTop = false</h2>
            {record && (
              <Pagination showBorderTop={false} page={currentPage} total={record} onPageChange={handlePageChange} />
            )}
          </div>

          <div className="flex flex-col gap-y-4">
            <h2 className="font-semibold text-gray-900">showPaginationInfo = false</h2>
            {record && (
              <Pagination
                page={currentPage}
                showPaginationInfo={false}
                total={record}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
