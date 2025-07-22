import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import SignInForm from "@/components/SignInForm";

export default async function SignInPage() {
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
        <SignInForm />
      </div>
    </div>
  );
}
