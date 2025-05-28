import initialOrganizationInitialValue from "./initialOrganizationInitialValue";

/**
 * Main function for reading and importing administrative unit data from an Excel file.
 */
const main = () => initialOrganizationInitialValue(1);

// Run the main function
main()
  .then((result) => {
    console.log("-- DONE > initialOrganizationInitialValue --");
    return result;
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
