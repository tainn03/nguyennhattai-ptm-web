import { AnyObject } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { get } from "@/utils/api";
import { createTranslator } from "@/utils/locale";
import { joinNonEmptyStrings } from "@/utils/string";

/**
 * Retrieves location information using Nominatim API based on provided latitude and longitude.
 *
 * @param {number} latitude - The latitude of the location.
 * @param {number} longitude - The longitude of the location.
 * @returns {Promise<string | undefined>} A Promise that resolves to a formatted address or undefined if the request fails.
 */
export const getLocationNominatim = async (latitude: number, longitude: number): Promise<string | undefined> => {
  const t = await createTranslator();
  const url = "https://nominatim.openstreetmap.org/";

  const config = {
    headers: { "Accept-Language": t("common.format.accept_language") },
  };

  let result = await get<AnyObject>(`${url}/reverse?lat=${latitude}&lon=${longitude}&format=json`, undefined, config);

  if (!result || (result.status && result.status !== HttpStatusCode.Ok)) {
    result = await get<AnyObject>(`${url}/reverse?lat=${latitude}&lon=${longitude}&format=json`, undefined, config);
  }

  if (result && result.display_name) {
    // Handle make address array from display name.
    let addressArray = result.display_name.split(",");

    // Get country name.
    const country = result?.address?.country ?? "";

    // Get post code.
    const postcode = result?.address?.postcode ?? "";

    // Remove the postcode, country name in the address array.
    addressArray = addressArray.filter((item: string) => item.trim() !== country && item.trim() !== postcode);

    return joinNonEmptyStrings(addressArray, ", ");
  }
  return undefined;
};
