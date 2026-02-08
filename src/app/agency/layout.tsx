import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";

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
    <AppShell role="AGENCY" userName={session.user.name} agencyName={agency?.name}>
      {children}
    </AppShell>
  );
}
