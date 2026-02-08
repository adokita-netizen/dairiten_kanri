import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/date";
import Link from "next/link";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "作成",
  UPDATE: "更新",
  DELETE: "削除",
  STATUS_CHANGE: "ステータス変更",
  LOGIN: "ログイン",
  EXPORT: "エクスポート",
  CALCULATE: "計算",
  IMPORT: "取込",
  PAYOUT: "支払",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; entityType?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 30;

  const where: Record<string, unknown> = {};
  if (params.action) where.action = params.action;
  if (params.entityType) where.entityType = params.entityType;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">監査ログ</h1>
        <p className="text-muted-foreground text-sm mt-1">システムの操作履歴を確認できます</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>ユーザー</TableHead>
                <TableHead>アクション</TableHead>
                <TableHead>対象</TableHead>
                <TableHead>対象ID</TableHead>
                <TableHead>変更内容</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell>{log.user?.name || log.user?.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ACTION_LABELS[log.action] || log.action}</Badge>
                  </TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell className="font-mono text-xs">{log.entityId || "-"}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {log.changes ? JSON.stringify(log.changes) : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    監査ログがありません。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {total > pageSize && (
            <div className="mt-4 flex justify-center gap-2">
              {page > 1 && (
                <Link href={`/operator/audit-log?page=${page - 1}`}>
                  <Button variant="outline" size="sm">前へ</Button>
                </Link>
              )}
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                {page} / {Math.ceil(total / pageSize)}
              </span>
              {page < Math.ceil(total / pageSize) && (
                <Link href={`/operator/audit-log?page=${page + 1}`}>
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
