import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import SignInForm from "@/components/SignInForm";

type Props = {
  searchParams: { error?: string; callbackUrl?: string };
};

export default async function SignInPage({ searchParams }: Props) {
  // Redirect if already signed in
  const session = await getServerSession();
  if (session) {
    redirect("/");
  }

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
        {searchParams.error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Errore di accesso
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {searchParams.error === 'OAuthAccountNotLinked' ? (
                    <p>
                      Esiste già un account con questa email. Prova ad accedere con il metodo 
                      che hai usato la prima volta (email, GitHub, ecc.) oppure contatta 
                      l&apos;amministratore per collegare gli account.
                    </p>
                  ) : searchParams.error === 'OAuthSignin' ? (
                    <p>
                      Errore durante l&apos;accesso con il provider OAuth. 
                      Riprova o usa un metodo diverso.
                    </p>
                  ) : searchParams.error === 'OAuthCallback' ? (
                    <p>
                      Errore durante la verifica dell&apos;accesso. 
                      Riprova o usa un metodo diverso.
                    </p>
                  ) : searchParams.error === 'EmailSignin' ? (
                    <p>
                      Impossibile inviare l&apos;email di accesso. 
                      Verifica che l&apos;indirizzo sia corretto.
                    </p>
                  ) : searchParams.error === 'CredentialsSignin' ? (
                    <p>
                      Credenziali non valide. Verifica email e password.
                    </p>
                  ) : (
                    <p>
                      Si è verificato un errore durante l&apos;accesso: {searchParams.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <SignInForm />
      </div>
    </div>
  );
}
