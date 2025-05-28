import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import twColors from "tailwindcss/colors";

/**
 * Merges and concatenates multiple class names together.
 *
 * @param {...ClassValue} values - The class names to be merged and concatenated.
 * @returns {string} The merged and concatenated class names.
 */
export const cn = (...values: ClassValue[]) => {
  return twMerge(clsx(values));
};

/**
 * Tailwind Colors
 * @see https://tailwindcss.com/docs/customizing-colors
 */
export const colors = twColors;
