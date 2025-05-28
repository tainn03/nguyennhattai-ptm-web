import { AnyObject } from "yup";

import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";

/**
 * Moves disabled items to the bottom of the array while preserving the original order of other items.
 * This function is designed for sorting an array of objects with a 'disabled' property.
 *
 * @param {Array<AnyObject>} arrayToSort - The array to be sorted, containing objects with a 'disabled' property.
 * @returns {ComboboxItem[]} - A new array with disabled items moved to the bottom.
 */
export const moveDisabledToBottom = (arrayToSort: Array<AnyObject>): ComboboxItem[] => {
  const sortedArray = arrayToSort.sort((a, b) => {
    if (a.disabled && !b.disabled) {
      return 1;
    }
    if (!a.disabled && b.disabled) {
      return -1;
    }
    return 0;
  });

  return sortedArray as ComboboxItem[];
};
