import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, Clock, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatCards({ stats }) {
  const cards = [
    {
      label: "Total Employees",
      value: stats.totalEmployees,
      icon: Users,
      accentColor: "border-l-4 border-slate-400",
      iconColor: "text-slate-500",
      valueColor: "text-slate-700",
    },
    {
      label: "Approved",
      value: stats.approved,
      icon: CheckCircle,
      accentColor: "border-l-4 border-green-500",
      iconColor: "text-green-500",
      valueColor: "text-green-700",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      accentColor: "border-l-4 border-amber-500",
      iconColor: "text-amber-500",
      valueColor: "text-amber-700",
    },
    {
      label: "Total Net Payout",
      value: stats.totalNetPayout,
      icon: Wallet,
      isHero: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        if (card.isHero) {
          return (
            <Card
              key={card.label}
              className="overflow-hidden bg-[#3C72FC] border-[#3C72FC] text-white"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/80">
                  {card.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {card.value}
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card key={card.label} className={cn("overflow-hidden bg-white", card.accentColor)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <Icon className={cn("h-4 w-4", card.iconColor)} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", card.valueColor)}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
