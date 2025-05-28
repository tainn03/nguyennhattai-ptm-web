"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";

import { decryptId, encryptId } from "@/utils/security";

type UseIdParamProps = {
  name?: string;
  originId?: number | null;
  encryptedId?: string | null;
};

const useIdParam = ({ name = "id", originId, encryptedId }: UseIdParamProps = {}) => {
  const params = useParams();
  const paramId = (params[name] || null) as string | null;

  const currentOriginId = useMemo(() => {
    if (!originId) {
      return decryptId(encryptedId || paramId);
    }
    return originId;
  }, [originId, encryptedId, paramId]);

  const currentEncryptedId = useMemo(() => {
    if (!encryptedId) {
      return originId ? encryptId(originId) : paramId;
    }
    return encryptedId;
  }, [encryptedId, originId, paramId]);

  return useMemo(
    () => ({
      originId: currentOriginId,
      encryptedId: currentEncryptedId,
      encryptId,
      decryptId,
    }),
    [currentOriginId, currentEncryptedId]
  );
};

export default useIdParam;
