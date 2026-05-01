'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

/**
 * GoogleAuthProvider
 *
 * Wraps the app with @react-oauth/google's GoogleOAuthProvider.
 * Must be a 'use client' component because the library uses browser APIs.
 * Placed outside AuthProvider so the Google button is available on login/register pages.
 *
 * Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID env var.
 * If not set, the app still works — Google Sign-In button just won't appear.
 */
export default function GoogleAuthProvider({ children }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // If Google Client ID not configured, render without Google OAuth
  // (email/password login still works)
  if (!clientId) {
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
