"use client";

import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaPause, FaPlay } from "react-icons/fa";

export type VoiceMessageProps = {
  src: string;
  color?: string;
};

const VoiceMessage = ({ src, color = "blue-700" }: VoiceMessageProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState("--:--");

  /**
   * Format the time in second to format "mm:ss"
   * @param timeInSecond Time in second to format
   */
  const formatTime = useCallback((timeInSecond: number) => {
    const time = Math.ceil(timeInSecond);
    // Hour
    const hour = Math.floor(time / 60 / 60);
    let formatHour = "";

    if (hour > 0) {
      formatHour = hour < 10 ? `0${hour}` : hour.toString();
    }
    // Minute
    const minute = Math.floor(time / 60);
    let formatMinute = "";

    if (minute >= 60) {
      const minuteInHour = minute % 60;
      formatMinute = minuteInHour < 10 ? `0${minuteInHour}` : minuteInHour.toString();
    } else {
      formatMinute = minute < 10 ? `0${minute}` : minute.toString();
    }
    // Second
    const second = time % 60;
    const formatSecond = second < 10 ? `0${second}` : second.toString();
    const result = formatHour ? `${formatHour}:${formatMinute}:${formatSecond}` : `${formatMinute}:${formatSecond}`;

    return result;
  }, []);

  /**
   * Load total time of voice message
   */
  const handleUpdateMetadata = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(formatTime(audioRef.current.duration));
    }
  }, [formatTime]);

  /**
   * Update the current time of voice message when playing
   */
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const time = formatTime(audioRef.current.duration - audioRef.current.currentTime);
      setCurrentTime(time);
    }
  }, [formatTime]);

  /**
   * Set state is playing or not to Stop or Play voice message
   */
  const handlePlayClick = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  /**
   * Set state is playing or not to Stop or Play voice message
   */
  const handleEnded = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(formatTime(audioRef.current.duration));
    }
  }, [formatTime]);

  /**
   * Load total time of voice message
   */
  useEffect(() => {
    if (audioRef.current?.duration) {
      setCurrentTime(formatTime(audioRef.current.duration));
    }
  }, [formatTime]);

  return (
    <div
      className={clsx(
        "flex max-w-fit flex-row items-center justify-center gap-2 rounded-full px-2 py-[2px]",
        `bg-${color}`
      )}
    >
      <audio
        onLoadedMetadata={handleUpdateMetadata}
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white" onClick={handlePlayClick}>
        <div className={clsx("text-[10px]", `text-${color}`)}>{isPlaying ? <FaPause /> : <FaPlay />}</div>
      </div>

      <img
        src={isPlaying ? "/assets/images/play-sound.gif" : "/assets/images/stop-sound.png"}
        width={40}
        alt="Sound animation"
      />
      <p
        className={clsx(
          { "min-w-[80px]": currentTime.length > 5 },
          { "min-w-[50px]": currentTime.length <= 5 },
          "max-w-fit text-white"
        )}
      >
        {currentTime}
      </p>
    </div>
  );
};

export default VoiceMessage;
