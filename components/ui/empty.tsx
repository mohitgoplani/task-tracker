import { Card } from "@/components/ui/card";

export function Empty({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <Card className="p-12 text-center">
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 mb-4">{description}</p>}
      {action}
    </Card>
  );
}
