import { useState } from "react";
import { formatCurrency } from "@/lib/payrollUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Pencil, PlusCircle, CheckCircle, Trash2 } from "lucide-react";

export default function CashAdvanceCard({
  record,
  onEdit,
  onPayment,
  onComplete,
  onDelete,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    employee_name,
    position,
    total_amount,
    per_period_deduction,
    present_paid,
    status,
    start_date,
    remarks,
  } = record;

  const total = total_amount || 0;
  const paid = present_paid || 0;
  const balance = total - paid;
  const progress = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

  const periodsLeft =
    per_period_deduction > 0 && balance > 0
      ? Math.ceil(balance / per_period_deduction)
      : 0;
  const monthsLeft = Math.ceil(periodsLeft / 2);

  const statusConfig = {
    active: { variant: "default", label: "Active" },
    completed: { variant: "success", label: "Completed" },
    cancelled: { variant: "secondary", label: "Cancelled" },
  };
  const { variant, label } = statusConfig[status] || statusConfig.active;
  const isCompleted = status === "completed";

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {employee_name}
          </h3>
          <p className="text-xs text-muted-foreground">{position}</p>
        </div>
        <Badge variant={variant}>{label}</Badge>
      </div>

      {/* Start Date */}
      {start_date && (
        <p className="mt-1 text-xs text-muted-foreground">
          Started: {new Date(start_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Total Loan</p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(total)}
          </p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Per Period</p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(per_period_deduction)}
          </p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Paid So Far</p>
          <p className="text-lg font-bold text-green-600">
            {formatCurrency(paid)}
          </p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className="text-lg font-bold text-red-600">
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Periods/Months Left */}
      {!isCompleted && balance > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {periodsLeft} paydays
          </span>
          <span>left (~{monthsLeft} months)</span>
        </div>
      )}
      {isCompleted && (
        <div className="mt-3 text-xs text-green-600 font-medium">
          Fully paid
        </div>
      )}

      {/* Remarks */}
      {remarks && (
        <p className="mt-3 text-xs text-muted-foreground italic border-l-2 border-border pl-3">
          {remarks}
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onEdit(record)}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>

        {!isCompleted && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onPayment(record)}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Payment
          </Button>
        )}

        {!isCompleted && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onComplete(record)}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Complete
          </Button>
        )}

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete(record.id);
                setConfirmDelete(false);
              }}
            >
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
