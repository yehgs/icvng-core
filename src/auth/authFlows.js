// packages/core/src/auth/authFlows.js
//
// Ported from client/src/pages/Login.jsx and Register.jsx: the sequence of
// "call the endpoint, persist tokens, fetch the full user record" that
// happens after a successful login or registration. Deliberately excludes
// anything UI-specific (toasts, navigation, redirect-query-param handling,
// dispatching to a store) — each app's screen still owns its own UI and
// calls dispatch(setUserDetails(...)) itself with the `user` this returns.
// That keeps this module usable from a plain function call on either
// platform without assuming React, Redux, or any particular router.
//
// Both functions take the same first three arguments so a caller only
// needs to construct these once (see ../api/createApiClient.js and
// ../storage/createStorageAdapter.js):
//   - apiClient: the object returned by createApiClient()
//   - tokenStorage: the same adapter passed into createApiClient() — tokens
//     are written here identically to how the interceptor reads them back
//   - endpoints: typically core's own `endpoints` export, but accepted as
//     a parameter rather than imported directly so a caller could pass a
//     modified/mocked map in tests

async function persistTokensAndFetchUser({ apiClient, tokenStorage, endpoints, tokenData }) {
  // Server has returned either shape historically (see
  // createApiClient.js's own refresh-token handling for the same
  // accessToken/accesstoken fallback) — matched here for the same reason.
  const accessToken = tokenData?.accessToken || tokenData?.accesstoken;
  const refreshToken = tokenData?.refreshToken;

  if (accessToken) await tokenStorage.setItem('accesstoken', accessToken);
  if (refreshToken) await tokenStorage.setItem('refreshToken', refreshToken);

  const userRes = await apiClient({ ...endpoints.userDetails });
  return userRes.data?.data;
}

/**
 * @returns {{ success: true, user: object } | { success: false, message: string }}
 *   Never throws for an ordinary failed-login response (wrong password,
 *   etc.) — only for actual network/unexpected errors, which the caller
 *   should catch and handle same as any other request failure.
 */
export async function login({ apiClient, tokenStorage, endpoints, email, password }) {
  const response = await apiClient({
    ...endpoints.login,
    data: { email, password },
  });

  if (response.data?.error) {
    return { success: false, message: response.data.message };
  }
  if (!response.data?.success) {
    return { success: false, message: response.data?.message || 'Login failed' };
  }

  const user = await persistTokensAndFetchUser({
    apiClient,
    tokenStorage,
    endpoints,
    tokenData: response.data.data,
  });
  return { success: true, user, message: response.data.message };
}

/**
 * @returns one of:
 *   { success: true, requiresVerification: true, email }
 *     — account created, cannot log in until the emailed link is clicked
 *   { success: true, requiresVerification: false, user }
 *     — account created and auto-logged-in (matches Register.jsx exactly,
 *       including falling back to "just go log in manually" if the
 *       auto-login call itself fails rather than treating it as a hard
 *       registration failure)
 *   { success: false, message }
 */
export async function register({ apiClient, tokenStorage, endpoints, name, email, password }) {
  const response = await apiClient({
    ...endpoints.register,
    data: { name, email, password },
  });

  if (response.data?.error) {
    return { success: false, message: response.data.message };
  }
  if (!response.data?.success) {
    return { success: false, message: response.data?.message || 'Registration failed' };
  }

  if (response.data.requiresVerification) {
    return { success: true, requiresVerification: true, email, message: response.data.message };
  }

  try {
    const loginResult = await login({ apiClient, tokenStorage, endpoints, email, password });
    if (loginResult.success) {
      return {
        success: true,
        requiresVerification: false,
        user: loginResult.user,
        message: response.data.message,
      };
    }
    // Registration itself succeeded even though auto-login didn't — same
    // as Register.jsx, this is not treated as a registration failure.
    return { success: true, requiresVerification: false, user: null, autoLoginFailed: true };
  } catch {
    return { success: true, requiresVerification: false, user: null, autoLoginFailed: true };
  }
}
