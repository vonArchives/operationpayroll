import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, Clock, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatCards({ stats }) {
  const cards = [
    {
      label: "Total Employees",
      value: stats.totalEmployees,
      icon: Users,
      color: "text-slate-700",
      accent: "border-l-4 border-slate-400",
    },
    {
      label: "Approved",
      value: stats.approved,
      icon: CheckCircle,
      color: "text-green-600",
      accent: "border-l-4 border-green-500",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
      accent: "border-l-4 border-yellow-500",
    },
    {
      label: "Total Net Payout",
      value: stats.totalNetPayout,
      icon: Wallet,
      color: "text-blue-600",
      accent: "border-l-4 border-blue-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className={cn("overflow-hidden", card.accent)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <Icon className={cn("h-4 w-4", card.color)} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", card.color)}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
