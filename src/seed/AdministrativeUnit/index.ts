import { config } from "dotenv";

import initialAdministrativeUnit from "./initialAdministrativeUnit";

// Load environment variables from .env file
config({ path: ".env" });

/**
 * Main function for reading and importing
 * administrative unit data from an Excel file.
 */
const main = () => initialAdministrativeUnit(1);

// Run the main function
main()
  .then((result) => {
    console.log("-- DONE > initialAdministrativeUnit --");
    return result;
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
