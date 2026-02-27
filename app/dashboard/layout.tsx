import { SessionRefresh } from "@/components/session-refresh";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SessionRefresh />
      {children}
    </>
  );
}
