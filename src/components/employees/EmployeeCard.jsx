import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { Eye, Pencil } from "lucide-react";

const ROLE_BADGES = {
  admin: { label: "Admin", variant: "default" },
  moderator: { label: "Moderator", variant: "secondary" },
  employee: { label: "Employee", variant: "outline" },
};

function roleBadge(role) {
  const config = ROLE_BADGES[role] || ROLE_BADGES.employee;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function EmployeeCard({
  employee,
  onOpenPayslip,
  canViewPayslip,
  onEditEmployee,
  canEditEmployee,
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="text-xs">
          {getInitials(employee.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-medium truncate">{employee.name}</p>
        <p className="text-sm text-muted-foreground truncate">{employee.position}</p>
        {roleBadge(employee.role)}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canViewPayslip && (
          <Button variant="ghost" size="icon" onClick={() => onOpenPayslip(employee)} aria-label={`View payslip for ${employee.name}`} title="View payslip">
            <Eye className="h-4 w-4" />
          </Button>
        )}
        {canEditEmployee && (
          <Button variant="ghost" size="icon" onClick={() => onEditEmployee(employee)} aria-label={`Edit ${employee.name}`} title="Edit employee">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
