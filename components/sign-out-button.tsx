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
      className={className}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        margin: 0,
        color: "inherit",
        font: "inherit",
        fontSize: "0.7rem",
        letterSpacing: "0.2em",
        fontWeight: 700,
        cursor: "pointer",
        transition: "opacity 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.5")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {children || "SIGN OUT"}
    </button>
  );
}
