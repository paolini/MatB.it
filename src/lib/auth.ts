import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { genericOAuth, magicLink } from "better-auth/plugins";
import nodemailer from "nodemailer";
import clientPromise from "@/lib/mongodb";

const client = await clientPromise;
const db = client.db();

const wso2Configured = Boolean(
  process.env.WSO2_CLIENT_ID &&
    process.env.WSO2_CLIENT_SECRET,
);

const emailConfigured = Boolean(
  process.env.EMAIL_FROM &&
    (process.env.EMAIL_SERVER_HOST || process.env.RESEND_API_KEY),
);

async function sendMagicLink(email: string, url: string) {
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Accedi a MatBit",
        html: `<p>Hai richiesto di accedere a MatBit.</p><p><a href="${url}">Accedi a MatBit</a></p><p>Se non hai richiesto questo accesso, puoi ignorare questa email.</p>`,
        text: `Hai richiesto di accedere a MatBit. Apri questo link per accedere: ${url}`,
      }),
    });
    if (!response.ok) throw new Error(`Resend failed: ${response.statusText}`);
    return;
  }

  const port = Number(process.env.EMAIL_SERVER_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port,
    secure: port === 465,
    ...(process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD
      ? {
          auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
          },
        }
      : {}),
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Accedi a MatBit",
    html: `<p>Hai richiesto di accedere a MatBit.</p><p><a href="${url}">Accedi a MatBit</a></p><p>Se non hai richiesto questo accesso, puoi ignorare questa email.</p>`,
    text: `Hai richiesto di accedere a MatBit. Apri questo link per accedere: ${url}`,
  });
}

async function getUnipiUserInfo(accessToken: string) {
  const response = await fetch(
    process.env.WSO2_USERINFO_URL ?? "https://iam.unipi.it/oauth2/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    console.error("Impossibile ottenere il profilo WSO2 Unipi", {
      status: response.status,
      statusText: response.statusText,
    });
    return null;
  }

  const profile = await response.json() as Record<string, unknown>;
  const id = profile.sub ?? profile["http://wso2.org/claims/unipiUser"];
  const email = profile.email ?? profile["http://wso2.org/claims/emailaddress"];
  const fullName = profile.name ?? profile["http://wso2.org/claims/fullname"];
  const name = fullName ?? [
    profile.given_name ?? profile["http://wso2.org/claims/givenname"],
    profile.family_name ?? profile["http://wso2.org/claims/lastname"],
  ].filter((value): value is string => typeof value === "string").join(" ");

  if (typeof id !== "string" || typeof email !== "string") {
    console.error("Il profilo WSO2 Unipi non contiene subject o email utilizzabili");
    return null;
  }

  return {
    id,
    email,
    name: typeof name === "string" && name ? name : email,
    emailVerified: true,
  };
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(db, { client }),
  user: {
    modelName: "auth_users",
  },
  session: {
    modelName: "auth_sessions",
  },
  account: {
    modelName: "auth_accounts",
  },
  verification: {
    modelName: "auth_verifications",
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const now = new Date();
          await db.collection("users").updateOne(
            { email: user.email },
            {
              $setOnInsert: {
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified,
                first_login: now,
                last_login: now,
                image: user.image ?? "",
                pro: false,
                createdAt: now,
              },
            },
            { upsert: true },
          );
        },
      },
    },
  },
  socialProviders: {
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          },
        }
      : {}),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            requireEmailVerification: true,
          },
        }
      : {}),
  },
  plugins: [
    ...(wso2Configured
      ? [
        genericOAuth({
          config: [
            {
              providerId: "unipi",
              clientId: process.env.WSO2_CLIENT_ID!,
              clientSecret: process.env.WSO2_CLIENT_SECRET!,
              authorizationUrl: process.env.WSO2_AUTHORIZE_URL ?? "https://iam.unipi.it/oauth2/authorize",
              tokenUrl: process.env.WSO2_TOKEN_URL ?? "https://iam.unipi.it/oauth2/token",
              userInfoUrl: process.env.WSO2_USERINFO_URL ?? "https://iam.unipi.it/oauth2/userinfo",
              endSessionEndpoint: process.env.WSO2_LOGOUT_URL ?? "https://iam.unipi.it/oidc/logout",
              accountIssuer: "https://iam.unipi.it",
              scopes: ["openid", "email", "profile"],
              getUserInfo: async ({ accessToken }) => accessToken ? getUnipiUserInfo(accessToken) : null,
            },
          ],
        }),
      ]
      : []),
    ...(emailConfigured
      ? [
          magicLink({
            sendMagicLink: ({ email, url }) => sendMagicLink(email, url),
          }),
        ]
      : []),
  ],
});