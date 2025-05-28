type LogLevel = "log" | "info" | "debug" | "warning" | "error" | "fatal";

/**
 * Writes logs with the specified level to the logging system.
 *
 * @param level - The level of the log.
 * @param data - The data to be logged.
 */
const writeLog = (level: LogLevel, data: unknown) => {
  switch (level) {
    case "info":
      console.info(data);
      break;
    case "warning":
      console.warn(data);
      break;
    case "error":
    case "fatal":
      console.error(data);
      break;
    case "log":
    case "debug":
    default:
      console.log(data);
      break;
  }
};

const logger = {
  log: (data: unknown) => writeLog("log", data),
  info: (data: unknown) => writeLog("info", data),
  debug: (data: unknown) => writeLog("debug", data),
  warning: (data: unknown) => writeLog("warning", data),
  error: (data: unknown) => writeLog("error", data),
  fatal: (data: unknown) => writeLog("fatal", data),
};

export default logger;
