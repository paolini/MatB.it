import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import clientPromise from "@/lib/mongodb";
import { MongoDBAdapter } from "@auth/mongodb-adapter";

const providers = [];

if (process.env.GITHUB_ID) {
  if (!process.env.GITHUB_SECRET) {
    throw new Error("GITHUB_SECRET is required when NEXT_PUBLIC_GITHUB_ID is set");
  }
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}
if (process.env.GOOGLE_CLIENT_ID) {
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_SECRET is required when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set");
  }
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

const handler = NextAuth({
  providers,
  adapter: MongoDBAdapter(clientPromise),
});

export { handler as GET, handler as POST };
