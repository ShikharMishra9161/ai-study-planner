import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../utils/api";

const ERROR_MESSAGES = {
  access_denied: "Sign-in was cancelled",
  no_verified_email: "Your account has no verified email address",
  invalid_state: "Sign-in session expired, please try again",
  provider_disabled: "That sign-in option is not available",
};

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    // The login code is single-use, so don't send it twice under StrictMode.
    if (handled.current) return;
    handled.current = true;

    const code = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      toast.error(ERROR_MESSAGES[error] || "Sign-in failed, please try again");
      navigate("/", { replace: true });
      return;
    }

    // Plain axios: a failed exchange should show an error, not trigger the refresh interceptor.
    axios
      .post(`${API_BASE_URL}/auth/oauth/exchange`, { code }, { withCredentials: true })
      .then((res) => {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast.success(`Welcome, ${res.data.user.name}!`);
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Sign-in failed, please try again");
        navigate("/", { replace: true });
      });
  }, [params, navigate]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <span className="spinner" />
    </div>
  );
}
