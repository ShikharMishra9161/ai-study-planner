const express = require("express");
const crypto  = require("node:crypto");
const User    = require("../models/User");
const { isProduction, hashToken, startSession } = require("../utils/authTokens");

const router = express.Router();

const STATE_COOKIE = "oauthState";
const STATE_TTL_MS = 10 * 60 * 1000;
const LOGIN_CODE_TTL_MS = 60 * 1000;

const clientUrl = () => (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
const serverUrl = () => (process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "");
const callbackUrl = (provider) => `${serverUrl()}/api/auth/oauth/${provider}/callback`;

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${url} responded with ${response.status}`);
  }
  return response.json();
}

const providers = {
  google: {
    idField: "googleId",
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    extraAuthParams: { prompt: "select_account" },
    async getProfile(accessToken) {
      const info = await fetchJson("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return {
        id: info.sub,
        email: info.email_verified ? info.email : null,
        name: info.name,
        avatar: info.picture,
      };
    },
  },
  github: {
    idField: "githubId",
    clientId: () => process.env.GITHUB_CLIENT_ID,
    clientSecret: () => process.env.GITHUB_CLIENT_SECRET,
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scope: "read:user user:email",
    extraAuthParams: {},
    async getProfile(accessToken) {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "ai-study-planner",
      };
      const [info, emails] = await Promise.all([
        fetchJson("https://api.github.com/user", { headers }),
        fetchJson("https://api.github.com/user/emails", { headers }),
      ]);
      const primary = emails.find((e) => e.primary && e.verified);
      return {
        id: String(info.id),
        email: primary?.email || null,
        name: info.name || info.login,
        avatar: info.avatar_url,
      };
    },
  },
};

const isEnabled = (provider) => Boolean(provider.clientId() && provider.clientSecret());

function redirectToClient(res, params) {
  res.redirect(`${clientUrl()}/oauth/callback?${new URLSearchParams(params)}`);
}

async function findOrCreateUser(provider, profile) {
  const { idField } = provider;

  const linked = await User.findOne({ [idField]: profile.id });
  if (linked) return linked;

  if (!profile.email) {
    throw Object.assign(new Error("No verified email on this account"), { code: "no_verified_email" });
  }

  const email = profile.email.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    // The provider verified this email, so it is safe to link it to the existing account.
    existing[idField] = profile.id;
    if (!existing.avatar) existing.avatar = profile.avatar || null;
    return existing.save();
  }

  return User.create({
    name: profile.name || email.split("@")[0],
    email,
    [idField]: profile.id,
    avatar: profile.avatar || null,
  });
}

router.get("/providers", (req, res) => {
  res.json({ providers: Object.keys(providers).filter((name) => isEnabled(providers[name])) });
});

router.post("/exchange", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ message: "Login code is required" });
    }

    // Clear the code in the same query that matches it, so it can only be used once.
    const user = await User.findOneAndUpdate(
      { oauthCodeHash: hashToken(code), oauthCodeExpires: { $gt: new Date() } },
      { oauthCodeHash: null, oauthCodeExpires: null },
      { new: true }
    );

    if (!user) {
      return res.status(401).json({ message: "Login code is invalid or expired" });
    }

    res.json(await startSession(res, user));
  } catch (error) {
    res.status(500).json({ message: "Error completing sign-in", error: error.message });
  }
});

router.get("/:provider", (req, res) => {
  const provider = providers[req.params.provider];
  if (!provider || !isEnabled(provider)) {
    return res.status(404).json({ message: "Unknown or disabled OAuth provider" });
  }

  const state = crypto.randomBytes(24).toString("hex");
  res.cookie(STATE_COOKIE, `${req.params.provider}:${state}`, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: STATE_TTL_MS,
    path: "/api/auth/oauth",
  });

  const params = new URLSearchParams({
    client_id: provider.clientId(),
    redirect_uri: callbackUrl(req.params.provider),
    response_type: "code",
    scope: provider.scope,
    state,
    ...provider.extraAuthParams,
  });
  res.redirect(`${provider.authorizeUrl}?${params}`);
});

router.get("/:provider/callback", async (req, res) => {
  const name = req.params.provider;
  const provider = providers[name];
  const expectedState = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, { path: "/api/auth/oauth" });

  if (!provider || !isEnabled(provider)) {
    return redirectToClient(res, { error: "provider_disabled" });
  }
  if (req.query.error) {
    return redirectToClient(res, { error: "access_denied" });
  }
  if (!req.query.code || !req.query.state || expectedState !== `${name}:${req.query.state}`) {
    return redirectToClient(res, { error: "invalid_state" });
  }

  try {
    const tokens = await fetchJson(provider.tokenUrl, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: provider.clientId(),
        client_secret: provider.clientSecret(),
        code: String(req.query.code),
        redirect_uri: callbackUrl(name),
        grant_type: "authorization_code",
      }),
    });
    if (!tokens.access_token) {
      throw new Error(tokens.error_description || tokens.error || "No access token returned");
    }

    const profile = await provider.getProfile(tokens.access_token);
    const user = await findOrCreateUser(provider, profile);

    const loginCode = crypto.randomBytes(32).toString("hex");
    user.oauthCodeHash = hashToken(loginCode);
    user.oauthCodeExpires = new Date(Date.now() + LOGIN_CODE_TTL_MS);
    await user.save();

    redirectToClient(res, { code: loginCode });
  } catch (error) {
    console.error(`OAuth ${name} callback failed:`, error.message);
    redirectToClient(res, { error: error.code || "oauth_failed" });
  }
});

module.exports = router;
