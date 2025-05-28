/**
 * Password validation RegEx for JavaScript/Typescript
 *
 * Passwords must be:
 * - At least 8 characters long, max length anything
 * - Include at least 1 lowercase letter
 * - 1 capital letter
 * - 1 number
 * - 1 special character => !@#$%^&*
 *
 * @author Harish Chaudhari <harishchaudhari.com>
 * https://gist.github.com/HarishChaudhari/0dd5514ce430991a1b1b8fa04e8b72a4
 */
export const PATTERN_PASSWORD = /^(?=.*[\d])(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*])[\w!@#$%^&*]{8,}$/;

/**
 * Pattern for a valid username. It enforces the following rules:
 * - Must start with a letter (a-z, A-Z) or a digit (0-9).
 * - Can contain letters, digits, underscores (_), hyphens (-), and dots (.).
 * - Must be at least two characters in length after the initial character.
 *
 * Example:
 * - Valid: my_username123, user.name, 3username
 * - Invalid: _username, user@name, username!, 1
 */
export const PATTERN_USERNAME = /^[a-zA-Z0-9][a-zA-Z0-9@_\-.]{1,}$/;

/**
 * Property naming conventions RegEx for JavaScript/Typescript
 *
 * This regular expression means:
 * - It must start with one of the characters: a-z, A-Z or underscore (_).
 * - The following characters can be any combination of letters from a-z, A-Z,
 * numbers from 0-9, underscore (_) or Unicode characters (to support non-ASCII
 * characters in variable names).
 */
export const PATTERN_PROPERTY_NAMING = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Special characters RegEx for JavaScript/Typescript
 *
 * This regular expression matches any of the following special characters:
 * - hyphen (-)
 * - square brackets ([])
 * - curly braces ({})
 * - parentheses (())
 * - asterisk (*)
 * - plus sign (+)
 * - question mark (?)
 * - period (.)
 * - comma (,)
 * - backslash (\\)
 * - caret (^)
 * - dollar sign ($)
 */
export const PATTERN_SPECIAL_CHARACTERS = /[-[\]{}()*+?.,\\^$]/g;
