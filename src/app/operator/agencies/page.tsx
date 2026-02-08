import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatJPY } from "@/lib/utils/currency";
import { AGENCY_STATUS_LABELS } from "@/lib/utils/constants";
import { formatDate } from "@/lib/utils/date";
import Link from "next/link";
import { Plus } from "lucide-react";

function getStatusVariant(status: string) {
  switch (status) {
    case "ACTIVE": return "success" as const;
    case "SUSPENDED": return "destructive" as const;
    case "PENDING": return "warning" as const;
    default: return "secondary" as const;
  }
}

export default async function AgenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { code: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [agencies, total] = await Promise.all([
    prisma.agency.findMany({
      where,
      include: {
        balance: true,
        _count: { select: { users: true, salesRecords: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.agency.count({ where }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">代理店管理</h1>
          <p className="text-muted-foreground text-sm mt-1">登録済み代理店の一覧と管理</p>
        </div>
        <Link href="/operator/agencies/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>コード</TableHead>
                  <TableHead>代理店名</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>確定残高</TableHead>
                  <TableHead>売上件数</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell className="font-mono text-sm">{agency.code}</TableCell>
                    <TableCell className="font-medium">{agency.name}</TableCell>
                    <TableCell>{agency.contactName}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(agency.status)}>
                        {AGENCY_STATUS_LABELS[agency.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{formatJPY(Number(agency.balance?.confirmedBalance || 0))}</TableCell>
                    <TableCell>{agency._count.salesRecords}</TableCell>
                    <TableCell>{formatDate(agency.createdAt)}</TableCell>
                    <TableCell>
                      <Link href={`/operator/agencies/${agency.id}`}>
                        <Button variant="ghost" size="sm">詳細</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {agencies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      代理店が登録されていません。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="lg:hidden space-y-3">
            {agencies.map((agency) => (
              <Link key={agency.id} href={`/operator/agencies/${agency.id}`} className="block">
                <div className="rounded-xl border bg-card p-4 space-y-2 active:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{agency.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{agency.code}</p>
                    </div>
                    <Badge variant={getStatusVariant(agency.status)}>
                      {AGENCY_STATUS_LABELS[agency.status]}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground">担当者</p>
                      <p>{agency.contactName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">確定残高</p>
                      <p className="font-semibold">{formatJPY(Number(agency.balance?.confirmedBalance || 0))}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">売上件数</p>
                      <p>{agency._count.salesRecords}件</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">登録日</p>
                      <p>{formatDate(agency.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {agencies.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">代理店が登録されていません。</div>
            )}
          </div>
          {total > pageSize && (
            <div className="mt-4 flex justify-center gap-2">
              {page > 1 && (
                <Link href={`/operator/agencies?page=${page - 1}`}>
                  <Button variant="outline" size="sm">前へ</Button>
                </Link>
              )}
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                {page} / {Math.ceil(total / pageSize)}
              </span>
              {page < Math.ceil(total / pageSize) && (
                <Link href={`/operator/agencies?page=${page + 1}`}>
                  <Button variant="outline" size="sm">次へ</Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
