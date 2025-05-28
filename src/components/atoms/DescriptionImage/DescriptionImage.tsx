import { UploadFile } from "@prisma/client";
import { useMemo } from "react";
import { ImFilePdf as ImFilePdfIcon } from "react-icons/im";
import { ImFileWord as ImFileWordIcon } from "react-icons/im";
import { ImFileExcel as ImFileExcelIcon } from "react-icons/im";
import { ImFileText2 as ImFileText2Icon } from "react-icons/im";
import { ImFilePicture as ImFilePictureIcon } from "react-icons/im";
import { MdDownload as MdDownloadIcon } from "react-icons/md";

import { Link } from "@/components/atoms";
import { ALLOWED_PREVIEW_EXTENSIONS } from "@/constants/file";
import { getFileExtension } from "@/utils/file";
import { ensureString } from "@/utils/string";
import { cn } from "@/utils/twcn";

export type DescriptionImageProps = {
  file?: Partial<UploadFile>;
  className?: string;
};

const DescriptionImage = ({ file, className }: DescriptionImageProps) => {
  const fileExtension = useMemo(() => getFileExtension(ensureString(file?.name)), [file?.name]);

  const Icon = useMemo(() => {
    switch (fileExtension.toLowerCase()) {
      case ".pdf":
        return ImFilePdfIcon;
      case ".xls":
      case ".xlsx":
      case ".csv":
        return ImFileExcelIcon;
      case ".doc":
      case ".docx":
        return ImFileWordIcon;
      case ".png":
      case ".jpg":
      case ".jpeg":
      case ".gif":
      case ".webp":
        return ImFilePictureIcon;
      default:
        return ImFileText2Icon;
    }
  }, [fileExtension]);

  return file?.url ? (
    <Link useDefaultStyle target="_blank" href={file?.url} className={cn("relative", className)}>
      <div className="absolute inset-0 flex h-28 w-28 items-center justify-center rounded-md opacity-0 hover:bg-black hover:bg-opacity-40 hover:opacity-100">
        <button type="button">
          <MdDownloadIcon className="h-6 w-6 text-white" />
        </button>
      </div>
      {ALLOWED_PREVIEW_EXTENSIONS.includes(fileExtension) ? (
        <img src={file?.url} alt={file?.name || ""} className="aspect-[4/3] h-28 w-28 rounded-md object-cover" />
      ) : (
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-md border border-gray-200 bg-gray-100">
          <Icon className="h-8 w-8 text-gray-500" />
          <span className="mt-1 text-xs font-medium uppercase text-gray-500">{fileExtension}</span>
        </div>
      )}
    </Link>
  ) : (
    "-"
  );
};

export default DescriptionImage;
