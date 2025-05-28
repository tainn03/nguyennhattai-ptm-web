"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import {
  ChangeEvent,
  DragEvent,
  forwardRef,
  InputHTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ImFilePdf as ImFilePdfIcon } from "react-icons/im";
import { ImFileWord as ImFileWordIcon } from "react-icons/im";
import { ImFileExcel as ImFileExcelIcon } from "react-icons/im";
import { ImFileText2 as ImFileText2Icon } from "react-icons/im";
import { ImFilePicture as ImFilePictureIcon } from "react-icons/im";
import { PiImageThin as PiImageThinIcon } from "react-icons/pi";
import { TfiTrash as TfiTrashIcon } from "react-icons/tfi";

import { Link } from "@/components/atoms";
import {
  avatarOptions,
  billOfLadingOptions,
  customFieldOptions,
  defaultOptions,
  driverContractOptions,
  driverLicenseOptions,
  fuelMeterOptions,
  importOrderOptions,
  internalMessageOptions,
  MediaType,
  odometerOptions,
  orderTripExpenseDocumentOptions,
  organizationLogoOptions,
  subcontractorDocumentOptions,
  trailerOptions,
  vehicleOptions,
} from "@/configs/media";
import { ALLOWED_PREVIEW_EXTENSIONS } from "@/constants/file";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { postForm } from "@/utils/api";
import { bytesToSize, getFileExtension } from "@/utils/file";
import { ensureString } from "@/utils/string";

export type UploadInputValue = {
  name: string;
  url: string;
  id?: number;
  originalName?: string;
  filePath?: string;
};

export type UploadInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  type: MediaType;
  label?: string;
  value?: UploadInputValue;
  openSelectedFileLabel?: string;
  helperText?: string | boolean;
  errorText?: string | boolean;
  previewGrid?: boolean;
  showPreview?: boolean;
  uploadLabel?: string;
  onChange?: (_value?: UploadInputValue) => void;
  onUploading?: (_isUploading: boolean) => void;
  showDeleteButton?: boolean;
};

const UploadInput = forwardRef<HTMLInputElement, UploadInputProps>(
  (
    {
      type,
      label,
      id,
      value,
      required,
      helperText,
      errorText,
      previewGrid = true,
      showPreview = true,
      showDeleteButton = true,
      multiple,
      className,
      uploadLabel,
      onChange,
      onUploading,
      ...otherProps
    }: UploadInputProps,
    ref
  ) => {
    const t = useTranslations();
    const [internalError, setInternalErrorText] = useState<string | boolean>(false);
    const [internalValue, setInternalValue] = useState(value);
    const [dragIsOver, setDragIsOver] = useState(false);

    // Update internal value
    useEffect(() => {
      setInternalValue(value);
    }, [value]);

    const hasValue = useMemo(() => internalValue?.url && internalValue?.name, [internalValue]);

    // Get media options by input type
    const mediaOptions = useMemo(() => {
      switch (type) {
        case "AVATAR":
          return avatarOptions;
        case "ORGANIZATION_LOGO":
          return organizationLogoOptions;
        case "TRAILER":
          return trailerOptions;
        case "VEHICLE":
          return vehicleOptions;
        case "SUBCONTRACTOR_DOCUMENT":
          return subcontractorDocumentOptions;
        case "DRIVER_LICENSE":
          return driverLicenseOptions;
        case "DRIVER_CONTRACT":
          return driverContractOptions;
        case "INTERNAL_MESSAGE":
          return internalMessageOptions;
        case "BILL_OF_LADING":
          return billOfLadingOptions;
        case "FUEL_METER":
          return fuelMeterOptions;
        case "ODOMETER":
          return odometerOptions;
        case "CUSTOM_FIELD":
          return customFieldOptions;
        case "IMPORT_ORDER":
          return importOrderOptions;
        case "ORDER_TRIP_EXPENSE_DOCUMENT":
          return orderTripExpenseDocumentOptions;
        default:
          return defaultOptions;
      }
    }, [type]);

    // File type string, format like [.jpg, .jpeg, .png]
    const fileTypeStr = useMemo(() => mediaOptions.fileTypes.join(", "), [mediaOptions]);

    const handleUpload = useCallback(
      async (file: File) => {
        // Check file extension
        const ext = getFileExtension(file.name).toLowerCase();
        const allowedFileTypes = mediaOptions.fileTypes.map((item) => item.toLowerCase()) || [];
        if (!allowedFileTypes.includes(ext)) {
          setInternalErrorText(t("error.file_types", { types: fileTypeStr }));
          return false;
        }

        // Check file size
        if (file.size > mediaOptions.maxFileSize) {
          setInternalErrorText(t("error.file_size", { size: bytesToSize(mediaOptions.maxFileSize) }));
          return false;
        }

        onUploading && onUploading(true);
        const { data, status } = await postForm<ApiResult>("/api/upload", { file, type });
        if (status === HttpStatusCode.Ok) {
          const resultValue: UploadInputValue = {
            name: data.fileName,
            originalName: data.originalName,
            url: URL.createObjectURL(file),
            filePath: data.filePath,
          };

          setInternalValue(resultValue);
          onChange && onChange(resultValue);
        }
        onUploading && onUploading(false);
      },
      [fileTypeStr, mediaOptions.fileTypes, mediaOptions.maxFileSize, onChange, onUploading, t, type]
    );

    /**
     * Handle callback for the "dragover" event on an HTML div element.
     *
     * @param {DragEvent<HTMLDivElement>} event - The DragEvent associated with the dragover event.
     */
    const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragIsOver(true);
    }, []);

    /**
     * Handle callback for the "dragleave" event on an HTML div element.
     *
     * @param {DragEvent<HTMLDivElement>} event - The DragEvent associated with the dragleave event.
     */
    const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragIsOver(false);
    }, []);

    /**
     * Handle callback for the "drop" event on an HTML div element.
     *
     * @param {DragEvent<HTMLDivElement>} event - The DragEvent associated with the drop event.
     */
    const handleDrop = useCallback(
      async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragIsOver(false);
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
          await handleUpload(event.dataTransfer.files[0]);
        }
      },
      [handleUpload]
    );

    /**
     * Handle callback for the "change" event on an HTML input element.
     * It asynchronously handles the selected file for uploading, if available.
     *
     * @param {ChangeEvent<HTMLInputElement>} event - The ChangeEvent associated with the change event.
     */
    const handleChange = useCallback(
      async (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target instanceof HTMLInputElement && event.target.files) {
          const file = event.target.files[0];
          await handleUpload(file);
          // Clear the value of the input file so that users can select a different file (if they want)"
          event.target.value = "";
        }
      },
      [handleUpload]
    );

    /**
     * Handle callback for handling a "remove" action.
     * It clears the internal value and calls an optional 'onChange' callback
     * with the value set to 'undefined'.
     */
    const handleRemoveClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setInternalValue(undefined);
        onChange?.(undefined);
      },
      [onChange]
    );

    const Icon = useMemo(() => {
      switch (getFileExtension(ensureString(internalValue?.name)).toLowerCase()) {
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
    }, [internalValue?.name]);

    return (
      <div className={clsx("w-full", className)}>
        {label && (
          <label htmlFor="cover-photo" className="block text-sm font-medium leading-6 text-gray-900">
            {label}
            {required && <span className="ml-1 text-red-600">(*)</span>}
          </label>
        )}
        {showPreview && hasValue && (
          <div
            className={clsx({
              "mt-1 sm:mt-2": label,
              "grid grid-cols-2 gap-4 2xl:grid-cols-4": previewGrid,
            })}
          >
            <div className="group relative col-span-1 w-full">
              {ALLOWED_PREVIEW_EXTENSIONS.includes(getFileExtension(internalValue?.name || "")) ? (
                <Link useDefaultStyle target="_blank" href={internalValue?.url || ""}>
                  <img
                    alt=""
                    src={internalValue?.url}
                    className="h-full max-h-48 w-full max-w-[224px] rounded-md object-cover"
                  />
                  {showDeleteButton && (
                    <div className="absolute right-0 top-0 z-30 hidden h-min w-min group-hover:block">
                      <button
                        onClick={handleRemoveClick}
                        type="button"
                        className="trash m-1 animate-pulse rounded-md bg-black p-1 opacity-50"
                      >
                        <TfiTrashIcon className="h-5 w-5 text-white" />
                      </button>
                    </div>
                  )}
                </Link>
              ) : (
                <div
                  className={clsx(
                    "col-span-2 rounded-lg border border-gray-300 bg-white shadow-sm transition-shadow hover:shadow",
                    className
                  )}
                >
                  <div className="flex flex-row gap-3 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <Icon className="h-6 w-6 text-gray-500" />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center">
                      <p className="truncate text-sm font-medium text-gray-700">
                        {internalValue?.originalName || internalValue?.name}
                      </p>
                      {/* <p className="mt-0.5 text-sm text-gray-500">{getFileExtension(internalValue?.name || "")}</p> */}
                    </div>
                    {showDeleteButton && (
                      <button
                        onClick={handleRemoveClick}
                        type="button"
                        className="rounded-full p-2 text-red-500 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label="View file"
                      >
                        <TfiTrashIcon className="h-6 w-6" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {(multiple || !hasValue) && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={clsx("mt-2 flex justify-center rounded-lg border-dashed px-6 py-10", {
              "border border-red-600": internalError || errorText,
              "border border-gray-900/25": !dragIsOver,
              "border-2 border-blue-700": dragIsOver,
            })}
          >
            <div className="text-center">
              <PiImageThinIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
              <div className="mt-4 block text-sm leading-6 text-gray-600">
                {t.rich("components.upload_file.upload_file", {
                  input: () => (
                    <>
                      <label
                        htmlFor={id}
                        className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-700 focus-within:ring-offset-2 hover:text-blue-600"
                      >
                        <span>{uploadLabel ?? t("components.upload_file.upload_picture")}</span>
                        <input
                          ref={ref}
                          id={id}
                          accept={fileTypeStr}
                          type="file"
                          className="sr-only"
                          onChange={handleChange}
                          {...otherProps}
                        />
                      </label>
                    </>
                  ),
                  file: (chunks) => <p className="text-xs leading-5 text-gray-600">{chunks}</p>,
                  fileType: fileTypeStr,
                  fileSize: bytesToSize(mediaOptions.maxFileSize),
                })}
              </div>
            </div>
          </div>
        )}

        {(errorText || internalError || helperText) && (
          <p
            className={clsx("mt-2 block text-xs", {
              "text-red-600": errorText || internalError,
              "text-gray-500": !errorText,
            })}
          >
            {errorText || internalError || helperText}
          </p>
        )}
      </div>
    );
  }
);

UploadInput.displayName = "UploadInput";

export default UploadInput;
