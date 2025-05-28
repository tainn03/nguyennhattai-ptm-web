/**
 * Checks if the given input string is a valid regular expression.
 * Returns true if the input is empty or null, indicating that it's considered valid.
 *
 * @param {string | null | undefined} input - The input string to check.
 * @returns {boolean} - True if the input is a valid regular expression, otherwise false.
 */
export const isRegexValid = (input?: string | null): boolean => {
  try {
    // Return true if the input is empty or null, indicating that it's considered valid.
    return !input || !!new RegExp(input);
  } catch {
    // If an exception is caught, the input is not a valid regular expression.
  }
  return false;
};
