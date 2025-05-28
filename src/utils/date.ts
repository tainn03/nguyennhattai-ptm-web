/* eslint-disable @typescript-eslint/no-explicit-any */
import "moment/locale/vi";
import "moment/locale/ja";

import moment from "moment";

import { END_OF_TIME, START_OF_TIME } from "@/constants/date";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { LocaleType } from "@/types/locale";
import { ensureString } from "@/utils/string";

/**
 * Create a countdown timer string from a given number of seconds.
 *
 * @param seconds - The number of seconds for the countdown timer.
 * @returns A formatted string in the format "mm:ss" representing the countdown timer.
 */
export const countdown = (seconds: number) => {
  const duration = moment.duration(seconds, "seconds");
  const min = ensureString(duration.minutes()).padStart(2, "0");
  const sec = ensureString(duration.seconds()).padStart(2, "0");
  return `${min}:${sec}`;
};

/**
 * Formats a date using the specified format using the Moment.js library.
 * If the provided date is invalid or not provided, an empty string is returned.
 *
 * @param {Date | string | number | null} date - The date to be formatted.
 * @param {string} [format] - The format string to be used (optional).
 * @param {LocaleType} locale - The locale for formatting the date (default: "vi").
 * @returns {string} - The formatted date string or an empty string if the date is invalid or not provided.
 */
export const formatDate = (date?: Date | string | number | null, format?: string, locale = DEFAULT_LOCALE): string => {
  // Check if a valid date is provided
  if (date) {
    // Check if the Moment.js object represents a valid date
    const momentDate = moment(date).locale(locale);
    if (momentDate.isValid()) {
      return momentDate.format(format);
    }
  }
  return "";
};

/**
 * Parses a date into a JavaScript Date object using moment.js.
 *
 * @param {Date | string | number | null} date - The date to parse. This can be a Date object, a string, a number (timestamp), or null.
 * @param {string} [format] - The format of the date string. This is only used if the date is a string.
 * @returns {Date | null} The parsed date as a Date object, or null if the date is not valid or not provided.
 */
export const parseDate = (date?: Date | string | number | null, format?: string): Date | null => {
  if (date) {
    const momentDate = moment(date, format);
    if (momentDate.isValid()) {
      return momentDate.toDate();
    }
  }
  return null;
};

/**
 * Get the Start of the Day
 *
 * This function takes a date, string, or number and returns a new Date object representing
 * the start of the day for that date. If the input is null or undefined, it returns null.
 *
 * @param {Date | string | number | null} date - The input date, string, or number.
 * @returns {Date | null} - A Date object representing the start of the day or null if input is null.
 */
export const startOfDay = (date?: Date | string | number | null): Date | null => {
  if (date) {
    return moment(date).startOf("day").toDate();
  }
  return null;
};

/**
 * Get the End of the Day
 *
 * This function takes a date, string, or number and returns a new Date object representing
 * the end of the day for that date. If the input is null or undefined, it returns null.
 *
 * @param {Date | string | number | null} date - The input date, string, or number.
 * @returns {Date | null} - A Date object representing the end of the day or null if input is null.
 */
export const endOfDay = (date?: Date | string | number | null): Date | null => {
  if (date) {
    return moment(date).endOf("day").toDate();
  }
  return null;
};

/**
 * Converts the given date to a string representing the start of the day.
 * @param {Date | string | number | null} date - The date to convert.
 * @returns {string | null} A string representing the start of the day, or null if the input is invalid.
 */
export const convertStartOfDayString = (date?: Date | string | number | null): string | null => {
  if (date) {
    // Create a moment object from the provided date
    const momentDate = moment(date);
    // Check if the moment object is valid
    if (momentDate.isValid()) {
      // Format the start of the day as "YYYY-MM-DD" and concatenate with the start of time
      return [momentDate.startOf("day").format("YYYY-MM-DD"), START_OF_TIME].join("T");
    }
  }
  // Return null if the input date is invalid or not provided
  return null;
};

/**
 * Converts the given date to a string representing the end of the day.
 * @param {Date | string | number | null} date - The date to convert.
 * @returns {string | null} A string representing the end of the day, or null if the input is invalid.
 */
export const convertEndOfDayString = (date?: Date | string | number | null): string | null => {
  if (date) {
    // Create a moment object from the provided date
    const momentDate = moment(date);
    // Check if the moment object is valid
    if (momentDate.isValid()) {
      // Format the end of the day as "YYYY-MM-DD" and concatenate with the end of time
      return [momentDate.endOf("day").format("YYYY-MM-DD"), END_OF_TIME].join("T");
    }
  }
  // Return null if the input date is invalid or not provided
  return null;
};

/**
 * Get the Start of the Month
 *
 * This function takes a date, string, or number and returns a new Date object representing
 * the start of the month for that date. If the input is null or undefined, it returns null.
 *
 * @param {Date | string | number | null} date - The input date, string, or number.
 * @returns {Date | null} - A Date object representing the start of the month or null if input is null.
 */
export const startOfMonth = (date?: Date | string | number | null): Date | null => {
  if (date) {
    return moment(date).startOf("month").toDate();
  }
  return null;
};

/**
 * Get the End of the Month
 *
 * This function takes a date, string, or number and returns a new Date object representing
 * the end of the month for that date. If the input is null or undefined, it returns null.
 *
 * @param {Date | string | number | null} date - The input date, string, or number.
 * @returns {Date | null} - A Date object representing the end of the month or null if input is null.
 */
export const endOfMonth = (date?: Date | string | number | null): Date | null => {
  if (date) {
    return moment(date).endOf("month").toDate();
  }
  return null;
};

/**
 * Converts the given date to a string representing the start of the month.
 * @param {Date | string | number | null} date - The date to convert.
 * @returns {string | null} A string representing the start of the month, or null if the input is invalid.
 */
export const convertStartOfMonthString = (date?: Date | string | number | null): string | null => {
  if (date) {
    // Create a moment object from the provided date
    const momentDate = moment(date);
    // Check if the moment object is valid
    if (momentDate.isValid()) {
      // Format the start of the month as "YYYY-MM-DD" and concatenate with the start of time
      return [momentDate.startOf("month").format("YYYY-MM-DD"), START_OF_TIME].join("T");
    }
  }
  // Return null if the input date is invalid or not provided
  return null;
};

/**
 * Converts the given date to a string representing the end of the month.
 * @param {Date | string | number | null} date - The date to convert.
 * @returns {string | null} A string representing the end of the month, or null if the input is invalid.
 */
export const convertEndOfMonthString = (date?: Date | string | number | null): string | null => {
  if (date) {
    // Create a moment object from the provided date
    const momentDate = moment(date);
    // Check if the moment object is valid
    if (momentDate.isValid()) {
      // Format the end of the month as "YYYY-MM-DD" and concatenate with the end of time
      return [momentDate.endOf("month").format("YYYY-MM-DD"), END_OF_TIME].join("T");
    }
  }
  // Return null if the input date is invalid or not provided
  return null;
};

/**
 * Add months to a date.
 *
 * @param {Date} date - The date to add months to.
 * @param {number} months - The number of months to add.
 * @returns {Date} The new date with the months added.
 */
export const addMonths = (date: Date, months: number): Date | null => {
  if (date) {
    return moment(date).add(months, "months").toDate();
  }
  return null;
};

/**
 * Format Date for GraphQL
 *
 * This function takes a date value in various formats (Date object, string, or number) and
 * converts it into a string formatted as "YYYY-MM-DD" suitable for GraphQL date fields.
 * If the input date is not valid or is null, it returns null.
 *
 * @param {Date | string | number | null} date - The date value to be formatted.
 * @returns {string | null} - The formatted date string or null if the input date is not valid or null.
 */
export const formatGraphQLDate = (date?: Date | string | number | null): string | null => {
  if (date) {
    const momentDate = moment(date);
    if (momentDate.isValid()) {
      return momentDate.format("YYYY-MM-DD");
    }
  }
  return null;
};

/**
 * This function calculates the difference between two dates in days.
 * If date1 is after date2, the result will be positive.
 * If date1 is before date2, the result will be negative.
 * If date1 is equal to date2, the result will be 0.
 *
 * @param {Date | string} date1 - The first date.
 * @param {Date | string} date2 - The second date.
 * @returns {number} - The difference between date1 and date2 in days.
 *
 */
export const calculateDateDifferenceInDays = (
  date1: Date | string,
  date2: Date | string,
  precise?: boolean
): number => {
  return moment(date1).diff(moment(date2), "days", precise);
};

/**
 * This function calculates the difference between two dates in seconds.
 * If date1 is after date2, the result will be positive.
 * If date1 is before date2, the result will be negative.
 * If date1 is equal to date2, the result will be 0.
 *
 * @param {Date} date1 - The first date.
 * @param {Date} date2 - The second date.
 * @returns {number} - The difference between date1 and date2 in seconds.
 */
export const calculateDateDifferenceInSeconds = (date1: Date, date2: Date): number => {
  return moment(date1).diff(moment(date2), "seconds");
};

/**
 * This function calculates the difference between two dates in minutes.
 * If date1 is after date2, the result will be positive.
 * If date1 is before date2, the result will be negative.
 * If date1 is equal to date2, the result will be 0.
 *
 * @param {Date} date1 - The first date.
 * @param {Date} date2 - The second date.
 * @returns {number} - The difference between date1 and date2 in minutes.
 */
export const calculateDateDifferenceInMinutes = (date1: Date, date2: Date): number => {
  return moment(date1).diff(moment(date2), "minutes");
};

/**
 * This function calculates the difference between two dates in milliseconds.
 * If date1 is after date2, the result will be positive.
 * If date1 is before date2, the result will be negative.
 * If date1 is equal to date2, the result will be 0.
 *
 * @param {Date} date1 - The first date.
 * @param {Date} date2 - The second date.
 * @returns {number} - The difference between date1 and date2 in seconds.
 */
export const calculateDateDifferenceInMilliseconds = (date1: Date, date2: Date): number => {
  return moment(date1).diff(moment(date2), "milliseconds");
};

/**
 * Generates a formatted date string representing the current date and time
 * according to the specified locale or the default locale ("vi" for Vietnamese).
 *
 * @param {LocaleType} locale - The locale for formatting the date (default: "vi").
 * @returns {string | null} A formatted date string or null if the date couldn't be generated.
 * @see [Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#parameters)
 */
export const getEmailRequestedDate = (locale: LocaleType = DEFAULT_LOCALE): string | null => {
  const dt = new Date();
  let localeDt: string;
  switch (locale) {
    case "en":
      localeDt = "en-US";
      break;
    case "vi":
    default:
      localeDt = "vi-VN";
      break;
  }
  return dt.toLocaleString(localeDt, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

/**
 * Converts a date into a string that represents how long ago that date was from the current time, in a specific locale.
 *
 * @param {Date | string | number} value - The date to convert. Can be a Date object, a string, or a number representing a timestamp.
 * @param {string} locale - The locale to use for the conversion. Defaults to DEFAULT_LOCALE.
 * @returns {string} - A string representing how long ago the date was from the current time.
 */
export const formatDateFromNow = (value: Date | string | number, locale = DEFAULT_LOCALE) => {
  if (value) {
    const momentDate = moment(value);
    if (momentDate.isValid()) {
      return momentDate.locale(locale).fromNow();
    }
  }
  return null;
};

/**
 * Calculate the difference in years between two Date objects.
 *
 * @param date1 - The first Date object.
 * @param date2 - The second Date object.
 * @returns The difference in years between date1 and date2.
 */
export const calculateDateDifferenceInYear = (date1: Date, date2: Date): number => {
  return moment(date1).diff(moment(date2), "year");
};

/**
 * Subtracts the specified number of weeks from the given date using the moment library.
 *
 * @param {Date} date - The input date.
 * @param {number} weeks - The number of weeks to subtract.
 * @returns {Date | null} A new Date object representing the result of subtracting the specified weeks, or null if the input date is falsy.
 */
export const minusWeeks = (date: Date, weeks: number): Date | null => {
  if (date) {
    return moment(date).subtract(weeks, "weeks").toDate();
  }
  return null;
};

/**
 * Subtracts the specified number of months from the given date using the moment library.
 *
 * @param {Date} date - The input date.
 * @param {number} months - The number of months to subtract.
 * @returns {Date | null} A new Date object representing the result of subtracting the specified months, or null if the input date is falsy.
 */
export const minusMonths = (date: Date, months: number): Date | null => {
  if (date) {
    return moment(date).subtract(months, "months").toDate();
  }
  return null;
};

/**
 * Add days to a date.
 *
 * @param {Date} date - The date to add days to.
 * @param {number} days - The number of days to add.
 * @returns {Date} The new date with the days added.
 */
export const addDays = (date: Date, days: number): Date | null => {
  if (date) {
    return moment(date).add(days, "days").toDate();
  }
  return null;
};

/**
 * Subtracts the specified number of days from the given date using the moment library.
 *
 * @param {Date} date - The input date.
 * @param {number} days - The number of days to subtract.
 * @returns {Date | null} A new Date object representing the result of subtracting the specified days, or null if the input date is falsy.
 */
export const minusDays = (date: Date, days: number): Date | null => {
  if (date) {
    return moment(date).subtract(days, "days").toDate();
  }
  return null;
};

/**
 * Checks if the second date occurs after the first date.
 * @param {Date} referenceDate - The reference date for comparison.
 * @param {Date} dateToCompare - The date to compare against the reference date.
 * @returns {boolean} - Returns true if dateToCompare is equal to or after referenceDate, otherwise returns false.
 */
export const isDateEqualOrAfter = (referenceDate: Date, dateToCompare: Date): boolean => {
  // Compare the milliseconds since the Unix epoch for referenceDate and dateToCompare
  // If dateToCompare is greater, it means it comes after referenceDate
  if (dateToCompare.getTime() >= referenceDate.getTime()) {
    return true;
  }

  // If dateToCompare is not greater than referenceDate, return false
  return false;
};

/**
 * Checks if from date and to date is exceed to one month.
 * @param {Date} from - The reference date for comparison.
 * @param {Date} to - The date to compare against the reference date.
 * @returns {boolean} - Returns true if from to exceed to one month, otherwise returns false.
 */
export const isExceedOneMonth = (from: Date, to: Date): boolean => {
  // Get the difference in milliseconds
  const differenceInMilliseconds: number = Math.abs(to.getTime() - from.getTime());

  // Calculate the number of milliseconds in one month
  const millisecondsInOneMonth: number = 30 * 24 * 60 * 60 * 1000;

  // Check if the difference exceeds one month
  return differenceInMilliseconds > millisecondsInOneMonth;
};

/**
 * Check if a value is a valid date and time.
 * @param value The value to check.
 * @returns true if the value is a valid date and time, false otherwise.
 */
export const isValidDate = (value: any): boolean => {
  return moment(value).isValid();
};

/**
/**
 * Synchronizes dates based on changes to either start date or end date.
 * Adjusts the start date and end date accordingly to ensure consistency.
 *
 * @param from The original start date.
 * @param to The original end date.
 * @param itemChange Indicates which date is being changed ("startDate" or "endDate").
 * @param newValue The new value of the date being changed.
 * @returns An object containing the synchronized start date and end date.
 */
export const synchronizeDates = (from: Date, to: Date, itemChange: string, newValue: Date, isWeekly?: boolean) => {
  const days = isWeekly ? 6 : 30;
  let startDate = from;
  let endDate = to;
  if (itemChange === "startDate") {
    startDate = newValue;

    // If [startDate] large than [endDate] then set add 1 month for [endDate]
    if (!isDateEqualOrAfter(startDate, endDate) || isExceedOneMonth(startDate, endDate)) {
      // In case [start date] is start of month then [end date] is end of month
      if (calculateDateDifferenceInDays(startDate, startOfMonth(startDate)!) === 0) {
        endDate = endOfMonth(startDate)!;
      } else {
        endDate = addDays(startDate, days) ?? new Date();
      }
    }
  }

  if (itemChange === "endDate") {
    endDate = newValue;
    // If [endDate] small than [startDate] then set minus add 1 month for [startDate]
    if (!isDateEqualOrAfter(startDate, endDate) || isExceedOneMonth(startDate, endDate)) {
      // In case [end date] is end of month then [start date] is start of month
      if (calculateDateDifferenceInDays(endDate, endOfMonth(endDate)!) === 0) {
        startDate = startOfMonth(endDate)!;
      } else {
        startDate = minusDays(endDate, days) ?? new Date();
      }
    }
  }

  return { from: startDate, to: endDate };
};

/**
 * Get the ISO string start of the Day
 *
 * This function takes a date, string, or number and returns a ISO string
 * the start of the day for that date.
 *
 * @param {Date | string | number } date - The input date, string, or number.
 * @returns {string } - A the ISO string start of the day.
 */
export const startOfDayToISOString = (date?: Date | string | number): string => {
  return moment(date).startOf("day").toISOString();
};

/**
 * Get the ISO string end of the Day
 *
 * This function takes a date, string, or number and returns a ISO string
 * the end of the day for that date.
 *
 * @param {Date | string | number} date - The input date, string, or number.
 * @returns {string} - A the ISO string end of the day.
 */
export const endOfDayToISOString = (date?: Date | string | number): string => {
  return moment(date).endOf("day").toISOString();
};

/**
 * Get the ISO string start of the Month
 *
 * This function takes a date, string, or number and returns a ISO string
 * the start of the month for that date.
 *
 * @param {Date | string | number} date - The input date, string, or number.
 * @returns {string} - A the ISO string start of the month.
 */
export const startOfMonthToISOString = (date?: Date | string | number): string => {
  return moment(date).startOf("month").toISOString();
};

/**
 * Get the ISO string end of the Month
 *
 * This function takes a date, string, or number and returns a ISO string
 * the end of the month for that date.
 *
 * @param {Date | string | number} date - The input date, string, or number.
 * @returns {string} - A the ISO string end of the month.
 */
export const endOfMonthToISOString = (date?: Date | string | number): string => {
  return moment(date).endOf("month").toISOString();
};

/**
 * Gets the client's timezone.
 *
 * @returns {string} The client's timezone as a string.
 */
export const getClientTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Checks if a given date is after the current date.
 *
 * @param date - The date to be compared. It can be of type Date, string, or number.
 *                If not provided, the function will use the current date.
 * @param equal - A boolean indicating whether to consider equality in the comparison.
 *                If true, the function will check if the given date is the same as
 *                or after the current date. If false or not provided, it will only
 *                check if the given date is strictly after the current date.
 *
 * @returns A boolean value:
 *          - true if the given date is the same as or after the current date when `equal` is true.
 *          - true if the given date is strictly after the current date when `equal` is false.
 *
 */
export const isAfterDate = (date?: Date | string | number, equal?: boolean) => {
  const getOnlyDate = moment(date).format("YYYY-MM-DD");
  const getOnlyDateNow = moment().format("YYYY-MM-DD");
  return equal ? moment(getOnlyDate).isSameOrAfter(getOnlyDateNow) : moment(getOnlyDate).isAfter(getOnlyDateNow);
};

/**
 * Determines if a given date is before the current date.
 * Optionally, checks if the given date is the same as or before the current date.
 *
 * @param date - The date to be compared, which could be a Date object, a string, or a number.
 *               If not provided, the function will use the current date for comparison.
 * @param equal - A boolean flag indicating whether to include equality in the comparison.
 *                If true, the function checks if the given date is the same as or before the current date.
 *                If false or not provided, it only checks if the date is strictly before the current date.
 *
 * @returns A boolean value:
 *          - true if the given date is the same as or before the current date when `equal` is true.
 *          - true if the given date is strictly before the current date when `equal` is false.
 *
 *
 */
export const isBeforeDate = (date?: Date | string | number, equal?: boolean) => {
  const getOnlyDate = moment(date).format("YYYY-MM-DD");
  const getOnlyDateNow = moment().format("YYYY-MM-DD");
  return equal ? moment(getOnlyDate).isSameOrBefore(getOnlyDateNow) : moment(getOnlyDate).isBefore(getOnlyDateNow);
};
