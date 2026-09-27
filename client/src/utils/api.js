import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

const getAccessToken = () => localStorage.getItem("token");

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

API.interceptors.request.use((req) => {
  const token = getAccessToken();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const nextToken = res.data?.token;
        if (!nextToken) {
          throw new Error("No access token returned from refresh endpoint");
        }

        localStorage.setItem("token", nextToken);
        originalRequest.headers.Authorization = `Bearer ${nextToken}`;

        return API(originalRequest);
      } catch (refreshError) {
        clearSession();
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

setInterval(() => {
  API.get("/ping").catch(() => {});
}, 14 * 60 * 1000);

export default API;