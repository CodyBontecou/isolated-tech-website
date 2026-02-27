"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface SignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
      },
    });
  };

  return (
    <button
      onClick={handleSignOut}
      className={`nav__sign-out ${className || ""}`}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.5")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {children || "SIGN OUT"}
    </button>
  );
}
