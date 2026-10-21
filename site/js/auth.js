import { Amplify } from "aws-amplify";
import { signIn, signOut, getCurrentUser, fetchAuthSession } from "aws-amplify/auth";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
    },
  },
});

// Call at the top of every protected page
export async function requireLogin() {
  try { await getCurrentUser(); }
  catch { window.location.href = "/login.html"; }
}

export async function login(email, password) {
  const { isSignedIn } = await signIn({ username: email, password });
  if (isSignedIn) window.location.href = "/index.html";
}

export async function logout() {
  await signOut();
  window.location.href = "/login.html";
}

// Use instead of fetch for every API call
export async function api(path, options = {}) {
  const { tokens } = await fetchAuthSession();
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens?.idToken?.toString()}`,
    },
  });
  if (res.status === 401) { window.location.href = "/login.html"; return; }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}