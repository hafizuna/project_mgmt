import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card className={`shadow-card hover:shadow-elegant transition-shadow ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {trend && (
            <span
              className={`font-medium ${
                trend.isPositive ? "text-success" : "text-destructive"
              }`}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
          )}
          <span>{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}