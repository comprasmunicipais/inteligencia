/**
 * Wrapper around fetch that intercepts 401 responses and redirects to the
 * login page, preventing the user from remaining on a broken session state.
 */
export async function fetchWithAuth(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const response = await fetch(url, options);

  if (response.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login?error=session_expired';
  }

  return response;
}
