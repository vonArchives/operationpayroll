import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/payrollUtils";

const newSchema = z.object({
  emp_id: z.string().min(1, "Select an employee"),
  total_amount: z.coerce.number().min(1, "Must be at least 1"),
  per_period_deduction: z.coerce.number().min(1, "Must be at least 1"),
  start_date: z.string().optional(),
  remarks: z.string().optional(),
});

const editSchema = z.object({
  total_amount: z.coerce.number().min(1, "Must be at least 1"),
  per_period_deduction: z.coerce.number().min(1, "Must be at least 1"),
  present_paid: z.coerce.number().min(0),
  status: z.enum(["active", "completed", "cancelled"]),
  start_date: z.string().optional(),
  remarks: z.string().optional(),
});

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, "Must be at least 1"),
});

export default function CashAdvanceModal({
  open,
  onClose,
  mode,
  record,
  employees,
  onSubmit,
  loading,
}) {
  const [schema, setSchema] = useState(newSchema);

  useEffect(() => {
    if (mode === "new") setSchema(newSchema);
    else if (mode === "edit") setSchema(editSchema);
    else if (mode === "payment") setSchema(paymentSchema);
  }, [mode]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(mode, record),
    mode: "onChange",
  });

  useEffect(() => {
    reset(getDefaultValues(mode, record));
  }, [mode, record, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  const title =
    mode === "new"
      ? "New Cash Advance"
      : mode === "edit"
      ? "Edit Cash Advance"
      : "Record Payment";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Employee Select (new only) */}
          {mode === "new" && (
            <div className="space-y-2">
              <Label htmlFor="emp_id">Employee</Label>
              <select
                id="emp_id"
                {...register("emp_id")}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="">Select employee...</option>
                {employees.map((emp) => (
                  <option key={emp.emp_id} value={emp.emp_id}>
                    {emp.last_name}, {emp.first_name} — {emp.position}
                  </option>
                ))}
              </select>
              {errors.emp_id && (
                <p className="text-xs text-destructive">{errors.emp_id.message}</p>
              )}
            </div>
          )}

          {/* Total Amount */}
          {(mode === "new" || mode === "edit") && (
            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Loan Amount</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                {...register("total_amount")}
              />
              {errors.total_amount && (
                <p className="text-xs text-destructive">
                  {errors.total_amount.message}
                </p>
              )}
            </div>
          )}

          {/* Per Period Deduction */}
          {(mode === "new" || mode === "edit") && (
            <div className="space-y-2">
              <Label htmlFor="per_period_deduction">Per Period Deduction</Label>
              <Input
                id="per_period_deduction"
                type="number"
                step="0.01"
                {...register("per_period_deduction")}
              />
              {errors.per_period_deduction && (
                <p className="text-xs text-destructive">
                  {errors.per_period_deduction.message}
                </p>
              )}
            </div>
          )}

          {/* Present Paid (edit only) */}
          {mode === "edit" && (
            <div className="space-y-2">
              <Label htmlFor="present_paid">Present Paid</Label>
              <Input
                id="present_paid"
                type="number"
                step="0.01"
                {...register("present_paid")}
              />
              {errors.present_paid && (
                <p className="text-xs text-destructive">
                  {errors.present_paid.message}
                </p>
              )}
            </div>
          )}

          {/* Status (edit only) */}
          {mode === "edit" && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                {...register("status")}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}

          {/* Payment Amount */}
          {mode === "payment" && (
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
              {record && (
                <p className="text-xs text-muted-foreground">
                  Balance: {formatCurrency(record.total_amount - record.present_paid)}
                </p>
              )}
            </div>
          )}

          {/* Start Date */}
          {(mode === "new" || mode === "edit") && (
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input id="start_date" type="date" {...register("start_date")} />
            </div>
          )}

          {/* Remarks */}
          {(mode === "new" || mode === "edit") && (
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input id="remarks" type="text" {...register("remarks")} />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getDefaultValues(mode, record) {
  if (mode === "edit" && record) {
    return {
      total_amount: record.total_amount,
      per_period_deduction: record.per_period_deduction,
      present_paid: record.present_paid,
      status: record.status,
      start_date: record.start_date || "",
      remarks: record.remarks || "",
    };
  }
  if (mode === "payment") {
    return { amount: "" };
  }
  return {
    emp_id: "",
    total_amount: "",
    per_period_deduction: "",
    start_date: "",
    remarks: "",
  };
}
