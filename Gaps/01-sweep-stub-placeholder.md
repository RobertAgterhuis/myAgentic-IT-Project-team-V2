# Sweep 1 — Stub & Placeholder Detection

## Findings

[🟠 MAJOR] src/webapp/auth.ts:899 — GitHub refresh token flow is explicitly unimplemented

```ts
async refreshToken(_refreshToken: string): Promise<TokenPair> {
  throw new Error('GitHub refresh token flow is not implemented');
}
```

Impact: Any path that requires token refresh for GitHub-backed sessions will fail at runtime instead of renewing access.

[⚪ DEAD CODE] src/webapp/auth.ts:49,902,1131 — revokeToken contract is defined/implemented but never called in the codebase

```ts
revokeToken(accessToken: string): Promise<void>;

async revokeToken(_accessToken: string): Promise<void> {
  return;
}
```

Impact: Logout/token invalidation behavior is partially performative; the explicit revoke path exists but is not wired.

[⚪ DEAD CODE] src/webapp/auth.ts:48,898,1070 — refreshToken interface path has no in-repo call sites

```ts
refreshToken(refreshToken: string): Promise<TokenPair>;
```

Impact: Token refresh capability is not fully integrated as an execution path; one provider implementation is also non-functional.
