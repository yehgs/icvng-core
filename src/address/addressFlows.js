// packages/core/src/address/addressFlows.js
//
// Ported from client/src/pages/CheckoutPage.jsx's handleSaveAddress. The
// inline checkout address form uses one set of field names (fullName,
// phone, address_line, city, state, lga, label); the server's
// addAddressController expects a slightly different set (mobile instead
// of phone, plus address_type/status). Getting this mapping wrong on one
// platform and not the other is exactly the kind of drift that's easy to
// introduce by hand-rolling the same six-field object twice.

/**
 * @param {object} formData - { address_line, address_line_2?, city, state, lga?, phone }
 * @returns {object} payload shaped for endpoints.createAddress
 */
export function buildAddressPayload(formData) {
  return {
    address_line: formData.address_line,
    address_line_2: formData.address_line_2 || '',
    city: formData.city,
    state: formData.state,
    lga: formData.lga || formData.state, // fall back to state name if LGA not selected
    mobile: formData.phone, // server field is "mobile", form field is "phone"
    address_type: 'home',
    status: true,
  };
}

/**
 * @param {object} params
 * @param {object} params.apiClient
 * @param {object} params.endpoints
 * @param {object} params.formData
 * @returns {{ success: true, address: object } | { success: false, message: string }}
 */
export async function createAddress({ apiClient, endpoints, formData }) {
  try {
    const res = await apiClient({
      ...endpoints.createAddress,
      data: buildAddressPayload(formData),
    });
    if (!res.data?.success) {
      return { success: false, message: res.data?.message || 'Could not save address' };
    }
    return { success: true, address: res.data.data };
  } catch (err) {
    return { success: false, message: err?.response?.data?.message || err.message };
  }
}

/**
 * @returns {Array} the address list on success, [] on failure (matches the
 *   original's silent-catch background-load pattern used throughout this
 *   codebase for non-critical fetches)
 */
export async function fetchAddresses({ apiClient, endpoints }) {
  try {
    const res = await apiClient({ ...endpoints.getAddress });
    return res.data?.success ? res.data.data || [] : [];
  } catch {
    return [];
  }
}

/**
 * Picks the address checkout should default to: the one marked primary,
 * or the first in the list if none is marked, or null if the list is
 * empty (in which case CheckoutPage.jsx shows the "add an address" form
 * instead of a shipping-address selector).
 */
export function pickDefaultAddress(addressList) {
  return addressList.find((a) => a.is_primary) || addressList[0] || null;
}
