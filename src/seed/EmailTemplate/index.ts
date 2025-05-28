import { config } from "dotenv";

import initialEmailTemplate from "./initialEmailTemplate";

// Load environment variables from .env file
config({ path: ".env" });

/**
 * Main function for reading and importing administrative unit data from an Excel file.
 */
const main = () => initialEmailTemplate(1);

// Run the main function
main()
  .then((result) => {
    console.log("-- DONE > initialEmailTemplate --");
    return result;
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
