import type { OAuthConfig } from "@cadence/buffer-client";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name} (see .env.example)`);
  return value;
}

export function oauthConfig(): OAuthConfig {
  return {
    clientId: required("BUFFER_CLIENT_ID"),
    clientSecret: process.env.BUFFER_CLIENT_SECRET || undefined,
    redirectUri: `${required("APP_URL")}/callback`,
    scopes: process.env.BUFFER_SCOPES || "account:read posts:read posts:write ideas:read offline_access",
  };
}

export const sessionSecret = () => required("SESSION_SECRET");
