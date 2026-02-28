import { SiteNav } from "@/components/site-nav";
import type { AppPageUser } from "./types";

interface AppNavProps {
  user: AppPageUser | null;
  redirectPath?: string;
  className?: string;
}

export function AppNav({ user, redirectPath = "/apps" }: AppNavProps) {
  return <SiteNav user={user} activePage="apps" redirectPath={redirectPath} />;
}
