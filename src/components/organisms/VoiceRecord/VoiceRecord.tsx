"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useRef, useState } from "react";
import { FaRegStopCircle } from "react-icons/fa";
import { LiaMicrophoneSolid } from "react-icons/lia";

import { useNotification } from "@/redux/actions";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { postForm } from "@/utils/api";

export type VoiceRecordProps = {
  onRecord: (audioUrl: string, fileName: string) => void;
};
const VoiceRecord = ({ onRecord }: VoiceRecordProps) => {
  const t = useTranslations();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const [recordingStatus, setRecordingStatus] = useState("inactive");
  const { showNotification } = useNotification();
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [_audio, setAudio] = useState<string | null>(null);

  /**
   * Require micro permission first, after that start record the audio.
   */
  const startRecording = useCallback(async () => {
    if ("MediaRecorder" in window) {
      try {
        // Accept micro permission
        const streamData = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        setRecordingStatus("recording");
        //create new Media recorder instance using the stream
        const media = new MediaRecorder(streamData, { mimeType: "audio/webm" });
        //set the MediaRecorder instance to the mediaRecorder ref
        mediaRecorder.current = media;
        //invokes the start method to start the recording process
        mediaRecorder.current.start();
        const localAudioChunks: Blob[] = [];
        mediaRecorder.current.ondataavailable = (event) => {
          if (typeof event.data === "undefined") return;
          if (event.data.size === 0) return;
          localAudioChunks.push(event.data);
        };
        setAudioChunks(localAudioChunks);
      } catch (err) {
        alert(err);
      }
    } else {
      showNotification({
        color: "error",
        title: t("order.trip.message_modal.voice_record_error_title"),
        message: t("order.trip.message_modal.voice_record_error_permission_message"),
      });
    }
  }, [showNotification, t]);

  /**
   * Stop record create url and upload to server
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorder.current) {
      setRecordingStatus("inactive");
      // stops the recording instance
      mediaRecorder.current.stop();
      mediaRecorder.current.onstop = async () => {
        // Creates a blob file from the audio chunks data
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

        // Upload lên server
        const audioFile = new File([audioBlob], "recorded-audio.webm", { type: "audio/webm" });

        const { data, status } = await postForm<ApiResult>("/api/upload", {
          file: audioFile,
          type: "INTERNAL_MESSAGE",
        });

        // Creates a playable URL from the blob file.
        const audioUrl = URL.createObjectURL(audioFile);
        setAudio(audioUrl);
        setAudioChunks([]);

        if (status !== HttpStatusCode.Ok) {
          showNotification({
            color: "error",
            title: t("order.trip.message_modal.voice_record_error_title"),
            message: t("order.trip.message_modal.voice_record_try_later_message"),
          });
        } else {
          onRecord(audioUrl, data.fileName);
        }
      };
      const stream = mediaRecorder.current.stream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      mediaRecorder.current = null;
    }
  }, [audioChunks, t, onRecord, showNotification]);

  return (
    <div>
      <div className="audio-controls">
        {recordingStatus === "inactive" ? (
          <div onClick={startRecording} className="text-gray-400 hover:text-gray-600">
            <LiaMicrophoneSolid className="h-6 w-6" aria-hidden="true" />
          </div>
        ) : null}

        {recordingStatus === "recording" ? (
          <div onClick={stopRecording} className="text-red-600">
            <FaRegStopCircle className="h-6 w-6" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VoiceRecord;
