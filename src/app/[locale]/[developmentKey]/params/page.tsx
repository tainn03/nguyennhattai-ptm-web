"use client";

import { useEffect, useState } from "react";

import { PageHeader, TextField } from "@/components/molecules";
import { useIdParam } from "@/hooks";

export default function Page() {
  const { encryptId, decryptId } = useIdParam();
  const [originId, setOriginId] = useState<number>();
  const [encryptedId, setEncryptedId] = useState<string>();
  const [encryptLog, setEncryptedLog] = useState("");
  const [decryptLog, setDecryptedLog] = useState("");

  useEffect(() => {
    if (originId && originId >= 0) {
      const encrypted = encryptId(originId);
      setEncryptedLog(`originId=${originId}, encryptedId=${encrypted}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originId]);

  useEffect(() => {
    if (encryptedId) {
      const decrypted = decryptId(encryptedId);
      setDecryptedLog(`encryptedId=${encryptedId}, originId=${decrypted}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encryptedId]);

  return (
    <div>
      <PageHeader title="Params" />

      <div className="mt-10 flex flex-col gap-4">
        <div className="flex flex-row items-center gap-4">
          <TextField
            type="number"
            label="ID Number (1 - 4,000,000,000)"
            className="min-w-[500px]"
            value={originId}
            onChange={(event) => setOriginId(Number(event.target.value))}
          />
          {/* <Button onClick={handleEncode} disabled={!originId || originId < 0}>
            Encrypt
          </Button> */}
          {encryptLog && <span>{encryptLog}</span>}
        </div>

        <div className="flex flex-row items-center gap-4">
          <TextField
            type="text"
            label="Encrypted ID"
            className="min-w-[500px]"
            value={encryptedId}
            onChange={(event) => setEncryptedId(event.target.value)}
          />
          {/* <Button onClick={handleDecode} disabled={!encryptId}>
            Decrypt
          </Button> */}
          {decryptLog && <span>{decryptLog}</span>}
        </div>
      </div>
    </div>
  );
}
