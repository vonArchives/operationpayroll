import React, { createContext, useContext, useReducer, useCallback } from "react";
import { mockEmployees } from "@/lib/mockData";
import { getPeriodLabel } from "@/lib/payrollUtils";

const now = new Date();
const monthYear = now.toLocaleDateString("en-US", {
  month: "long",
  year: "numeric",
});

const initialState = {
  employees: mockEmployees.map((emp) => ({
    ...emp,
    payroll_period1: { ...emp.payroll_period1 },
    payroll_period2: { ...emp.payroll_period2 },
    auditLog_period1: [...emp.auditLog_period1],
    auditLog_period2: [...emp.auditLog_period2],
  })),
  payrollSent_period1: false,
  payrollSent_period2: false,
  payrollPeriod: monthYear,
  periodLabel: getPeriodLabel(),
  currentPeriod: "period1", // "period1" | "period2" | "monthly"
};

function getPeriodField(period) {
  return period === "period2" ? "period2" : "period1";
}

function payrollReducer(state, action) {
  const period = action.payload?.period || "period1";
  const pField = getPeriodField(period);
  const payrollKey = `payroll_${pField}`;
  const statusKey = `status_${pField}`;
  const auditLogKey = `auditLog_${pField}`;
  const sentKey = `payrollSent_${pField}`;

  switch (action.type) {
    case "SWITCH_PERIOD": {
      return {
        ...state,
        currentPeriod: action.payload.period,
      };
    }

    case "EDIT_PAYROLL": {
      const { id, updatedFields, performedBy } = action.payload;
      return {
        ...state,
        employees: state.employees.map((emp) => {
          if (emp.id !== id) return emp;

          const changes = {};
          Object.keys(updatedFields).forEach((key) => {
            const oldVal = emp[payrollKey][key];
            const newVal = updatedFields[key];
            if (oldVal !== newVal) {
              changes[key] = { from: oldVal, to: newVal };
            }
          });

          const newAuditEntry = {
            id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
            action: "Payroll Edited",
            performedBy,
            timestamp: new Date().toISOString(),
            changes,
          };

          return {
            ...emp,
            [payrollKey]: { ...emp[payrollKey], ...updatedFields },
            [auditLogKey]: [...emp[auditLogKey], newAuditEntry],
          };
        }),
      };
    }

    case "APPROVE_PAYROLL": {
      const { id, performedBy } = action.payload;
      return {
        ...state,
        employees: state.employees.map((emp) => {
          if (emp.id !== id) return emp;
          return {
            ...emp,
            [statusKey]: "Approved",
            [auditLogKey]: [
              ...emp[auditLogKey],
              {
                id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
                action: "Approved",
                performedBy,
                timestamp: new Date().toISOString(),
              },
            ],
          };
        }),
      };
    }

    case "UNAPPROVE_PAYROLL": {
      const { id, performedBy } = action.payload;
      return {
        ...state,
        employees: state.employees.map((emp) => {
          if (emp.id !== id) return emp;
          return {
            ...emp,
            [statusKey]: "Pending",
            [auditLogKey]: [
              ...emp[auditLogKey],
              {
                id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
                action: "Unapproved",
                performedBy,
                timestamp: new Date().toISOString(),
              },
            ],
          };
        }),
      };
    }

    case "SEND_PAYROLL": {
      const { performedBy } = action.payload;
      return {
        ...state,
        [sentKey]: true,
        employees: state.employees.map((emp) => ({
          ...emp,
          [auditLogKey]: [
            ...emp[auditLogKey],
            {
              id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
              action: "Payroll Sent",
              performedBy,
              timestamp: new Date().toISOString(),
            },
          ],
        })),
      };
    }

    case "UPDATE_EMPLOYEE": {
      const { id, updatedFields } = action.payload;
      return {
        ...state,
        employees: state.employees.map((emp) => {
          if (emp.id !== id) return emp;
          return { ...emp, ...updatedFields };
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

  const switchPeriod = useCallback((period) => {
    dispatch({ type: "SWITCH_PERIOD", payload: { period } });
  }, []);

  const editPayroll = useCallback((id, updatedFields, performedBy, period = "period1") => {
    dispatch({ type: "EDIT_PAYROLL", payload: { id, updatedFields, performedBy, period } });
  }, []);

  const approvePayroll = useCallback((id, performedBy, period = "period1") => {
    dispatch({ type: "APPROVE_PAYROLL", payload: { id, performedBy, period } });
  }, []);

  const unapprovePayroll = useCallback((id, performedBy, period = "period1") => {
    dispatch({ type: "UNAPPROVE_PAYROLL", payload: { id, performedBy, period } });
  }, []);

  const sendPayroll = useCallback((performedBy, period = "period1") => {
    dispatch({ type: "SEND_PAYROLL", payload: { performedBy, period } });
  }, []);

  const updateEmployee = useCallback((id, updatedFields) => {
    dispatch({ type: "UPDATE_EMPLOYEE", payload: { id, updatedFields } });
  }, []);

  return (
    <PayrollContext.Provider
      value={{
        ...state,
        switchPeriod,
        editPayroll,
        approvePayroll,
        unapprovePayroll,
        sendPayroll,
        updateEmployee,
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
