"use client";

import { ClipboardDocumentIcon, EnvelopeOpenIcon, MicrophoneIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import { useMemo } from "react";

import { PageHeader, PasswordField, TextField } from "@/components/molecules";

export default function Page() {
  const toolbarComponent = useMemo(
    () => (
      <div className="absolute inset-x-0 bottom-0 flex justify-between py-2 pl-3 pr-2">
        <div className="flex items-center space-x-5">
          <div className="flex items-center">
            <button
              type="button"
              className="-m-2.5 flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:text-gray-500"
            >
              <PaperClipIcon className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Attach a file</span>
            </button>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              className="-m-2.5 flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:text-gray-500"
            >
              <MicrophoneIcon className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Attach a file</span>
            </button>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Post
          </button>
        </div>
      </div>
    ),
    []
  );

  return (
    <div>
      <PageHeader title="TextField and PasswordField component" actionHorizontal />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <div className="grid grid-cols-5 gap-6">
            <TextField label="Normal" />
            <TextField label="Placeholder" placeholder="Placeholder" />
            <TextField label="Required" placeholder="Đây là trường bắt buộc" required />
            <TextField label="Disabled" placeholder="Vô hiệu hóa" disabled />
            <TextField
              label="Start Adornment"
              placeholder="Nhập email của bạn"
              icon={EnvelopeOpenIcon}
              iconPlacement="start"
            />
            <TextField
              label="End Adornment"
              placeholder="Nhập email của bạn"
              icon={EnvelopeOpenIcon}
              iconPlacement="end"
            />
            <TextField label="Prefix Text" prefixText="$" placeholder="Nhập số tiền của bạn" />
            <TextField label="Suffix Text" suffixText="USD" placeholder="Nhập số tiền của bạn" />
            <TextField label="Left Addon" leftAddon="https://" placeholder="Nhập tên miền của bạn" />
            <TextField label="Right Addon" rightAddon="Tìm" placeholder="Nhập nội dung cần tìm kiếm" />
            <TextField label="Helper Text" helperText="Nhập tên công ty của bạn" />
            <TextField label="Error Text" errorText="Nhập đầy đủ họ và tên." />
            <form>
              <PasswordField label="Password Field" onChange={(event) => console.log(event.target.value)} />
            </form>
            <form>
              <PasswordField
                label="Hide Eye Icon"
                showEyeIcon={false}
                onChange={(event) => console.log(event.target.value)}
              />
            </form>
          </div>
          <div className="grid grid-cols-5 gap-6">
            <TextField label="Textarea" multiline />
            <TextField label="Textarea Placeholder" multiline placeholder="Nhập mô tả" />
            <TextField label="Textarea Required" required multiline placeholder="Nhập mô tả" />
            <TextField label="Textarea Disabled" disabled multiline placeholder="Nhập mô tả" />
            <TextField
              label="Textarea Disabled"
              multiline
              helperText="Vui lòng nhập thông tin mô tả"
              placeholder="Nhập mô tả"
            />
            <TextField label="Textarea Disabled" multiline errorText="Vui lòng nhập thông tin mô tả chính xác" />
            <TextField
              label="Toolbar Component"
              multiline
              placeholder="Nhập mô tả"
              toolbarComponent={toolbarComponent}
            />
            <TextField
              showCount
              label="Show Count"
              multiline
              placeholder="Nhập mô tả"
              toolbarComponent={toolbarComponent}
            />
            <TextField
              showCount
              maxLength={100}
              label="Show Count And Max Length"
              multiline
              placeholder="Nhập mô tả"
              toolbarComponent={toolbarComponent}
            />
            <TextField
              label="Hint Component"
              multiline
              placeholder="Nhập mô tả"
              toolbarComponent={toolbarComponent}
              hintComponent={
                <span className="flex gap-x-2">
                  <MicrophoneIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  <ClipboardDocumentIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
