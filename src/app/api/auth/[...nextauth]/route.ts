import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
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

// Email provider configuration
if (process.env.EMAIL_SERVER_HOST) {
  if (!process.env.EMAIL_SERVER_PORT || !process.env.EMAIL_FROM) {
    throw new Error("EMAIL_SERVER_PORT and EMAIL_FROM are required when EMAIL_SERVER_HOST is set");
  }
  
  // Build server configuration - auth is optional for local servers
  const serverConfig: {
    host: string;
    port: number;
    secure?: boolean;
    requireTLS?: boolean;
    tls?: { rejectUnauthorized: boolean };
    auth?: { user: string; pass: string };
  } = {
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT),
  };
  
  // Configure TLS settings based on the host and port
  if (process.env.EMAIL_SERVER_HOST === 'smtp.gmail.com') {
    // Gmail requires TLS
    serverConfig.secure = false; // true for 465, false for other ports
    serverConfig.requireTLS = true;
  } else {
    // For other servers (like your Postfix)
    serverConfig.secure = false;
    serverConfig.requireTLS = false;
    serverConfig.tls = {
      rejectUnauthorized: false
    };
  }
  
  // Add auth only if credentials are provided
  if (process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD) {
    serverConfig.auth = {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD
    };
  }
  
  providers.push(
    EmailProvider({
      server: serverConfig,
      from: process.env.EMAIL_FROM,
    })
  );
} else if (process.env.RESEND_API_KEY) {
  // Alternative: Resend provider (more modern email service)
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is required when RESEND_API_KEY is set");
  }
  providers.push(
    EmailProvider({
      server: `https://api.resend.com/emails`,
      from: process.env.EMAIL_FROM,
      // Custom sendVerificationRequest for Resend
      async sendVerificationRequest({ identifier: email, url, provider }) {
        const { host } = new URL(url);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: provider.from,
            to: email,
            subject: `Accedi a ${host}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Accedi a MatBit</h2>
                <p>Hai richiesto di accedere al tuo account su <strong>${host}</strong>.</p>
                <p>Clicca sul pulsante qui sotto per accedere:</p>
                <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                  Accedi a MatBit
                </a>
                <p style="color: #666; font-size: 14px;">
                  Se non hai richiesto questo accesso, puoi ignorare questa email.
                  Questo link scadrà in 24 ore.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                <p style="color: #888; font-size: 12px;">
                  Questo messaggio è stato inviato da MatBit - ${host}
                </p>
              </div>
            `,
            text: `Accedi a MatBit\n\nHai richiesto di accedere al tuo account su ${host}.\n\nClicca sul link qui sotto per accedere:\n${url}\n\nSe non hai richiesto questo accesso, puoi ignorare questa email.\nQuesto link scadrà in 24 ore.`,
          }),
        });
        
        if (!res.ok) {
          throw new Error(`Failed to send email: ${res.statusText}`);
        }
      },
    })
  );
}

const handler = NextAuth({
  providers,
  adapter: MongoDBAdapter(clientPromise),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user }) {
      // Set name to email if not already set (especially for email provider)
      if (!user.name && user.email) {
        user.name = user.email;
      }
      return true;
    },
    async session({ session }) {
      // Ensure name is set to email if not already set
      if (!session.user?.name && session.user?.email) {
        session.user.name = session.user.email;
      }
      return session;
    },
    async jwt({ token, user }) {
      // When user signs in, ensure name is set to email if not already set
      if (user && !user.name && user.email) {
        user.name = user.email;
        token.name = user.email;
      }
      return token;
    },
  },
});

export { handler as GET, handler as POST };
