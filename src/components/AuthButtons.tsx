"use client";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";

// Determina i provider abilitati tramite variabili d'ambiente pubbliche
const enabledProviders: string[] = [];
if (process.env.NEXT_PUBLIC_GITHUB_ID) enabledProviders.push("github");
if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) enabledProviders.push("google");

export default function AuthButtonsWrapper() {
  return (
    <SessionProvider>
      <AuthButtons />
    </SessionProvider>
  );
}

function AuthButtons() {
  const { data: session } = useSession();
  if (session) {
    return (
      <div>
        <p>Benvenuto, {session.user?.name || session.user?.email}!</p>
        <button onClick={() => signOut()}>Logout</button>
      </div>
    );
  }
  return (
    <div>
      <button onClick={() => signIn()}>Login</button>
    </div>
  );
}
