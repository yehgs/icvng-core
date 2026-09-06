// packages/core/src/auth/verifyEmail.js
//
// Wraps endpoints.verifyEmail. This did not exist anywhere in client
// before this pass — the emailed verification link
// (${domain}/verify-email?code=${userId}) had no page, route, or endpoint
// call consuming it on web, so every user in a deployment with
// requiresVerification enabled landed on a 404 after registering and had
// no way to complete verification through the UI. Fixed here first (one
// function, used by both platforms) rather than only patching mobile's
// deep-link handling around a flow that didn't work in the first place.

/**
 * @param {string} code - the value of the `code` query param from the
 *   emailed verification link (the server treats this as a user _id, not
 *   a signed token — see server/controllers/user.controller.js's
 *   verifyEmailController)
 * @returns {{ success: true, alreadyVerified: boolean } | { success: false, message: string }}
 */
export async function verifyEmailWithCode({ apiClient, endpoints, code }) {
  if (!code) {
    return { success: false, message: 'Missing verification code' };
  }
  try {
    const res = await apiClient({ ...endpoints.verifyEmail, data: { code } });
    if (!res.data?.success) {
      return { success: false, message: res.data?.message || 'Verification failed' };
    }
    return { success: true, alreadyVerified: res.data.message === 'Email already verified' };
  } catch (err) {
    return { success: false, message: err?.response?.data?.message || err.message };
  }
}
