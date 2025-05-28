"use client";

import { VoiceMessage } from "@/components/atoms";

export default function Page() {
  return (
    <div className="flex flex-col gap-y-5">
      <VoiceMessage src="https://firebasestorage.googleapis.com/v0/b/testvoicemsg.appspot.com/o/voice%2FKem-Duyen-Rum-NIT-Masew.mp3?alt=media&token=20f662cb-cde2-4b44-8978-f3e252649685&_gl=1*e7cyoj*_ga*NTUyNzQ3MjAyLjE2OTg4MDk2MjA.*_ga_CW55HF8NVT*MTY5ODgwOTYyMC4xLjEuMTY5ODgxMDQ2NC42MC4wLjA." />
      <VoiceMessage
        src="https://firebasestorage.googleapis.com/v0/b/testvoicemsg.appspot.com/o/voice%2FTieng-ga-gay-www_tiengdong_com.mp3?alt=media&token=9670ca38-9da1-47f7-91f8-1b7a8660a714&_gl=1*n96s79*_ga*NTUyNzQ3MjAyLjE2OTg4MDk2MjA.*_ga_CW55HF8NVT*MTY5OTAwMTc3MS41LjEuMTY5OTAwMTgxMi4xOS4wLjA."
        color="red-500"
      />
    </div>
  );
}
