"use client";
import { SessionProvider } from "next-auth/react";
import ApolloContainer from "@/components/ApolloContainer";
import NavBar from "@/components/NavBar";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ApolloContainer>
        <NavBar />
        <div className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </div>
      </ApolloContainer>
    </SessionProvider>
  );
}
