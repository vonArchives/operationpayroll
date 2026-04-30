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
  payrollSent: false,
  payrollPeriod,
};

function payrollReducer(state, action) {
  switch (action.type) {
    case "SET_EMPLOYEES":
      return { ...state, employees: action.payload };

    case "EDIT_PAYROLL": {
      const { id, updatedFields, performedBy } = action.payload;
      return {
        ...state,
        employees: state.employees.map((emp) => {
          if (emp.id !== id) return emp;
          return {
            ...emp,
            payroll: { ...emp.payroll, ...updatedFields },
          };
        }),
      };
    }

    case "APPROVE_PAYROLL": {
      const { id } = action.payload;
      return {
        ...state,
        employees: state.employees.map((emp) => {
          if (emp.id !== id) return emp;
          return { ...emp, status: "Approved" };
        }),
      };
    }

    case "UNAPPROVE_PAYROLL": {
      const { id } = action.payload;
      return {
        ...state,
        employees: state.employees.map((emp) => {
          if (emp.id !== id) return emp;
          return { ...emp, status: "Pending" };
        }),
      };
    }

    case "SEND_PAYROLL":
      return { ...state, payrollSent: true };

    default:
      return state;
  }
}

const PayrollContext = createContext(null);

export function PayrollProvider({ children }) {
  const [state, dispatch] = useReducer(payrollReducer, initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("employee")
          .select(`
            emp_id,
            first_name,
            last_name,
            position,
            department,
            role,
            email,
            payroll_period!payroll_period_emp_id_fkey (
              pr_period_id,
              date_from,
              date_to,
              basicpay_total,
              additions_total,
              deductions_total,
              net_pay,
              status,
              approved_by,
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
              )
            )
          `);

    if (error) throw error;

    const shaped = data.map((emp) => {
      const period = emp.payroll_period?.find((p) => {
        const from = new Date(p.date_from);
        return (
          from.getFullYear() === now.getFullYear() &&
          from.getMonth() === now.getMonth()
        );
      });

      // 👇 These were missing
      const basicpay = period?.payroll_basicpay?.[0] || {};
      const additions = period?.payroll_additions?.[0] || {};
      const deductions = period?.payroll_deductions?.[0] || {};

      return {
        id: emp.emp_id,
        name: `${emp.first_name} ${emp.last_name}`,
        first_name: emp.first_name,
        last_name: emp.last_name,
        position: emp.position,
        department: emp.department,
        role: emp.role,
        email: emp.email,
        status: period?.status || "Pending",
        pr_period_id: period?.pr_period_id,
        payroll: {
          monthly_pay: basicpay.monthly_pay,
          daily_pay: basicpay.daily_pay,
          work_days: basicpay.work_days,
          holiday_days: additions.holiday_days,
          holiday_pay: additions.holiday_pay,
          snwh_days: additions.snwh_days,
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
          basicpay_total: period?.basicpay_total,
          additions_total: period?.additions_total,
          deductions_total: period?.deductions_total,
          net_pay: period?.net_pay,
        },
        auditLog: [],
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

  const editPayroll = useCallback(async (id, updatedFields, performedBy) => {
    dispatch({ type: "EDIT_PAYROLL", payload: { id, updatedFields, performedBy } });

    const emp = state.employees.find((e) => e.id === id);
    if (!emp?.pr_period_id) return;

    // Split updatedFields into their respective tables
    const basicpayFields = {};
    const additionsFields = {};
    const deductionsFields = {};

    const basicpayKeys = ["monthly_pay", "daily_pay", "work_days"];
    const additionsKeys = [
      "holiday_days", "holiday_pay", "snwh_days", "snwh_pay",
      "wellness_alw", "comms_alw", "birthday_alw", "commission",
      "allowance", "bonus", "thirteenth_mp",
    ];
    const deductionsKeys = [
      "cash_advance", "sss", "phil_health", "pag_ibig", "hmo", "others",
    ];

    Object.entries(updatedFields).forEach(([key, val]) => {
      if (basicpayKeys.includes(key)) basicpayFields[key] = val;
      else if (additionsKeys.includes(key)) additionsFields[key] = val;
      else if (deductionsKeys.includes(key)) deductionsFields[key] = val;
    });

    const updates = [];
    if (Object.keys(basicpayFields).length > 0)
      updates.push(supabase.from("payroll_basicpay").update(basicpayFields).eq("pr_period_id", emp.pr_period_id));
    if (Object.keys(additionsFields).length > 0)
      updates.push(supabase.from("payroll_additions").update(additionsFields).eq("pr_period_id", emp.pr_period_id));
    if (Object.keys(deductionsFields).length > 0)
      updates.push(supabase.from("payroll_deductions").update(deductionsFields).eq("pr_period_id", emp.pr_period_id));

    const results = await Promise.all(updates);
    results.forEach(({ error }) => {
      if (error) console.error("Failed to update payroll:", error.message);
    });
  }, [state.employees]);

  const approvePayroll = useCallback(async (id, performedBy) => {
    dispatch({ type: "APPROVE_PAYROLL", payload: { id, performedBy } });

    const emp = state.employees.find((e) => e.id === id);
    if (!emp?.pr_period_id) return;

    const approver = state.employees.find((e) => e.email === performedBy || e.id === performedBy);
    const { error } = await supabase
      .from("payroll_period")
      .update({ status: "Approved", approved_by: approver?.id || null })
      .eq("pr_period_id", emp.pr_period_id);

    if (error) console.error("Failed to approve payroll:", error.message);
  }, [state.employees]);

  const unapprovePayroll = useCallback(async (id, performedBy) => {
    dispatch({ type: "UNAPPROVE_PAYROLL", payload: { id, performedBy } });

    const emp = state.employees.find((e) => e.id === id);
    if (!emp?.pr_period_id) return;

    const { error } = await supabase
      .from("payroll_period")
      .update({ status: "Pending", approved_by: null })
      .eq("pr_period_id", emp.pr_period_id);

    if (error) console.error("Failed to unapprove payroll:", error.message);
  }, [state.employees]);

  const sendPayroll = useCallback(async (performedBy) => {
    dispatch({ type: "SEND_PAYROLL", payload: { performedBy } });

    const periodIds = state.employees
      .map((e) => e.pr_period_id)
      .filter(Boolean);

    const { error } = await supabase
      .from("payroll_period")
      .update({ status: "sent" })
      .in("pr_period_id", periodIds);

    if (error) console.error("Failed to send payroll:", error.message);
  }, [state.employees]);

  return (
    <PayrollContext.Provider
      value={{
        ...state,
        loading,
        error,
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