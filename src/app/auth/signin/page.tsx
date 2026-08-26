import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SignInForm from "@/components/SignInForm";
import { auth } from "@/lib/auth";

type Props = {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  // Redirect if already signed in
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Accedi a MatBit
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            La piattaforma collaborativa per note matematiche
          </p>
        </div>
        
        {/* Error Display */}
        {resolvedSearchParams.error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Errore di accesso
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {resolvedSearchParams.error === 'OAuthAccountNotLinked' ? (
                    <p>
                      Esiste già un account con questa email. Prova ad accedere con il metodo 
                      che hai usato la prima volta (email, GitHub, ecc.) oppure contatta 
                      l&apos;amministratore per collegare gli account.
                    </p>
                  ) : resolvedSearchParams.error === 'OAuthSignin' ? (
                    <p>
                      Errore durante l&apos;accesso con il provider OAuth. 
                      Riprova o usa un metodo diverso.
                    </p>
                  ) : resolvedSearchParams.error === 'OAuthCallback' ? (
                    <p>
                      Errore durante la verifica dell&apos;accesso. 
                      Riprova o usa un metodo diverso.
                    </p>
                  ) : resolvedSearchParams.error === 'EmailSignin' ? (
                    <p>
                      Impossibile inviare l&apos;email di accesso. 
                      Verifica che l&apos;indirizzo sia corretto.
                    </p>
                  ) : resolvedSearchParams.error === 'CredentialsSignin' ? (
                    <p>
                      Credenziali non valide. Verifica email e password.
                    </p>
                  ) : (
                    <p>
                      Si è verificato un errore durante l&apos;accesso: {resolvedSearchParams.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <SignInForm
          callbackUrl={resolvedSearchParams.callbackUrl}
          providers={{
            email: Boolean(
              process.env.EMAIL_FROM &&
                (process.env.EMAIL_SERVER_HOST || process.env.RESEND_API_KEY),
            ),
            github: Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET),
            google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
            unipi: Boolean(
              process.env.WSO2_CLIENT_ID &&
                process.env.WSO2_CLIENT_SECRET &&
                process.env.WSO2_DISCOVERY_URL,
            ),
          }}
        />
      </div>
    </div>
  );
}
