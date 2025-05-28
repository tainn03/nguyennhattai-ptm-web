import { config } from "dotenv";

import initialResourceOperation from "./initialResourceOperation";

// Load environment variables from .env file
config({ path: ".env" });

const main = () => initialResourceOperation(1);

// Run the main function
main()
  .then((result) => {
    console.log("-- DONE > initialResourceOperation --");
    return result;
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
