"use client";

import { CheckCircleIcon, FaceFrownIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState } from "react";

import { Spinner } from "@/components/atoms";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { post } from "@/utils/api";

type InitializeDataProps = {
  onSuccess?: () => void;
};

const InitializeData = ({ onSuccess }: InitializeDataProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const initializedRef = useRef(false);

  const initialData = useCallback(async () => {
    const { status } = await post<ApiResult>("/api/admin/init/data");
    setIsLoading(false);

    if (status === HttpStatusCode.Ok) {
      onSuccess && onSuccess();
    } else {
      setIsError(true);
    }
  }, [onSuccess]);

  useEffect(() => {
    if (!initializedRef.current) {
      initialData();
      initializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[80px] flex-col items-center justify-center gap-4">
      {/* Loading */}
      {isLoading && (
        <>
          <Spinner className="!h-16 !w-16 border-[5px]" />
          <span className="text-center text-sm">Initializing data...</span>
        </>
      )}

      {/* Init success */}
      {!isLoading && !isError && (
        <>
          <CheckCircleIcon className="h-20 w-20 text-green-600" aria-hidden="true" />
          <span className="text-center text-sm">Finish setting up the AUTOTMS!</span>
        </>
      )}

      {/* Init error */}
      {!isLoading && isError && (
        <>
          <XCircleIcon className="h-20 w-20 text-red-600" aria-hidden="true" />
          <span className="text-center text-sm">
            An unexpected error occurred <FaceFrownIcon className="inline-block h-5 w-5" aria-hidden="true" />
          </span>
        </>
      )}
    </div>
  );
};

export default InitializeData;
