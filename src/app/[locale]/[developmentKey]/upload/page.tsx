"use client";

import { useState } from "react";

import { PageHeader, UploadInput } from "@/components/molecules";
import { UploadInputValue } from "@/types/file";

export default function Page() {
  const [file1, setFile1] = useState<UploadInputValue>();
  const [file2, setFile2] = useState<UploadInputValue>();
  const [file3, setFile3] = useState<UploadInputValue>();
  const [file4, setFile4] = useState<UploadInputValue>();
  const [file5, setFile5] = useState<UploadInputValue>();
  const [file6, setFile6] = useState<UploadInputValue>();

  const handleChange1 = (file?: UploadInputValue) => {
    setFile1(file);
  };

  const handleChange2 = (file?: UploadInputValue) => {
    setFile2(file);
  };

  const handleChange3 = (file?: UploadInputValue) => {
    setFile3(file);
  };

  const handleChange4 = (file?: UploadInputValue) => {
    setFile4(file);
  };

  const handleChange5 = (file?: UploadInputValue) => {
    setFile5(file);
  };

  const handleChange6 = (file?: UploadInputValue) => {
    setFile6(file);
  };

  return (
    <div>
      <PageHeader title="UploadInput component" actionHorizontal />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <div className="grid grid-cols-4 gap-6">
            <div className="w-full">
              <UploadInput label="Normal" type="AVATAR" name="avatar" onChange={handleChange1} />
              {file1 && (
                <div className="mt-2 bg-gray-200 p-4 text-xs font-normal">{file1 && JSON.stringify(file1)}</div>
              )}
            </div>
            <div className="w-full">
              <UploadInput label="Required" required type="AVATAR" name="avatar" onChange={handleChange2} />
              {file2 && (
                <div className="mt-2 bg-gray-200 p-4 text-xs font-normal">{file2 && JSON.stringify(file2)}</div>
              )}
            </div>

            <div className="w-full">
              <UploadInput label="Show Preview" showPreview type="AVATAR" name="avatar" onChange={handleChange3} />
              {file3 && (
                <div className="mt-2 bg-gray-200 p-4 text-xs font-normal">{file3 && JSON.stringify(file3)}</div>
              )}
            </div>

            <div className="w-full">
              <UploadInput
                label="Description"
                openSelectedFileLabel="Tải tập tin lên"
                type="AVATAR"
                name="avatar"
                onChange={handleChange4}
              />
              {file4 && (
                <div className="mt-2 bg-gray-200 p-4 text-xs font-normal">{file4 && JSON.stringify(file4)}</div>
              )}
            </div>

            <div className="w-full">
              <UploadInput
                label="Helper Text"
                helperText="Vui lòng tải ảnh mặt trước của bằng lái xe không bị mờ và đúng định dạng."
                openSelectedFileLabel="Tải tập tin lên"
                type="AVATAR"
                name="avatar"
                onChange={handleChange5}
              />
              {file5 && (
                <div className="mt-2 bg-gray-200 p-4 text-xs font-normal">{file5 && JSON.stringify(file5)}</div>
              )}
            </div>

            <div className="w-full">
              <UploadInput
                label="Error Text"
                errorText="Vui lòng tải ảnh mặt trước của bằng lái xe không bị mờ và đúng định dạng."
                openSelectedFileLabel="Tải tập tin lên"
                type="AVATAR"
                name="avatar"
                onChange={handleChange6}
              />
              {file6 && (
                <div className="mt-2 bg-gray-200 p-4 text-xs font-normal">{file6 && JSON.stringify(file6)}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
