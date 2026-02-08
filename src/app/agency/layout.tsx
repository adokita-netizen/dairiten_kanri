import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || session.user.role !== "AGENCY" || !session.user.agencyId) {
    redirect("/login");
  }

  const agency = await prisma.agency.findUnique({
    where: { id: session.user.agencyId },
    select: { name: true },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar role="AGENCY" />
      <div className="flex-1 pl-60">
        <Header userName={session.user.name} role="AGENCY" agencyName={agency?.name} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
