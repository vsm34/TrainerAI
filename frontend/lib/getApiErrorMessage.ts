/**
 * Extract user-friendly error messages from API errors.
 * Handles axios errors, network failures, and status codes.
 */
export function getApiErrorMessage(error: unknown): string {
  // Type guard for axios errors
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any;

    // If backend provided a detail message, use it
    if (axiosError.response?.data?.detail && typeof axiosError.response.data.detail === 'string') {
      return axiosError.response.data.detail;
    }

    // Map common HTTP status codes to user-friendly messages
    const status = axiosError.response?.status;
    if (status) {
      switch (status) {
        case 400:
          return "Bad request. Please check your inputs.";
        case 401:
          return "Your session expired. Please sign in again.";
        case 403:
          return "You don't have permission to do that.";
        case 404:
          return "Not found.";
        case 409:
          return "Already exists or conflicts with existing data.";
        case 422:
          return "Validation error. Please check required fields.";
        case 500:
        case 502:
        case 503:
        case 504:
          return "Server error. Please try again.";
        default:
          if (status >= 500) {
            return "Server error. Please try again.";
          }
          return `Request failed with status ${status}.`;
      }
    }
  }

  // Network error (no response from server)
  if (error && typeof error === 'object' && 'request' in error) {
    return "Cannot reach the server. Is the backend running and is your API URL/CORS correct?";
  }

  // Generic fallback
  return "An unexpected error occurred. Please try again.";
}
