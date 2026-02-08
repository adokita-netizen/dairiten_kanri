import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || session.user.role !== "OPERATOR") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="OPERATOR" />
      <div className="flex-1 pl-60">
        <Header userName={session.user.name} role="OPERATOR" />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
