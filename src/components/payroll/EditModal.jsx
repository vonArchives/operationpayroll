import { useEffect, useMemo, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePayroll } from "@/hooks/usePayroll";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { computePayroll, formatCurrency } from "@/lib/payrollUtils";
import { cn } from "@/lib/utils";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const schema = z.object({
  daily_pay: z.coerce.number().min(0, "Cannot be negative"),
  work_days: z.coerce.number().int().min(0, "Cannot be negative").max(31, "Max 31 days"),
  holiday_days: z.coerce.number().min(0),
  holiday_pay: z.coerce.number().min(0),
  snwh_days: z.coerce.number().min(0),
  snwh_pay: z.coerce.number().min(0),
  wellness_allowance: z.coerce.number().min(0),
  communication_allowance: z.coerce.number().min(0),
  birthday_allowance: z.coerce.number().min(0),
  commission: z.coerce.number().min(0),
  // commission_remarks: z.string().optional(),
  // holiday_remarks: z.string().optional(),
  // snwh_remarks: z.string().optional(),
  allowance: z.coerce.number().min(0),
  bonuses: z.coerce.number().min(0),
  thirteenth_month_pay: z.coerce.number().min(0),
  cash_advance: z.coerce.number().min(0),
  sss: z.coerce.number().min(0),
  philhealth: z.coerce.number().min(0),
  pagibig: z.coerce.number().min(0),
  hmo: z.coerce.number().min(0),
  others: z.coerce.number().min(0),
});

function ReadOnlyInput({ id, value }) {
  return (
    <Input
      id={id}
      type="number"
      value={value ?? ""}
      disabled
      className="bg-muted cursor-not-allowed"
    />
  );
}

export default function EditModal({ employee, open, onClose }) {
  const { editPayroll, payrollSent_period1, payrollSent_period2, currentPeriod, mutationLoading } = usePayroll();
  const perms = useRolePermissions();

  const payrollKey = `payroll_${currentPeriod}`;
  const payrollSent = currentPeriod === "period2" ? payrollSent_period2 : payrollSent_period1;
  const periodLabel = currentPeriod === "period2" ? "Period 2" : "Period 1";

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: employee?.[`payroll_${currentPeriod}`] || employee?.payroll || {},
    mode: "onChange",
  });

  const watched = useWatch({ control });

  // Auto-compute default holiday/SNWH RATES (not totals) when days are added
  const hasComputedRef = useRef(false);
  useEffect(() => {
    // Skip the first run to preserve existing DB values on modal open
    if (!hasComputedRef.current) {
      hasComputedRef.current = true;
      return;
    }

    const dailyPay = Number(watched.daily_pay) || 0;
    const holidayDays = Number(watched.holiday_days) || 0;
    const snwhDays = Number(watched.snwh_days) || 0;

    // Grab the current input values without triggering infinite re-renders
    const currentHolidayPay = Number(getValues("holiday_pay")) || 0;
    const currentSnwhPay = Number(getValues("snwh_pay")) || 0;

    // Only auto-fill the standard rate if they entered days AND the pay rate is currently 0.
    if (holidayDays > 0 && currentHolidayPay === 0) {
      setValue("holiday_pay", Number(dailyPay.toFixed(2)), { shouldValidate: true });
    }
    
    if (snwhDays > 0 && currentSnwhPay === 0) {
      setValue("snwh_pay", Number((dailyPay * 0.30).toFixed(2)), { shouldValidate: true });
    }
    
  }, [watched.daily_pay, watched.holiday_days, watched.snwh_days, setValue, getValues]);

  const live = useMemo(() => computePayroll(watched), [watched]);

  const onSubmit = async (data) => {
    const success = await editPayroll(employee.id, data, perms.user?.name, currentPeriod);
    if (success) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[95vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Edit Payroll — {employee?.name} ({periodLabel})</DialogTitle>
        </DialogHeader>

        {perms.editModalNote && (
          <p className="px-6 text-sm text-muted-foreground">
            {perms.editModalNote}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6 px-6 pb-6 lg:flex-row">
            {/* Left: form fields */}
            <ScrollArea className="flex-1 max-h-[70vh]">
              <div className="space-y-6 pr-4">
                {/* Basic Pay */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700">
                    Basic Pay
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="daily_pay">Daily Pay</Label>
                        {perms.canEditField("daily_pay") ? (
                        <Input
                          id="daily_pay"
                          type="number"
                          step="0.01"
                          {...register("daily_pay")}
                          className={cn(errors.daily_pay && "border-danger")}
                        />
                      ) : (
                        <ReadOnlyInput id="daily_pay" value={employee?.[payrollKey]?.daily_pay} />
                      )}
                      {errors.daily_pay && (
                        <p className="text-xs text-danger">{errors.daily_pay.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="work_days">Work Days</Label>
                        {perms.canEditField("work_days") ? (
                        <Input
                          id="work_days"
                          type="number"
                          {...register("work_days")}
                          className={cn(errors.work_days && "border-danger")}
                        />
                      ) : (
                        <ReadOnlyInput id="work_days" value={employee?.[payrollKey]?.work_days} />
                      )}
                      {errors.work_days && (
                        <p className="text-xs text-danger">{errors.work_days.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Earnings */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-green-700">
                    Earnings
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "holiday_days", label: "Holiday Days", type: "number" },
                      { key: "holiday_pay", label: "Holiday Pay", type: "number" },
                      { key: "snwh_days", label: "SNWH Days", type: "number" },
                      { key: "snwh_pay", label: "SNWH Pay", type: "number" },
                      { key: "wellness_allowance", label: "Wellness", type: "number" },
                      { key: "communication_allowance", label: "Communication", type: "number" },
                      { key: "birthday_allowance", label: "Birthday", type: "number" },
                      { key: "commission", label: "Commission", type: "number" },
                      { key: "commission_remarks", label: "Commission Remarks", type: "text" },
                      { key: "allowance", label: "Allowance", type: "number" },
                      { key: "bonuses", label: "Bonuses", type: "number" },
                      { key: "thirteenth_month_pay", label: "13th Month", type: "number" },
                      { key: "holiday_remarks", label: "Holiday Remarks", type: "text" },
                      { key: "snwh_remarks", label: "SNWH Remarks", type: "text" },
                    ].map(({ key, label, type = "number" }) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key}>{label}</Label>
                        {perms.canEditField(key) ? (
                          <Input
                            id={key}
                            type={type}
                            step={type === "number" ? "0.01" : undefined}
                            {...register(key)}
                            className={cn(errors[key] && "border-danger")}
                          />
                        ) : (
                          <ReadOnlyInput id={key} value={employee?.[payrollKey]?.[key]} />
                        )}
                        {errors[key] && (
                          <p className="text-xs text-danger">{errors[key].message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Deductions */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-700">
                    Deductions
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "cash_advance", label: "Cash Advance" },
                      { key: "sss", label: "SSS" },
                      { key: "philhealth", label: "PhilHealth" },
                      { key: "pagibig", label: "Pag-IBIG" },
                      { key: "hmo", label: "HMO" },
                      { key: "others", label: "Others" },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key}>{label}</Label>
                        {perms.canEditField(key) ? (
                          <Input
                            id={key}
                            type="number"
                            step="0.01"
                            {...register(key)}
                            className={cn(errors[key] && "border-danger")}
                          />
                        ) : (
                          <ReadOnlyInput id={key} value={employee?.[payrollKey]?.[key]} />
                        )}
                        {errors[key] && (
                          <p className="text-xs text-danger">{errors[key].message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Right: live summary */}
            <div className="w-full shrink-0 lg:w-64">
              <div className="sticky top-0 rounded-xl border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Live Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Basic Pay</span>
                    <span className="font-medium">{formatCurrency(live.total_basic_pay)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Earnings</span>
                    <span className="font-medium">{formatCurrency(live.total_earnings)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deductions</span>
                    <span className="font-medium">{formatCurrency(live.total_deductions)}</span>
                  </div>
                  <Separator />
                  <div className="rounded-lg bg-primary/5 p-3 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">
                      Net Pay
                    </p>
                    <p className="mt-1 text-2xl font-bold text-primary">
                      {formatCurrency(live.net_pay)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || payrollSent || mutationLoading}>
              {perms.editButtonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
