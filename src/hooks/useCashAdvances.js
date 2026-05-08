import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export function useCashAdvances() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mutationLoading, setMutationLoading] = useState(false);

  // Fetch cash advances with employee info
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cash_advances")
        .select(`
          *,
          employee!inner(emp_id, first_name, last_name, position)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const shaped = (data || []).map((r) => ({
        id: r.id,
        emp_id: r.emp_id,
        employee_name: `${r.employee.first_name} ${r.employee.last_name}`,
        position: r.employee.position,
        total_amount: Number(r.total_amount) || 0,
        per_period_deduction: Number(r.per_period_deduction) || 0,
        present_paid: Number(r.present_paid) || 0,
        status: r.status,
        start_date: r.start_date,
        remarks: r.remarks,
        created_at: r.created_at,
      }));

      setRecords(shaped);
    } catch (err) {
      toast.error("Failed to load cash advances: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch employees for dropdown
  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("employee")
        .select("emp_id, first_name, last_name, position")
        .eq("status", "active")
        .order("last_name", { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      toast.error("Failed to load employees: " + err.message);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchEmployees();
  }, [fetchRecords, fetchEmployees]);

  const createRecord = useCallback(
    async (values) => {
      setMutationLoading(true);
      try {
        const { error } = await supabase.from("cash_advances").insert({
          emp_id: values.emp_id,
          total_amount: values.total_amount,
          per_period_deduction: values.per_period_deduction,
          present_paid: 0,
          status: "active",
          start_date: values.start_date,
          remarks: values.remarks,
        });

        if (error) throw error;
        toast.success("Cash advance created");
        await fetchRecords();
        return true;
      } catch (err) {
        toast.error("Failed to create: " + err.message);
        return false;
      } finally {
        setMutationLoading(false);
      }
    },
    [fetchRecords]
  );

  const updateRecord = useCallback(
    async (id, values) => {
      setMutationLoading(true);
      try {
        const { error } = await supabase
          .from("cash_advances")
          .update({
            total_amount: values.total_amount,
            per_period_deduction: values.per_period_deduction,
            present_paid: values.present_paid,
            status: values.status,
            start_date: values.start_date,
            remarks: values.remarks,
          })
          .eq("id", id);

        if (error) throw error;
        toast.success("Cash advance updated");
        await fetchRecords();
        return true;
      } catch (err) {
        toast.error("Failed to update: " + err.message);
        return false;
      } finally {
        setMutationLoading(false);
      }
    },
    [fetchRecords]
  );

  const recordPayment = useCallback(
    async (id, amount) => {
      setMutationLoading(true);
      try {
        const record = records.find((r) => r.id === id);
        if (!record) throw new Error("Record not found");

        const newPaid = (record.present_paid || 0) + amount;
        const newStatus = newPaid >= record.total_amount ? "completed" : "active";

        const { error } = await supabase
          .from("cash_advances")
          .update({
            present_paid: newPaid,
            status: newStatus,
          })
          .eq("id", id);

        if (error) throw error;
        toast.success("Payment recorded");
        await fetchRecords();
        return true;
      } catch (err) {
        toast.error("Failed to record payment: " + err.message);
        return false;
      } finally {
        setMutationLoading(false);
      }
    },
    [records, fetchRecords]
  );

  const deleteRecord = useCallback(
    async (id) => {
      setMutationLoading(true);
      try {
        const { error } = await supabase
          .from("cash_advances")
          .delete()
          .eq("id", id);

        if (error) throw error;
        toast.success("Cash advance deleted");
        await fetchRecords();
        return true;
      } catch (err) {
        toast.error("Failed to delete: " + err.message);
        return false;
      } finally {
        setMutationLoading(false);
      }
    },
    [fetchRecords]
  );

  return {
    records,
    employees,
    loading,
    mutationLoading,
    createRecord,
    updateRecord,
    recordPayment,
    deleteRecord,
    refresh: fetchRecords,
  };
}
