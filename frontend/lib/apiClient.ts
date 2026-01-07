// frontend/lib/apiClient.ts
import axios from "axios";
import { auth } from "./firebase";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
// Normalize baseURL to remove trailing slash to avoid double-slash issues
const normalizedBaseURL = baseURL.replace(/\/+$/, "");

const api = axios.create({
  baseURL: normalizedBaseURL,
});

api.interceptors.request.use(async (config) => {
  // Ensure headers object exists
  config.headers = config.headers || {};

  // Get Firebase auth token for all requests when user is logged in
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (error) {
      // Auth token retrieval failed - backend will return 403
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to get auth token for API request:", config.url);
      }
    }
  }
  return config;
});

export default api;

