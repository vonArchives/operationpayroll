import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

const now = new Date();
const payrollPeriod = now.toLocaleDateString("en-US", {
  month: "long",
  year: "numeric",
});

const initialState = {
  employees: [],
  payrollSent_period1: false,
  payrollSent_period2: false,
  currentPeriod: "period1",
  payrollPeriod,
};

function payrollReducer(state, action) {
  switch (action.type) {
    case "SET_EMPLOYEES":
      return { ...state, employees: action.payload };

    case "SWITCH_PERIOD":
      return { ...state, currentPeriod: action.payload };

    case "EDIT_PAYROLL": {
      const { id, updatedFields, period } = action.payload;
      const payrollKey = `payroll_${period}`;
      return {
        ...state,
        employees: state.employees.map((emp) => {
          if (emp.id !== id) return emp;
          const updatedPeriod = { ...emp[payrollKey], ...updatedFields };
          return {
            ...emp,
            [payrollKey]: updatedPeriod,
            // Keep payroll in sync with period1 for Dashboard/Employees
            ...(period === "period1" && { payroll: updatedPeriod }),
          };
        }),
      };
    }

    case "APPROVE_PAYROLL": {
      const { id, period } = action.payload;
      const statusKey = `status_${period}`;
      return {
        ...state,
        employees: state.employees.map((emp) => {
          if (emp.id !== id) return emp;
          return { ...emp, [statusKey]: "Approved" };
        }),
      };
    }

    case "UNAPPROVE_PAYROLL": {
      const { id, period } = action.payload;
      const statusKey = `status_${period}`;
      return {
        ...state,
        employees: state.employees.map((emp) => {
          if (emp.id !== id) return emp;
          return { ...emp, [statusKey]: "Pending" };
        }),
      };
    }

    case "SEND_PAYROLL": {
      const { period } = action.payload;
      return {
        ...state,
        [`payrollSent_${period}`]: true,
      };
    }

    case "ADD_AUDIT_LOG": {
      const { id, period, logEntry } = action.payload;
      const auditKey = `auditLog_${period}`;
      return {
        ...state,
        employees: state.employees.map((emp) => {
          if (emp.id !== id) return emp;
          return {
            ...emp,
            [auditKey]: [logEntry, ...(emp[auditKey] || [])],
            auditLog: period === "period1"
              ? [logEntry, ...(emp.auditLog || [])]
              : emp.auditLog,
          };
        }),
      };
    }

    default:
      return state;
  }
}

const PayrollContext = createContext(null);

// Helper to shape a payroll period row
function shapePeriod(period) {
  if (!period) return null;
  const basicpay = Array.isArray(period.payroll_basicpay) 
  ? period.payroll_basicpay[0] || {} 
  : period.payroll_basicpay || {};
  const additions = Array.isArray(period.payroll_additions)
    ? period.payroll_additions[0] || {}
    : period.payroll_additions || {};
  const deductions = Array.isArray(period.payroll_deductions)
    ? period.payroll_deductions[0] || {}
    : period.payroll_deductions || {};
  const auditLog = (period.audit_log || []).map((log) => ({
      id: log.id,
      action: log.action,
      performedBy: log.performed_by,
      timestamp: log.timestamp,
      changes: log.changes || {},
    }));

  return {
    pr_period_id: period.pr_period_id,
    date_from: period.date_from,
    date_to: period.date_to,
    status: period.status || "Pending",
    auditLog,
    daily_pay: basicpay.daily_pay,
    work_days: basicpay.work_days,
    monthly_pay: basicpay.monthly_pay,
    holiday_pay: additions.holiday_pay,
    snwh_pay: additions.snwh_pay,
    wellness_allowance: additions.wellness_alw,
    communication_allowance: additions.comms_alw,
    birthday_allowance: additions.birthday_alw,
    commission: additions.commission,
    allowance: additions.allowance,
    bonuses: additions.bonus,
    thirteenth_month_pay: additions.thirteenth_mp,
    cash_advance: deductions.cash_advance,
    sss: deductions.sss,
    philhealth: deductions.phil_health,
    pagibig: deductions.pag_ibig,
    hmo: deductions.hmo,
    others: deductions.others,
  };
}

export function PayrollProvider({ children }) {
  const [state, dispatch] = useReducer(payrollReducer, initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("payroll_period")
          .select(`
            pr_period_id,
            date_from,
            date_to,
            status,
            approved_by,
            basicpay_total,
            additions_total,
            deductions_total,
            net_pay,
            audit_log (
              id,
              action,
              performed_by,
              timestamp,
              changes
            ),
            payroll_basicpay (
              monthly_pay,
              daily_pay,
              work_days
            ),
            payroll_additions (
              holiday_days,
              holiday_pay,
              snwh_days,
              snwh_pay,
              wellness_alw,
              comms_alw,
              birthday_alw,
              commission,
              allowance,
              bonus,
              thirteenth_mp
            ),
            payroll_deductions (
              cash_advance,
              sss,
              phil_health,
              pag_ibig,
              hmo,
              others
            ),
            employee!payroll_period_emp_id_fkey (
              emp_id,
              first_name,
              last_name,
              position,
              department,
              role,
              email
            )
          `);

        if (error) throw error;

        // Group periods by employee
        const employeeMap = {};
        data.forEach((period) => {
          const emp = period.employee;
          if (!emp) return;
          const empId = emp.emp_id;
          if (!employeeMap[empId]) {
            employeeMap[empId] = { emp, periods: [] };
          }
          employeeMap[empId].periods.push(period);
        });

        // Shape into employee objects
        const shaped = Object.values(employeeMap).map(({ emp, periods }) => {
          periods.sort((a, b) => new Date(a.date_from) - new Date(b.date_from));
          const period1 = shapePeriod(periods[0]);
          const period2 = shapePeriod(periods[1]);

          return {
            id: emp.emp_id,
            name: `${emp.first_name} ${emp.last_name}`,
            first_name: emp.first_name,
            last_name: emp.last_name,
            position: emp.position,
            department: emp.department,
            role: emp.role,
            email: emp.email,
            payroll_period1: period1,
            status_period1: period1?.status || "Pending",
            pr_period_id_period1: period1?.pr_period_id,
            auditLog_period1: period1?.auditLog || [],
            payroll_period2: period2,
            status_period2: period2?.status || "Pending",
            pr_period_id_period2: period2?.pr_period_id,
            auditLog_period2: period2?.auditLog || [],
            payroll: period1 || {},
            status: period1?.status || "Pending",
            auditLog: period1?.auditLog || [],
          };
        });
        dispatch({ type: "SET_EMPLOYEES", payload: shaped });
      } catch (err) {
        setError(err.message);
        console.error("Failed to load employees:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const switchPeriod = useCallback((period) => {
    dispatch({ type: "SWITCH_PERIOD", payload: period });
  }, []);

  const editPayroll = useCallback(async (id, updatedFields, performedBy, period = "period1") => {
    dispatch({ type: "EDIT_PAYROLL", payload: { id, updatedFields, period } });

    const emp = state.employees.find((e) => e.id === id);
    const pr_period_id = emp?.[`pr_period_id_${period}`];
    if (!pr_period_id) return;

    // Map frontend field names to DB column names
    const basicpayMap = { daily_pay: "daily_pay", work_days: "work_days", monthly_pay: "monthly_pay" };
    const additionsMap = {
      holiday_pay: "holiday_pay", snwh_pay: "snwh_pay",
      wellness_allowance: "wellness_alw", communication_allowance: "comms_alw",
      birthday_allowance: "birthday_alw", commission: "commission",
      allowance: "allowance", bonuses: "bonus", thirteenth_month_pay: "thirteenth_mp",
    };
    const deductionsMap = {
      cash_advance: "cash_advance", sss: "sss", philhealth: "phil_health",
      pagibig: "pag_ibig", hmo: "hmo", others: "others",
    };

    const basicpayFields = {};
    const additionsFields = {};
    const deductionsFields = {};

    Object.entries(updatedFields).forEach(([key, val]) => {
      if (basicpayMap[key]) basicpayFields[basicpayMap[key]] = val;
      else if (additionsMap[key]) additionsFields[additionsMap[key]] = val;
      else if (deductionsMap[key]) deductionsFields[deductionsMap[key]] = val;
    });

    const updates = [];
    if (Object.keys(basicpayFields).length > 0)
      updates.push(supabase.from("payroll_basicpay").update(basicpayFields).eq("pr_period_id", pr_period_id));
    if (Object.keys(additionsFields).length > 0)
      updates.push(supabase.from("payroll_additions").update(additionsFields).eq("pr_period_id", pr_period_id));
    if (Object.keys(deductionsFields).length > 0)
      updates.push(supabase.from("payroll_deductions").update(deductionsFields).eq("pr_period_id", pr_period_id));

    const results = await Promise.all(updates);
    results.forEach(({ error }) => {
      if (error) console.error("Failed to update payroll:", error.message);
    });

    const changes = {};
    Object.entries(updatedFields).forEach(([key, val]) => {
      const oldVal = emp[`payroll_${period}`]?.[key];
      if (oldVal !== val) changes[key] = { from: oldVal, to: val };
    });

    await supabase.from("audit_log").insert({
      employee_id: id,
      pr_period_id,
      action: "Payroll Edited",
      performed_by: performedBy,
      changes,
    });

    const logEntry = {
      id: crypto.randomUUID(),
      action: "Payroll Edited",
      performedBy,
      timestamp: new Date().toISOString(),
      changes,
    };
    dispatch({ type: "ADD_AUDIT_LOG", payload: { id, period, logEntry } });
  }, [state.employees]);

  const approvePayroll = useCallback(async (id, performedBy, period = "period1") => {
    dispatch({ type: "APPROVE_PAYROLL", payload: { id, performedBy, period } });

    const emp = state.employees.find((e) => e.id === id);
    const pr_period_id = emp?.[`pr_period_id_${period}`];
    if (!pr_period_id) return;

    const { error } = await supabase
      .from("payroll_period")
      .update({ status: "Approved" })
      .eq("pr_period_id", pr_period_id);

    if (error) console.error("Failed to approve payroll:", error.message);

    await supabase.from("audit_log").insert({
      employee_id: id,
      pr_period_id,
      action: "Approved",
      performed_by: performedBy,
    });

    const logEntry = {
      id: crypto.randomUUID(),
      action: "Approved",
      performedBy,
      timestamp: new Date().toISOString(),
      changes: {},
    };
    dispatch({ type: "ADD_AUDIT_LOG", payload: { id, period, logEntry } });
  }, [state.employees]);

  const unapprovePayroll = useCallback(async (id, performedBy, period = "period1") => {
    dispatch({ type: "UNAPPROVE_PAYROLL", payload: { id, performedBy, period } });

    const emp = state.employees.find((e) => e.id === id);
    const pr_period_id = emp?.[`pr_period_id_${period}`];
    if (!pr_period_id) return;

    const { error } = await supabase
      .from("payroll_period")
      .update({ status: "Pending" })
      .eq("pr_period_id", pr_period_id);

    if (error) console.error("Failed to unapprove payroll:", error.message);

    await supabase.from("audit_log").insert({
      employee_id: id,
      pr_period_id,
      action: "Unapproved",
      performed_by: performedBy,
    });

    const logEntry = {
      id: crypto.randomUUID(),
      action: "Unapproved",
      performedBy,
      timestamp: new Date().toISOString(),
      changes: {},
    };
    dispatch({ type: "ADD_AUDIT_LOG", payload: { id, period, logEntry } });
  }, [state.employees]);

  const sendPayroll = useCallback(async (performedBy, period = "period1") => {
    dispatch({ type: "SEND_PAYROLL", payload: { performedBy, period } });

    const periodIds = state.employees
      .map((e) => e[`pr_period_id_${period}`])
      .filter(Boolean);

    const { error } = await supabase
      .from("payroll_period")
      .update({ status: "sent" })
      .in("pr_period_id", periodIds);

    if (error) console.error("Failed to send payroll:", error.message);

    const auditEntries = state.employees.map((e) => ({
      employee_id: e.id,
      pr_period_id: e[`pr_period_id_${period}`],
      action: "Payroll Sent",
      performed_by: performedBy,
    })).filter((entry) => entry.pr_period_id);

    await supabase.from("audit_log").insert(auditEntries);

    state.employees.forEach((emp) => {
      const logEntry = {
        id: crypto.randomUUID(),
        action: "Payroll Sent",
        performedBy,
        timestamp: new Date().toISOString(),
        changes: {},
      };
      dispatch({ type: "ADD_AUDIT_LOG", payload: { id: emp.id, period, logEntry } });
    });
  }, [state.employees]);

  return (
    <PayrollContext.Provider
      value={{
        ...state,
        loading,
        error,
        switchPeriod,
        editPayroll,
        approvePayroll,
        unapprovePayroll,
        sendPayroll,
      }}
    >
      {children}
    </PayrollContext.Provider>
  );
}

export function usePayroll() {
  const context = useContext(PayrollContext);
  if (!context) {
    throw new Error("usePayroll must be used within a PayrollProvider");
  }
  return context;
}