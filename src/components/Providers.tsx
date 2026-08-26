"use client";
import ApolloContainer from "@/components/ApolloContainer";
import NavBar from "@/components/NavBar";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloContainer>
      <NavBar />
      <div className="mx-auto px-4 py-6">
        {children}
      </div>
    </ApolloContainer>
  );
}
