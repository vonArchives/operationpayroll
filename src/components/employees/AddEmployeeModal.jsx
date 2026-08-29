import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";
import { usePayroll } from "@/hooks/usePayroll";
import { useIsMobile } from "@/hooks/useMediaQuery";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Basic validation schema for the new hire
const employeeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "moderator", "employee"]),
  position: z.string().min(1, "Position is required"),
});

export default function AddEmployeeModal({ open, onClose, employee = null }) {
  const { generatePayrollForNewEmployee, refreshPayrollData } = usePayroll();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();
  const isEditing = Boolean(employee);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      role: "employee", // Default to standard employee for safety
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (!open) return;

    reset(
      employee
        ? {
            first_name: employee.first_name || "",
            last_name: employee.last_name || "",
            email: employee.email || "",
            role: employee.role || "employee",
            position: employee.position || "",
          }
        : { role: "employee" }
    );
  }, [employee, open, reset]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const employeeDetails = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        role: data.role,
        position: data.position,
      };

      if (isEditing) {
        const employeeId = employee.emp_id ?? employee.id;
        if (!employeeId) throw new Error("Employee ID is missing.");

        const { error } = await supabase
          .from("employee")
          .update(employeeDetails)
          .eq("emp_id", employeeId);

        if (error) throw error;
        toast.success(`${data.first_name} ${data.last_name} updated successfully!`);
      } else {
        const { data: newEmp, error } = await supabase
          .from("employee")
          .insert({ ...employeeDetails, status: "Active" })
          .select("emp_id")
          .single();

        if (error) throw error;

        if (newEmp?.emp_id) {
          await generatePayrollForNewEmployee(newEmp.emp_id);
        }

        toast.success(`${data.first_name} added to the system successfully!`);
      }

      refreshPayrollData();
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || `Failed to ${isEditing ? "update" : "add"} employee.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return isMobile ? (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl p-6">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEditing ? "Edit Employee" : "Add New Employee"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" {...register("first_name")} />
              {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" {...register("last_name")} />
              {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work Email</Label>
            <Input id="email" type="email" placeholder="name@jpmorgan.com" {...register("email")} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input id="position" {...register("position")} />
            {errors.position && <p className="text-xs text-red-500">{errors.position.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">System Role</Label>
            <select
              id="role"
              {...register("role")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="employee">Employee (No Access)</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditing ? "Save Changes" : "Save Employee"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Employee" : "Add New Employee"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" {...register("first_name")} />
              {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" {...register("last_name")} />
              {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work Email</Label>
            <Input id="email" type="email" placeholder="name@jpmorgan.com" {...register("email")} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input id="position" {...register("position")} />
            {errors.position && <p className="text-xs text-red-500">{errors.position.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">System Role</Label>
            <select
              id="role"
              {...register("role")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="employee">Employee (No Access)</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditing ? "Save Changes" : "Save Employee"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
