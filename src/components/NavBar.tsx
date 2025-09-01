import React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { VERSION } from "../version";
import type { Session } from "next-auth";

export default function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  return (
    <nav className="w-full flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2 shadow-sm">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-bold text-xl text-blue-600">
            MatBit
          </Link>
          <span className="ml-2 text-xs text-gray-500 align-top">v{VERSION}</span>
        </div>
        
        {/* Navigation Links */}
        <div className="flex items-center gap-4">
          <Link 
            href="/notes" 
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === '/notes' || pathname === '/'
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Note
          </Link>
          <Link 
            href="/tests" 
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === '/tests'
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Test
          </Link>
        </div>
      </div>
      <div>
        {session ? <ProfileMenuComponent session={session} /> : <LoginButton />}
      </div>
    </nav>
  );
}

function LoginButton() {
  return (
    <button
      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
      onClick={() => signIn()}
    >
      Login
    </button>
  );
}

function ProfileMenuComponent({ session }: { session: Session }) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center gap-2 focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {session.user?.image ? (
          // Impossibile usare Image di nextjs
          // perché l'immagine sta su un server non noto a priori
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="avatar" width={32} height={32} className="w-8 h-8 rounded-full border" />
        ) : (
          <span className="inline-block w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
            {session.user?.name?.[0] || session.user?.email?.[0] || "U"}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-10">
          <div className="px-4 py-2 text-gray-700 border-b">{session.user?.name || session.user?.email}</div>
          <button
            className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
            onClick={() => signOut()}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
