import { useAuth } from "@/context/AuthContext";

const MODERATOR_EDITABLE_FIELDS = [
  "work_days",
  "wellness_allowance",
  "communication_allowance",
  "birthday_allowance",
  "allowance",
];

/**
 * Centralized role-based permission checks.
 * Returns an object with boolean flags and helper functions.
 */
export function useRolePermissions() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isModerator = user?.role === "moderator";

  return {
    user,
    isAdmin,
    isModerator,

    // Column visibility
    canViewDailyRate: isAdmin,
    canViewTotalBasicPay: isAdmin,
    canViewFinalPay: isAdmin,
    canViewTotalsRow: isAdmin,

    // Actions
    canEditPayroll: true, // Both roles can edit, but fields differ
    canEditAllFields: isAdmin,
    canEditField: (field) => isAdmin || MODERATOR_EDITABLE_FIELDS.includes(field),
    canApprovePayroll: isAdmin,
    canUnapprovePayroll: isAdmin,
    canViewPayslip: isAdmin,
    canViewAuditLog: isAdmin,
    canEditEmployee: isAdmin,

    // UI hints
    moderatorEditableFields: MODERATOR_EDITABLE_FIELDS,
    editButtonText: isAdmin ? "Save Changes" : "Update Allowances",
    editModalNote: !isAdmin
      ? "You can only edit work days and allowances. Contact an admin for other changes."
      : null,
  };
}
