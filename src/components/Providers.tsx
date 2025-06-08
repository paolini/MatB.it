"use client";
import { SessionProvider } from "next-auth/react";
import ApolloContainer from "@/components/ApolloContainer";
import NavBar from "@/components/NavBar";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ApolloContainer>
        <NavBar />
        {children}
      </ApolloContainer>
    </SessionProvider>
  );
}
