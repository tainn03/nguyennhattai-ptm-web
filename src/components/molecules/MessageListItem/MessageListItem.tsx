"use client";

import { UploadFile } from "@prisma/client";
import { useCallback, useMemo } from "react";
import { BiZoomIn } from "react-icons/bi";
import { PiFileTextThin as PiFileTextThinIcon } from "react-icons/pi";

import { DateTimeLabel, Link, VoiceMessage } from "@/components/atoms";
import { Avatar, RelativeTimeTooltip } from "@/components/molecules";
import { MapLocation } from "@/components/organisms";
import { OrderTripMessage } from "@/components/organisms/MessageModal/MessageModal";
import { getAccountInfo } from "@/utils/auth";
import { formatDate } from "@/utils/date";
import { getFileExtension } from "@/utils/file";

type NotPreviewFileType = {
  file: Partial<UploadFile>;
  extension: string;
};

type MessageListItemProps = {
  data: OrderTripMessage;
  isLastItem?: boolean;
  date: string;
  isOtherDate?: boolean;
};

const MessageListItem = ({ data, date, isLastItem = false, isOtherDate = false }: MessageListItemProps) => {
  const user = useMemo(() => getAccountInfo(data.createdByUser), [data.createdByUser]);
  const createdAt = useMemo(() => formatDate(data.createdAt), [data.createdAt]);

  /**
   * Create attachments component base on data
   * @returns Component that show list attachment
   */
  const renderAttachments = useCallback(() => {
    if (!data.attachments || data.attachments.length === 0) return null;
    const listImage: Partial<UploadFile>[] = [];
    const listOtherFile: NotPreviewFileType[] = [];
    let voice: Partial<UploadFile> | null = null;

    for (const attachment of data.attachments) {
      // Get file extension
      const extension = getFileExtension(attachment.name ?? "");

      if (extension) {
        switch (extension) {
          case ".png":
          case ".jpeg":
          case ".jpg":
            listImage.push(attachment);
            break;
          case ".mp3":
            voice = attachment;
            break;

          default:
            listOtherFile.push({ file: attachment, extension });
            break;
        }
      }
    }

    // List Image component
    const imageComponent = listImage.map((item, index) => {
      return (
        <div className="group flex aspect-[4/3] h-36  overflow-hidden" key={index}>
          <Link useDefaultStyle target="_blank" href={item.url ?? ""} className="relative col-span-1">
            <div className="absolute inset-0 flex  items-center justify-center rounded-md opacity-0 hover:bg-black hover:bg-opacity-40 hover:opacity-100">
              <button type="button">
                <BiZoomIn className="h-6 w-6 text-white" />
              </button>
            </div>
            <img src={item?.url} alt={item?.name || ""} className="aspect-[4/3] h-36 rounded-md object-cover" />
          </Link>
        </div>
      );
    });

    // List other file component
    const otherFileComponent = listOtherFile.map((item, index) => {
      return (
        <Link useDefaultStyle key={index} target="_blank" href={item.file.url ?? ""} className="flex">
          <div className="flex h-24 w-24 flex-col items-center justify-between rounded-lg border border-gray-300 p-2 hover:bg-gray-50 group-hover:bg-gray-50">
            <PiFileTextThinIcon className="h-14 w-14 text-gray-300" aria-hidden="true" />
            <p className="break-all text-sm font-semibold text-gray-500">{item.extension.slice(1).toUpperCase()}</p>
          </div>
        </Link>
      );
    });

    return (
      <div className="flex flex-col gap-y-1">
        <div className="flex flex-wrap gap-4">{imageComponent}</div>
        <div className="flex flex-wrap gap-4">{otherFileComponent}</div>
        {voice?.url && <VoiceMessage src={voice.url} />}
      </div>
    );
  }, [data.attachments]);

  return (
    <li className="relative flex flex-col gap-x-4">
      {isOtherDate && (
        <div className="flex w-full items-center justify-center pb-6">
          <div className="flex max-w-fit flex-wrap text-sm text-gray-500">
            <DateTimeLabel value={date} type="date" />
          </div>
        </div>
      )}
      {!data.isSystem ? (
        <div className="flex flex-row gap-x-4">
          {!isLastItem ? (
            <div className="absolute -bottom-6 left-0 top-0 flex w-8 justify-center">
              <div className="w-px bg-gray-200" />
            </div>
          ) : (
            <>
              {isOtherDate && (
                <div className="absolute -bottom-6 left-0 top-0 flex h-14 w-8 justify-center">
                  <div className="w-px bg-gray-200" />
                </div>
              )}
            </>
          )}
          <div className="relative">
            <Avatar size="small" avatarURL={user.avatar} displayName={user.displayName} />
          </div>

          <div className="flex-auto flex-wrap rounded-md p-3 ring-1 ring-inset ring-gray-200">
            <div className="flex justify-between gap-x-4">
              <div className="py-0.5 text-xs leading-5 text-gray-500">
                <span className="font-medium text-gray-900">{user.displayName}</span>{" "}
              </div>
              <RelativeTimeTooltip value={createdAt} />
            </div>
            {data.message && (
              <p className="whitespace-pre-wrap break-all text-sm leading-6 text-gray-500">{data.message}</p>
            )}
            {data.latitude && data.longitude && (
              <p className="whitespace-pre-wrap break-all text-sm leading-6 text-gray-500">
                <MapLocation latitude={data.latitude} longitude={data.longitude} isIcon={true} />
              </p>
            )}
            {renderAttachments()}
          </div>
        </div>
      ) : (
        <div className="flex flex-row pl-1">
          {!isLastItem ? (
            <div className="absolute -bottom-6 left-0 top-0 flex w-8 justify-center">
              <div className="w-px bg-gray-200" />
            </div>
          ) : (
            <>
              {isOtherDate && (
                <div className="absolute -bottom-6 left-0 top-0 flex h-14 w-8 justify-center">
                  <div className="w-px bg-gray-200" />
                </div>
              )}
            </>
          )}
          <div className="relative flex h-6 w-6 flex-none items-center justify-center bg-white">
            <div className="h-1.5 w-1.5 rounded-full bg-gray-100 ring-1 ring-gray-300" />
          </div>
          <p className="flex py-0.5 text-xs leading-5 text-gray-50">
            <span className="mr-1 inline-flex truncate font-medium text-gray-900">{user.displayName}</span>
            {data.message && <span className="text-gray-600">{data.message}</span>}
          </p>
          <div className="flex flex-1 justify-end ">
            <RelativeTimeTooltip value={createdAt} />
          </div>
        </div>
      )}
    </li>
  );
};

export default MessageListItem;
