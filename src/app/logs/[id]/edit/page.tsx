import { notFound } from "next/navigation";
import { getWorkLog } from "@/lib/notion-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogForm } from "@/components/logs/log-form";

export const dynamic = "force-dynamic";

export default async function EditLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let log;
  try {
    log = await getWorkLog(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>업무 수정</CardTitle>
        </CardHeader>
        <CardContent>
          <LogForm log={log} />
        </CardContent>
      </Card>
    </div>
  );
}
