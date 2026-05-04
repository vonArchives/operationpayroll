import { useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { computePayroll } from "@/lib/payrollUtils";
import { toast } from "sonner";

export function usePayrollMutations(dispatch, employees, setMutationLoading) {
  const editPayroll = useCallback(
    async (id, updatedFields, performedBy, period = "period1") => {
      setMutationLoading(true);
      try {
        const emp = employees.find((e) => e.id === id);
        const pr_period_id = emp?.[`pr_period_id_${period}`];
        if (!pr_period_id) {
          toast.error("Could not find payroll record");
          return false;
        }

        const basicpayMap = {
          daily_pay: "daily_pay",
          work_days: "work_days",
          monthly_pay: "monthly_pay",
        };
        const additionsMap = {
          holiday_pay: "holiday_pay",
          snwh_pay: "snwh_pay",
          wellness_allowance: "wellness_alw",
          communication_allowance: "comms_alw",
          birthday_allowance: "birthday_alw",
          commission: "commission",
          allowance: "allowance",
          bonuses: "bonus",
          thirteenth_month_pay: "thirteenth_mp",
        };
        const deductionsMap = {
          cash_advance: "cash_advance",
          sss: "sss",
          philhealth: "phil_health",
          pagibig: "pag_ibig",
          hmo: "hmo",
          others: "others",
        };

        const basicpayFields = {};
        const additionsFields = {};
        const deductionsFields = {};

        Object.entries(updatedFields).forEach(([key, val]) => {
          if (basicpayMap[key]) basicpayFields[basicpayMap[key]] = val;
          else if (additionsMap[key]) additionsFields[additionsMap[key]] = val;
          else if (deductionsMap[key]) deductionsFields[deductionsMap[key]] = val;
        });

        // 1. Sanitize inputs: Convert empty strings to 0 so PostgreSQL numeric columns don't crash
        const sanitizeForDB = (fields) => {
          const sanitized = {};
          Object.entries(fields).forEach(([k, v]) => {
            sanitized[k] = v === "" || Number.isNaN(Number(v)) ? 0 : Number(v);
          });
          return sanitized;
        };

        const safeBasic = sanitizeForDB(basicpayFields);
        const safeAdds = sanitizeForDB(additionsFields);
        const safeDeducts = sanitizeForDB(deductionsFields);

        // 2. Use .upsert() so it creates missing child rows for older data, while updating existing ones
        const updates = [];
        if (Object.keys(safeBasic).length > 0)
          updates.push(
            supabase.from("payroll_basicpay")
              .upsert({ ...safeBasic, pr_period_id }, { onConflict: "pr_period_id" })
          );

        if (Object.keys(safeAdds).length > 0)
          updates.push(
            supabase.from("payroll_additions")
              .upsert({ ...safeAdds, pr_period_id }, { onConflict: "pr_period_id" })
          );

        if (Object.keys(safeDeducts).length > 0)
          updates.push(
            supabase.from("payroll_deductions")
              .upsert({ ...safeDeducts, pr_period_id }, { onConflict: "pr_period_id" })
          );

        const changes = {};
        Object.entries(updatedFields).forEach(([key, val]) => {
          const oldVal = emp[`payroll_${period}`]?.[key];
          if (oldVal !== val) changes[key] = { from: oldVal, to: val };
        });

        const results = await Promise.all(updates);
        const errors = results.filter((r) => r.error);
        if (errors.length > 0) {
          toast.error("Failed to save: " + errors.map((e) => e.error.message).join(", "));
          return false;
        }

        const currentPayroll = emp[`payroll_${period}`] || {};
        const merged = { ...currentPayroll, ...updatedFields };
        const computed = computePayroll(merged);

        const { error: periodError } = await supabase
          .from("payroll_period")
          .update({
            basicpay_total: computed.total_basic_pay,
            additions_total: computed.total_earnings - computed.total_basic_pay,
            deductions_total: computed.total_deductions,
            net_pay: computed.net_pay,
          })
          .eq("pr_period_id", pr_period_id);

        if (periodError) {
          toast.error("Saved fields but failed to update totals: " + periodError.message);
          return false;
        }

        const { error: auditError } = await supabase.from("audit_log").insert({
          employee_id: id,
          pr_period_id,
          action: "Payroll Edited",
          performed_by: performedBy,
          changes,
        });

        if (auditError) {
          toast.error("Saved but audit log failed: " + auditError.message);
          return false;
        }

        dispatch({ type: "EDIT_PAYROLL", payload: { id, updatedFields, period } });

        const logEntry = {
          id: crypto.randomUUID(),
          action: "Payroll Edited",
          performedBy,
          timestamp: new Date().toISOString(),
          changes,
        };
        dispatch({ type: "ADD_AUDIT_LOG", payload: { id, period, logEntry } });
        toast.success("Payroll updated");
        return true;
      } finally {
        setMutationLoading(false);
      }
    },
    [employees, setMutationLoading, dispatch]
  );

  const approvePayroll = useCallback(
    async (id, performedBy, approverId, period = "period1") => {
      setMutationLoading(true);
      try {
        const emp = employees.find((e) => e.id === id);
        const pr_period_id = emp?.[`pr_period_id_${period}`];
        if (!pr_period_id) {
          toast.error("Could not find payroll record");
          return false;
        }

        const updateData = { status: "Approved" };
        if (approverId != null) updateData.approved_by = approverId;

        const { error } = await supabase
          .from("payroll_period")
          .update(updateData)
          .eq("pr_period_id", pr_period_id);

        if (error) {
          toast.error("Failed to approve: " + error.message);
          return false;
        }

        const { error: auditError } = await supabase.from("audit_log").insert({
          employee_id: id,
          pr_period_id,
          action: "Approved",
          performed_by: performedBy,
        });

        if (auditError) {
          toast.error("Approved but audit log failed: " + auditError.message);
          return false;
        }

        dispatch({ type: "APPROVE_PAYROLL", payload: { id, performedBy, period } });

        const logEntry = {
          id: crypto.randomUUID(),
          action: "Approved",
          performedBy,
          timestamp: new Date().toISOString(),
          changes: {},
        };
        dispatch({ type: "ADD_AUDIT_LOG", payload: { id, period, logEntry } });
        toast.success("Payroll approved");
        return true;
      } finally {
        setMutationLoading(false);
      }
    },
    [employees, setMutationLoading, dispatch]
  );

  const unapprovePayroll = useCallback(
    async (id, performedBy, period = "period1") => {
      setMutationLoading(true);
      try {
        const emp = employees.find((e) => e.id === id);
        const pr_period_id = emp?.[`pr_period_id_${period}`];
        if (!pr_period_id) {
          toast.error("Could not find payroll record");
          return false;
        }

        const { error } = await supabase
          .from("payroll_period")
          .update({ status: "Pending", approved_by: null })
          .eq("pr_period_id", pr_period_id);

        if (error) {
          toast.error("Failed to unapprove: " + error.message);
          return false;
        }

        const { error: auditError } = await supabase.from("audit_log").insert({
          employee_id: id,
          pr_period_id,
          action: "Unapproved",
          performed_by: performedBy,
        });

        if (auditError) {
          toast.error("Unapproved but audit log failed: " + auditError.message);
          return false;
        }

        dispatch({ type: "UNAPPROVE_PAYROLL", payload: { id, performedBy, period } });

        const logEntry = {
          id: crypto.randomUUID(),
          action: "Unapproved",
          performedBy,
          timestamp: new Date().toISOString(),
          changes: {},
        };
        dispatch({ type: "ADD_AUDIT_LOG", payload: { id, period, logEntry } });
        toast.success("Payroll unapproved");
        return true;
      } finally {
        setMutationLoading(false);
      }
    },
    [employees, setMutationLoading, dispatch]
  );

  const sendPayroll = useCallback(
    async (performedBy, period = "period1") => {
      setMutationLoading(true);
      try {
        const periodIds = employees
          .map((e) => e[`pr_period_id_${period}`])
          .filter(Boolean);

        const { error } = await supabase
          .from("payroll_period")
          .update({ status: "Sent" })
          .in("pr_period_id", periodIds);

        if (error) {
          toast.error("Failed to send payroll: " + error.message);
          return false;
        }

        const auditEntries = employees
          .map((e) => ({
            employee_id: e.id,
            pr_period_id: e[`pr_period_id_${period}`],
            action: "Payroll Sent",
            performed_by: performedBy,
          }))
          .filter((entry) => entry.pr_period_id);

        const { error: auditError } = await supabase.from("audit_log").insert(auditEntries);

        if (auditError) {
          toast.error("Sent but audit log failed: " + auditError.message);
          return false;
        }

        dispatch({ type: "SEND_PAYROLL", payload: { performedBy, period } });

        employees.forEach((emp) => {
          const logEntry = {
            id: crypto.randomUUID(),
            action: "Payroll Sent",
            performedBy,
            timestamp: new Date().toISOString(),
            changes: {},
          };
          dispatch({ type: "ADD_AUDIT_LOG", payload: { id: emp.id, period, logEntry } });
        });
        toast.success("Payroll sent successfully");
        return true;
      } finally {
        setMutationLoading(false);
      }
    },
    [employees, setMutationLoading, dispatch]
  );

  const createPayrollMonth = useCallback(async (yearMonth) => {
    const [year, month] = yearMonth.split("-").map(Number);

    const period1From = `${yearMonth}-01`;
    const period1To = `${yearMonth}-15`;
    const lastDay = new Date(year, month, 0).getDate();
    const period2From = `${yearMonth}-16`;
    const period2To = `${yearMonth}-${lastDay}`;

    const { data: existing } = await supabase
      .from("payroll_period")
      .select("pr_period_id")
      .eq("date_from", period1From)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: "Payroll for this month already exists." };
    }

    const { data: emps, error: empError } = await supabase
      .from("employee")
      .select("emp_id");

    if (empError) return { success: false, error: empError.message };

    const periods = [];
    emps.forEach((emp) => {
      periods.push({ emp_id: emp.emp_id, date_from: period1From, date_to: period1To, status: "Pending" });
      periods.push({ emp_id: emp.emp_id, date_from: period2From, date_to: period2To, status: "Pending" });
    });

    const { data: insertedPeriods, error: periodError } = await supabase
      .from("payroll_period")
      .insert(periods)
      .select("pr_period_id");

    if (periodError) return { success: false, error: periodError.message };

    const basicpayRows = insertedPeriods.map((p) => ({
      pr_period_id: p.pr_period_id,
      monthly_pay: 0,
      daily_pay: 0,
      work_days: 0,
    }));

    const additionsRows = insertedPeriods.map((p) => ({
      pr_period_id: p.pr_period_id,
      holiday_days: 0,
      holiday_pay: 0,
      snwh_days: 0,
      snwh_pay: 0,
      wellness_alw: 0,
      comms_alw: 0,
      birthday_alw: 0,
      commission: 0,
      allowance: 0,
      bonus: 0,
      thirteenth_mp: 0,
    }));

    const deductionsRows = insertedPeriods.map((p) => ({
      pr_period_id: p.pr_period_id,
      cash_advance: 0,
      sss: 0,
      phil_health: 0,
      pag_ibig: 0,
      hmo: 0,
      others: 0,
    }));

    const [basicpayResult, additionsResult, deductionsResult] = await Promise.all([
      supabase.from("payroll_basicpay").insert(basicpayRows),
      supabase.from("payroll_additions").insert(additionsRows),
      supabase.from("payroll_deductions").insert(deductionsRows),
    ]);

    if (basicpayResult.error) return { success: false, error: basicpayResult.error.message };
    if (additionsResult.error) return { success: false, error: additionsResult.error.message };
    if (deductionsResult.error) return { success: false, error: deductionsResult.error.message };

    return { success: true };
  }, []);

  const generatePayrollForNewEmployee = useCallback(async (empId) => {
    // 1. Figure out the current month boundaries
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const period1From = `${monthStr}-01`;
    const period1To = `${monthStr}-15`;
    const lastDay = new Date(year, month, 0).getDate();
    const period2From = `${monthStr}-16`;
    const period2To = `${monthStr}-${lastDay}`;

    // 2. SMART CHECK: Has the admin even generated this month's payroll yet?
    // We check if ANY record exists for the 1st of this month.
    const { data: existingGlobal } = await supabase
      .from("payroll_period")
      .select("pr_period_id")
      .eq("date_from", period1From)
      .limit(1);

    // If no one has payroll for this month, we do nothing. 
    // The new employee will be included automatically when the admin eventually clicks "New Payroll Month".
    if (!existingGlobal || existingGlobal.length === 0) {
      return { success: true, skipped: true };
    }

    // 3. Create Period 1 and Period 2 for the new employee
    const periods = [
      { emp_id: empId, date_from: period1From, date_to: period1To, status: "Pending" },
      { emp_id: empId, date_from: period2From, date_to: period2To, status: "Pending" }
    ];

    const { data: insertedPeriods, error: periodError } = await supabase
      .from("payroll_period")
      .insert(periods)
      .select("pr_period_id");

    if (periodError) return { success: false, error: periodError.message };

    // 4. Generate the 0-value child rows using the new pr_period_ids
    const basicpayRows = insertedPeriods.map((p) => ({
      pr_period_id: p.pr_period_id, monthly_pay: 0, daily_pay: 0, work_days: 0,
    }));

    const additionsRows = insertedPeriods.map((p) => ({
      pr_period_id: p.pr_period_id, holiday_days: 0, holiday_pay: 0, snwh_days: 0, 
      snwh_pay: 0, wellness_alw: 0, comms_alw: 0, birthday_alw: 0, commission: 0, 
      allowance: 0, bonus: 0, thirteenth_mp: 0,
    }));

    const deductionsRows = insertedPeriods.map((p) => ({
      pr_period_id: p.pr_period_id, cash_advance: 0, sss: 0, phil_health: 0, 
      pag_ibig: 0, hmo: 0, others: 0,
    }));

    // 5. Fire all database inserts at the same time
    const [bRes, aRes, dRes] = await Promise.all([
      supabase.from("payroll_basicpay").insert(basicpayRows),
      supabase.from("payroll_additions").insert(additionsRows),
      supabase.from("payroll_deductions").insert(deductionsRows),
    ]);

    if (bRes.error) return { success: false, error: bRes.error.message };
    if (aRes.error) return { success: false, error: aRes.error.message };
    if (dRes.error) return { success: false, error: dRes.error.message };

    return { success: true, skipped: false };
  }, []);

  return {
    editPayroll,
    approvePayroll,
    unapprovePayroll,
    sendPayroll,
    createPayrollMonth,
    generatePayrollForNewEmployee,
  };
}
