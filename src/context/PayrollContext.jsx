import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { shapeEmployees } from "@/lib/payrollTransformer";
import { usePayrollMutations } from "@/hooks/usePayrollMutations";
import { useAuth } from "@/context/AuthContext";

const now = new Date();

const initialState = {
  employees: [],
  payrollSent_period1: false,
  payrollSent_period2: false,
  currentPeriod: now.getDate() <= 15 ? "period1" : "period2",
  selectedMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  availableMonths: [],
  payrollPeriod: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
};

function payrollReducer(state, action) {
  switch (action.type) {
    case "SET_EMPLOYEES":
      return { ...state, employees: action.payload };

    case "SET_AVAILABLE_MONTHS":
      return { ...state, availableMonths: action.payload };

    case "SWITCH_PERIOD":
      return { ...state, currentPeriod: action.payload };

    case "SWITCH_MONTH": {
      const newMonth = action.payload;
      const [year, month] = newMonth.split("-").map(Number);
      const monthDate = new Date(year, month - 1, 1);
      const isCurrentMonth =
        year === now.getFullYear() && month === now.getMonth() + 1;
      const autoPeriod = isCurrentMonth
        ? now.getDate() <= 15 ? "period1" : "period2"
        : "period1";
      return {
        ...state,
        selectedMonth: newMonth,
        currentPeriod: autoPeriod,
        payrollPeriod: monthDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      };
    }

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
      return { ...state, [`payrollSent_${period}`]: true };
    }

    case "SET_PAYROLL_SENT": {
      return {
        ...state,
        payrollSent_period1: action.payload.period1,
        payrollSent_period2: action.payload.period2,
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
            auditLog:
              period === "period1"
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

export function PayrollProvider({ children }) {
  const [state, dispatch] = useReducer(payrollReducer, initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [allPeriodData, setAllPeriodData] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth(); 

  useEffect(() => {
    if (!user) {
      dispatch({ type: "SET_EMPLOYEES", payload: [] });
      setAllPeriodData([]);
      return;
    }

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
            payroll_remarks (
              holiday_remarks,
              snwh_remarks,
              commission_remarks
            ),
            employee!payroll_period_emp_id_fkey (
              emp_id,
              first_name,
              last_name,
              position,
              role,
              email
            )
          `);
        if (error) throw error;

        const monthSet = new Set();
        data.forEach((p) => {
          const d = new Date(p.date_from);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthSet.add(key);
        });

        const availableMonths = [...monthSet].sort().reverse().map((key) => {
          const [year, month] = key.split("-").map(Number);
          const label = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          });
          return { key, label };
        });

        setAllPeriodData(data);
        dispatch({ type: "SET_AVAILABLE_MONTHS", payload: availableMonths });

        let activeMonthKey = state.selectedMonth;
        const monthExistsInDb = availableMonths.some((m) => m.key === activeMonthKey);

        if (!monthExistsInDb && availableMonths.length > 0) {
          activeMonthKey = availableMonths[0].key;
          dispatch({ type: "SWITCH_MONTH", payload: activeMonthKey });
        }

        const [selYear, selMonth] = activeMonthKey.split("-").map(Number);
        const monthPeriods = data.filter((p) => {
          if (!p.date_from) return false;
          const [pYear, pMonth] = p.date_from.split("-").map(Number);
          return pYear === selYear && pMonth === selMonth;
        });

        const period1Periods = monthPeriods.filter(
          (p) => Number(p.date_from.split("-")[2]) <= 15
        );
        const period2Periods = monthPeriods.filter(
          (p) => Number(p.date_from.split("-")[2]) >= 16
        );

        const sent1 =
          period1Periods.length > 0 &&
          period1Periods.every((p) => p.status?.toLowerCase() === "sent");
        const sent2 =
          period2Periods.length > 0 &&
          period2Periods.every((p) => p.status?.toLowerCase() === "sent");

        dispatch({ type: "SET_PAYROLL_SENT", payload: { period1: sent1, period2: sent2 } });

        const shaped = shapeEmployees(data, activeMonthKey);
        dispatch({ type: "SET_EMPLOYEES", payload: shaped });
      } catch (err) {
        setError(err.message);
        toast.error("Failed to load employees: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [refreshKey, user]);

  const refreshPayrollData = useCallback(() => setRefreshKey((k) => k + 1), []);

  const switchPeriod = useCallback((period) => {
    dispatch({ type: "SWITCH_PERIOD", payload: period });
  }, []);

  const switchMonth = useCallback((month) => {
    // 1. Update the active month and default period in state
    dispatch({ type: "SWITCH_MONTH", payload: month });

    // 2. Reshape and set the employees for the newly selected month
    const shaped = shapeEmployees(allPeriodData, month);
    dispatch({ type: "SET_EMPLOYEES", payload: shaped });

    // 3. BUG FIX: Recalculate if payroll was already sent for the new month
    const [selYear, selMonth] = month.split("-").map(Number);

    // Using string splitting to avoid the timezone shift bug
    const monthPeriods = allPeriodData.filter((p) => {
      if (!p.date_from) return false;
      const [pYear, pMonth] = p.date_from.split("-").map(Number);
      return pYear === selYear && pMonth === selMonth;
    });

    const period1Periods = monthPeriods.filter((p) => {
      const pDay = Number(p.date_from.split("-")[2]);
      return pDay <= 15;
    });
    
    const period2Periods = monthPeriods.filter((p) => {
      const pDay = Number(p.date_from.split("-")[2]);
      return pDay > 15;
    });

    const sent1 =
      period1Periods.length > 0 &&
      period1Periods.every((p) => p.status?.toLowerCase() === "sent");
      
    const sent2 =
      period2Periods.length > 0 &&
      period2Periods.every((p) => p.status?.toLowerCase() === "sent");

    // 4. Update the Sent status in the global state
    dispatch({ type: "SET_PAYROLL_SENT", payload: { period1: sent1, period2: sent2 } });
    
  }, [allPeriodData]);

  const { editPayroll, approvePayroll, unapprovePayroll, sendPayroll, createPayrollMonth, generatePayrollForNewEmployee } =
    usePayrollMutations(dispatch, state.employees, setMutationLoading);

  const payrollSent =
    state.currentPeriod === "monthly"
      ? false
      : state.currentPeriod === "period2"
        ? state.payrollSent_period2
        : state.payrollSent_period1;

  return (
    <PayrollContext.Provider
        value={{
          ...state,
          loading,
          error,
          mutationLoading,
          payrollSent,
          switchPeriod,
          switchMonth,
          editPayroll,
          approvePayroll,
          unapprovePayroll,
          sendPayroll,
          createPayrollMonth,
          refreshPayrollData,
          generatePayrollForNewEmployee,
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
