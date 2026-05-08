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
          holiday_days: "holiday_days",
          holiday_pay: "holiday_pay",
          snwh_days: "snwh_days",
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

        const holiday_remarks = updatedFields.holiday_remarks ?? "";
        const snwh_remarks = updatedFields.snwh_remarks ?? "";
        const commission_remarks = updatedFields.commission_remarks ?? "";

        Object.entries(updatedFields).forEach(([key, val]) => {
          if (basicpayMap[key]) basicpayFields[basicpayMap[key]] = val;
          else if (additionsMap[key]) additionsFields[additionsMap[key]] = val;
          else if (deductionsMap[key]) deductionsFields[deductionsMap[key]] = val;
        });

        // Auto-compute holiday_pay and snwh_pay from days when days changed and pay was not explicitly overridden
        const empPayroll = emp[`payroll_${period}`] || {};
        const dailyPay = updatedFields.daily_pay ?? empPayroll.daily_pay ?? 0;
        const dailyPayNum = Number(dailyPay) || 0;

        if (updatedFields.holiday_days !== undefined && updatedFields.holiday_pay === undefined) {
          const holidayDays = Number(updatedFields.holiday_days) || 0;
          additionsFields.holiday_pay = holidayDays * dailyPayNum;
          updatedFields.holiday_pay = additionsFields.holiday_pay;
        }
        if (updatedFields.snwh_days !== undefined && updatedFields.snwh_pay === undefined) {
          const snwhDays = Number(updatedFields.snwh_days) || 0;
          additionsFields.snwh_pay = snwhDays * (dailyPayNum * 0.30);
          updatedFields.snwh_pay = additionsFields.snwh_pay;
        }

        // 1. Sanitize numeric inputs only
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

        // 2. Queue up all database updates
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

        // ALWAYS upsert the remarks using the new table
        updates.push(
          supabase.from("payroll_remarks")
            .upsert({
              pr_period_id,
              holiday_remarks,
              snwh_remarks,
              commission_remarks
            }, { onConflict: "pr_period_id" })
        );

        const changes = {};
        Object.entries(updatedFields).forEach(([key, val]) => {
          const oldVal = emp[`payroll_${period}`]?.[key];
          if (oldVal !== val) changes[key] = { from: oldVal, to: val };
        });

        // 3. Execute all updates simultaneously
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

    const remarksRows = insertedPeriods.map((p) => ({
      pr_period_id: p.pr_period_id, holiday_remarks: "", snwh_remarks: "", commission_remarks: "",
    }));

    const [basicpayResult, additionsResult, deductionsResult, remarksResult] = await Promise.all([
      supabase.from("payroll_basicpay").insert(basicpayRows),
      supabase.from("payroll_additions").insert(additionsRows),
      supabase.from("payroll_deductions").insert(deductionsRows),
      supabase.from("payroll_remarks").insert(remarksRows),
    ]);

    if (basicpayResult.error) return { success: false, error: basicpayResult.error.message };
    if (additionsResult.error) return { success: false, error: additionsResult.error.message };
    if (deductionsResult.error) return { success: false, error: deductionsResult.error.message };
    if (remarksResult.error) return { success: false, error: remarksResult.error.message };

    return { success: true };
  }, []);

  const generatePayrollForNewEmployee = useCallback(async (empId) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const period1From = `${monthStr}-01`;
    const period1To = `${monthStr}-15`;
    const lastDay = new Date(year, month, 0).getDate();
    const period2From = `${monthStr}-16`;
    const period2To = `${monthStr}-${lastDay}`;

    const { data: existingGlobal } = await supabase
      .from("payroll_period")
      .select("pr_period_id")
      .eq("date_from", period1From)
      .limit(1);

    if (!existingGlobal || existingGlobal.length === 0) {
      return { success: true, skipped: true };
    }

    const periods = [
      { emp_id: empId, date_from: period1From, date_to: period1To, status: "Pending" },
      { emp_id: empId, date_from: period2From, date_to: period2To, status: "Pending" }
    ];

    const { data: insertedPeriods, error: periodError } = await supabase
      .from("payroll_period")
      .insert(periods)
      .select("pr_period_id");

    if (periodError) return { success: false, error: periodError.message };

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

    // NEW: Initialize empty remarks rows for the new employee
    const remarksRows = insertedPeriods.map((p) => ({
      pr_period_id: p.pr_period_id, holiday_remarks: "", snwh_remarks: "", commission_remarks: "",
    }));

    const [bRes, aRes, dRes, rRes] = await Promise.all([
      supabase.from("payroll_basicpay").insert(basicpayRows),
      supabase.from("payroll_additions").insert(additionsRows),
      supabase.from("payroll_deductions").insert(deductionsRows),
      supabase.from("payroll_remarks").insert(remarksRows),
    ]);

    if (bRes.error) return { success: false, error: bRes.error.message };
    if (aRes.error) return { success: false, error: aRes.error.message };
    if (dRes.error) return { success: false, error: dRes.error.message };
    if (rRes.error) return { success: false, error: rRes.error.message };

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