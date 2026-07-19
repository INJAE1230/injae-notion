import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogForm } from "@/components/logs/log-form";

export default async function NewLogPage({ searchParams }: { searchParams: Promise<{ date?: string; status?: string }> }) {
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">업무 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <LogForm initialDate={params.date} initialStatus={params.status} />
        </CardContent>
      </Card>
    </div>
  );
}
