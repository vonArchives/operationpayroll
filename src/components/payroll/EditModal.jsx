import { useEffect, useMemo, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePayroll } from "@/hooks/usePayroll";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { computePayroll, formatCurrency } from "@/lib/payrollUtils";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const schema = z.object({
  monthly_pay: z.coerce.number().min(0, "Cannot be negative"),
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
  commission_remarks: z.string().optional(),
  holiday_remarks: z.string().optional(),
  snwh_remarks: z.string().optional(),
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

function ReadOnlyInput({ id, value, type = "number" }) {
  return (
    <Input
      id={id}
      type={type}
      value={value ?? ""}
      disabled
      className="bg-muted cursor-not-allowed"
    />
  );
}

export default function EditModal({ employee, open, onClose }) {
  const { editPayroll, payrollSent_period1, payrollSent_period2, currentPeriod, mutationLoading } = usePayroll();
  const perms = useRolePermissions();
  const isMobile = useIsMobile();

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

  // Auto-compute Daily Rate, Holiday, and SNWH Pay
  // Auto-compute Daily Rate, Holiday, SNWH Pay, and PhilHealth
  const hasComputedRef = useRef(false);
  const prevMPayRef = useRef(null); // <-- NEW: Tracks salary changes for PhilHealth

  useEffect(() => {
    // Skip the first run to preserve existing DB values on modal open
    if (!hasComputedRef.current) {
      hasComputedRef.current = true;
      // Initialize the ref with the starting monthly pay so it doesn't trigger on first open
      prevMPayRef.current = Number(watched.monthly_pay) || 0;
      return;
    }

    const mPay = Number(watched.monthly_pay) || 0;
    const wDays = Number(watched.work_days) || 0;
    let currentDailyPay = Number(watched.daily_pay) || 0;

    // --- NEW: Auto-compute PhilHealth ONLY when Monthly Pay changes ---
    if (prevMPayRef.current !== mPay) {
      const autoPhilHealth = mPay > 0 ? Number((((mPay / 2) * 0.05) / 2).toFixed(2)) : 0;
      setValue("philhealth", autoPhilHealth, { shouldValidate: true });
      prevMPayRef.current = mPay; // Save the new salary state
    }
    // ------------------------------------------------------------------

    // 1. Auto-compute Daily Pay based on Monthly Pay (Fixed 26 Days)
    if (mPay > 0) {
      const calculatedDaily = Number((mPay / 26).toFixed(2));
      if (calculatedDaily !== currentDailyPay) {
        setValue("daily_pay", calculatedDaily, { shouldValidate: true });
        currentDailyPay = calculatedDaily; // Update local variable for next steps
      }
    } else if (mPay === 0 && currentDailyPay !== 0) {
      setValue("daily_pay", 0, { shouldValidate: true });
      currentDailyPay = 0;
    }

    // 2. Auto-compute default holiday/SNWH RATES when days are added
    const holidayDays = Number(watched.holiday_days) || 0;
    const snwhDays = Number(watched.snwh_days) || 0;
    const currentHolidayPay = Number(getValues("holiday_pay")) || 0;
    const currentSnwhPay = Number(getValues("snwh_pay")) || 0;

    // Only auto-fill the standard rate if they entered days AND the pay rate is currently 0.
    if (holidayDays > 0 && currentHolidayPay === 0) {
      setValue("holiday_pay", Number(currentDailyPay.toFixed(2)), { shouldValidate: true });
    }
    
    if (snwhDays > 0 && currentSnwhPay === 0) {
      setValue("snwh_pay", Number((currentDailyPay * 0.30).toFixed(2)), { shouldValidate: true });
    }
    
  }, [
    watched.monthly_pay, 
    watched.work_days, 
    watched.daily_pay, 
    watched.holiday_days, 
    watched.snwh_days, 
    setValue, 
    getValues
  ]);

  const live = useMemo(() => computePayroll(watched), [watched]);

  const onSubmit = async (data) => {
    const success = await editPayroll(employee.id, data, perms.user?.name, currentPeriod);
    if (success) onClose();
  };

  // Helper to render a form field
  const renderField = (key, label, type = "number", fullWidth = false) => (
    <div key={key} className={cn("space-y-1.5", fullWidth && "col-span-full")}>
      <Label htmlFor={key} className={cn(fullWidth && "text-xs text-muted-foreground")}>{label}</Label>
      {perms.canEditField(key) ? (
        <Input
          id={key}
          type={type}
          step={type === "number" ? "0.01" : undefined}
          {...register(key)}
          className={cn(errors[key] && "border-danger")}
        />
      ) : (
        <ReadOnlyInput id={key} value={employee?.[payrollKey]?.[key]} type={type} />
      )}
      {errors[key] && (
        <p className="text-xs text-danger">{errors[key].message}</p>
      )}
    </div>
  );

  return isMobile ? (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl p-0">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Edit Payroll — {employee?.name} ({periodLabel})</SheetTitle>
        </SheetHeader>

        {perms.editModalNote && (
          <p className="px-6 text-sm text-muted-foreground">
            {perms.editModalNote}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6 px-6 pb-6">
            {/* Left: form fields */}
            <ScrollArea className="flex-1 max-h-[70vh]">
              <div className="space-y-6 pr-4">
                {/* Basic Pay */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700">
                    Basic Pay
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    
                    {perms.canViewMonthlyPay && (
                      <div className="space-y-2">
                        <Label htmlFor="monthly_pay">Monthly Pay</Label>
                        {perms.canEditField("monthly_pay") ? (
                          <Input
                            id="monthly_pay"
                            type="number"
                            step="0.01"
                            {...register("monthly_pay")}
                            className={cn(errors.monthly_pay && "border-danger")}
                          />
                        ) : (
                          <ReadOnlyInput id="monthly_pay" value={employee?.[payrollKey]?.monthly_pay} />
                        )}
                        {errors.monthly_pay && (
                          <p className="text-xs text-danger">{errors.monthly_pay.message}</p>
                        )}
                      </div>
                    )}

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

                    {/* Daily Rate is now strictly Read-Only and Auto-Calculated */}
                    {perms.canViewDailyRate && (
                      <div className="space-y-2">
                        <Label htmlFor="daily_pay" className="text-muted-foreground">Daily Rate (Auto)</Label>
                        <Input
                          id="daily_pay"
                          type="number"
                          step="0.01"
                          {...register("daily_pay")}
                          readOnly
                          tabIndex={-1}
                          className="bg-muted cursor-not-allowed focus-visible:ring-0"
                        />
                      </div>
                    )}

                  </div>
                </div>

                <Separator />

                {/* Earnings */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-green-700">
                    Earnings
                  </h3>
                  <div className="space-y-3">
                    {/* Holiday Group */}
                    <div className="rounded-lg border border-green-100 bg-green-50/40 p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        {renderField("holiday_days", "Holiday Days", "number")}
                        {renderField("holiday_pay", "Holiday Pay", "number")}
                      </div>
                      {renderField("holiday_remarks", "Holiday Remarks", "text", true)}
                    </div>

                    {/* SNWH Group */}
                    <div className="rounded-lg border border-green-100 bg-green-50/40 p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        {renderField("snwh_days", "SNWH Days", "number")}
                        {renderField("snwh_pay", "SNWH Pay", "number")}
                      </div>
                      {renderField("snwh_remarks", "SNWH Remarks", "text", true)}
                    </div>

                    {/* Commission Group */}
                    <div className="rounded-lg border border-green-100 bg-green-50/40 p-3 space-y-2">
                      {renderField("commission", "Commission", "number")}
                      {renderField("commission_remarks", "Commission Remarks", "text", true)}
                    </div>

                    {/* Other Allowances */}
                    <div className="grid grid-cols-2 gap-3">
                      {renderField("wellness_allowance", "Wellness", "number")}
                      {renderField("communication_allowance", "Communication", "number")}
                      {renderField("birthday_allowance", "Birthday", "number")}
                      {renderField("allowance", "Allowance", "number")}
                      {renderField("bonuses", "Bonuses", "number")}
                      {renderField("thirteenth_month_pay", "13th Month", "number")}
                    </div>
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
            <div className="w-full shrink-0 lg:w-80">
              <div className="sticky top-0 rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="mb-6 text-base font-semibold uppercase tracking-wide text-muted-foreground">
                  Live Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">Basic Pay</span>
                    <span className="font-medium">{formatCurrency(live.total_basic_pay)}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">Earnings</span>
                    <span className="font-medium">{formatCurrency(live.total_earnings)}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">Deductions</span>
                    <span className="font-medium">{formatCurrency(live.total_deductions)}</span>
                  </div>
                  <Separator />
                  <div className="rounded-lg bg-primary/5 p-4 text-center">
                    <p className="text-sm font-medium uppercase tracking-wide text-primary">
                      Net Pay
                    </p>
                    <p className="mt-1 text-3xl font-bold text-primary">
                      {formatCurrency(live.net_pay)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="px-6 pb-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || payrollSent || mutationLoading}>
              {perms.editButtonText}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  ) : (
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
                  <div className="grid grid-cols-3 gap-4">
                    
                    {perms.canViewMonthlyPay && (
                      <div className="space-y-2">
                        <Label htmlFor="monthly_pay">Monthly Pay</Label>
                        {perms.canEditField("monthly_pay") ? (
                          <Input
                            id="monthly_pay"
                            type="number"
                            step="0.01"
                            {...register("monthly_pay")}
                            className={cn(errors.monthly_pay && "border-danger")}
                          />
                        ) : (
                          <ReadOnlyInput id="monthly_pay" value={employee?.[payrollKey]?.monthly_pay} />
                        )}
                        {errors.monthly_pay && (
                          <p className="text-xs text-danger">{errors.monthly_pay.message}</p>
                        )}
                      </div>
                    )}

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

                    {/* Daily Rate is now strictly Read-Only and Auto-Calculated */}
                    {perms.canViewDailyRate && (
                      <div className="space-y-2">
                        <Label htmlFor="daily_pay" className="text-muted-foreground">Daily Rate (Auto)</Label>
                        <Input
                          id="daily_pay"
                          type="number"
                          step="0.01"
                          {...register("daily_pay")}
                          readOnly
                          tabIndex={-1}
                          className="bg-muted cursor-not-allowed focus-visible:ring-0"
                        />
                      </div>
                    )}

                  </div>
                </div>

                <Separator />

                {/* Earnings */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-green-700">
                    Earnings
                  </h3>
                  <div className="space-y-3">
                    {/* Holiday Group */}
                    <div className="rounded-lg border border-green-100 bg-green-50/40 p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        {renderField("holiday_days", "Holiday Days", "number")}
                        {renderField("holiday_pay", "Holiday Pay", "number")}
                      </div>
                      {renderField("holiday_remarks", "Holiday Remarks", "text", true)}
                    </div>

                    {/* SNWH Group */}
                    <div className="rounded-lg border border-green-100 bg-green-50/40 p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        {renderField("snwh_days", "SNWH Days", "number")}
                        {renderField("snwh_pay", "SNWH Pay", "number")}
                      </div>
                      {renderField("snwh_remarks", "SNWH Remarks", "text", true)}
                    </div>

                    {/* Commission Group */}
                    <div className="rounded-lg border border-green-100 bg-green-50/40 p-3 space-y-2">
                      {renderField("commission", "Commission", "number")}
                      {renderField("commission_remarks", "Commission Remarks", "text", true)}
                    </div>

                    {/* Other Allowances */}
                    <div className="grid grid-cols-2 gap-3">
                      {renderField("wellness_allowance", "Wellness", "number")}
                      {renderField("communication_allowance", "Communication", "number")}
                      {renderField("birthday_allowance", "Birthday", "number")}
                      {renderField("allowance", "Allowance", "number")}
                      {renderField("bonuses", "Bonuses", "number")}
                      {renderField("thirteenth_month_pay", "13th Month", "number")}
                    </div>
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
            <div className="w-full shrink-0 lg:w-80">
              <div className="sticky top-0 rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="mb-6 text-base font-semibold uppercase tracking-wide text-muted-foreground">
                  Live Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">Basic Pay</span>
                    <span className="font-medium">{formatCurrency(live.total_basic_pay)}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">Earnings</span>
                    <span className="font-medium">{formatCurrency(live.total_earnings)}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">Deductions</span>
                    <span className="font-medium">{formatCurrency(live.total_deductions)}</span>
                  </div>
                  <Separator />
                  <div className="rounded-lg bg-primary/5 p-4 text-center">
                    <p className="text-sm font-medium uppercase tracking-wide text-primary">
                      Net Pay
                    </p>
                    <p className="mt-1 text-3xl font-bold text-primary">
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
