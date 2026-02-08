import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || session.user.role !== "OPERATOR") {
    redirect("/login");
  }

  return (
    <AppShell role="OPERATOR" userName={session.user.name}>
      {children}
    </AppShell>
  );
}
