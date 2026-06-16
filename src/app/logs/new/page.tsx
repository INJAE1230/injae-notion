import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogForm } from "@/components/logs/log-form";

export default function NewLogPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>업무 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <LogForm />
        </CardContent>
      </Card>
    </div>
  );
}
