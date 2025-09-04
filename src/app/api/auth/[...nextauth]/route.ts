import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import clientPromise from "@/lib/mongodb";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { logAction } from "@/lib/models";
import { ObjectId } from "mongodb";

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
    async signIn({ user, account, profile }) {
      // Set name to email if not already set (especially for email provider)
      if (!user.name && user.email) {
        user.name = user.email;
      }
      
      // Handle automatic account linking for OAuth providers
      // SECURITY NOTICE: This automatically links OAuth accounts (Google, GitHub) 
      // to existing users with the same email address. This is convenient but requires
      // trust in the OAuth providers to properly verify email ownership.
      // 
      // Risks:
      // - If an OAuth provider is compromised, attackers could gain access to accounts
      // - We trust Google/GitHub to verify email ownership correctly
      // - For university domains (@unipi.it), risk is lower as emails are controlled
      //
      // This is an acceptable trade-off for most applications, as these providers
      // have better security than most custom implementations.
      if (account?.provider && account.provider !== 'email' && user.email) {
        // SECURITY: Only link accounts if email is verified by the OAuth provider
        const isEmailVerified = (profile as any)?.email_verified;
        
        if (!isEmailVerified) {
          console.log(`⚠️  Email non verificata dal provider ${account.provider} per ${user.email}. Collegamento automatico bloccato.`);
          return true; // Continue with normal flow but don't auto-link
        }
        try {
          const client = await clientPromise;
          const db = client.db();
          
          // Check if a user with this email already exists
          const existingUser = await db.collection('users').findOne({ 
            email: user.email 
          });
          
          if (existingUser) {
            // Check if this OAuth provider is already linked to this user
            const existingAccount = await db.collection('accounts').findOne({
              userId: existingUser._id,
              provider: account.provider
            });
            
            if (!existingAccount) {
              console.log(`🔗 Collegamento automatico: ${account.provider} -> ${user.email}`);
              
              // Link this OAuth account to the existing user
              const newAccount = {
                userId: existingUser._id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              };
              
              await db.collection('accounts').insertOne(newAccount);
              
              // Update user info if needed (e.g., profile image from OAuth)
              const updateFields: any = {};
              if ((profile as any)?.picture && !existingUser.image) {
                updateFields.image = (profile as any).picture;
              }
              if (profile?.name && !existingUser.name) {
                updateFields.name = profile.name;
              }
              
              if (Object.keys(updateFields).length > 0) {
                await db.collection('users').updateOne(
                  { _id: existingUser._id },
                  { $set: updateFields }
                );
              }
              
              // Make sure the user object has the correct ID for the session
              user.id = existingUser._id.toString();
              
              console.log(`✅ Account ${account.provider} collegato con successo all'utente ${user.email}`);
              return true;
            }
          }
        } catch (error) {
          console.error('❌ Errore durante il collegamento automatico dell\'account:', error);
          // Continue with normal flow if there's an error
        }
      }
      
      // Logging login
      try {
        const client = await clientPromise;
        const db = client.db();
        await logAction(db, {
          user_id: user.id ? new ObjectId(user.id) : null,
          action: "login",
          // ip e userAgent non sono disponibili direttamente qui, vanno aggiunti lato API route se servono
          metadata: {
            provider: account?.provider,
            email: user.email,
          },
        });
      } catch (e) {
        console.error("Errore logging login:", e);
      }
      
      return true;
    },
    async jwt({ token, user }) {
      // When user signs in, ensure name is set to email if not already set
      if (user && !user.name && user.email) {
        user.name = user.email;
        token.name = user.email;
      }
      // Add user ID to token when user signs in
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Ensure name is set to email if not already set
      if (session.user && !session.user.name && session.user.email) {
        session.user.name = session.user.email;
      }
      // Add user id to session from token
      if (token?.id && session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      // Logging logout
      try {
        const client = await clientPromise;
        const db = client.db();
        await logAction(db, {
          user_id: (typeof token?.id === "string" && token.id.match(/^[a-f\d]{24}$/i)) ? new ObjectId(token.id) : null,
          action: "logout",
          // ip e userAgent non sono disponibili direttamente qui
          metadata: {
            email: token?.email,
          },
        });
      } catch (e) {
        console.error("Errore logging logout:", e);
      }
    },
    async linkAccount({ user, account, profile }) {
      console.log(`✅ Account ${account.provider} collegato automaticamente all'utente ${user.email}`);
    },
  },
});

export { handler as GET, handler as POST };
