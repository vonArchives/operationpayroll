import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePayroll } from "@/hooks/usePayroll";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import PayslipCard from "@/components/payroll/PayslipCard";
import { getInitials } from "@/lib/utils";
import { Search, ArrowUpDown, Eye, Users, FileText, Plus, Pencil } from "lucide-react";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useIsMobile } from "@/hooks/useMediaQuery";
import EmployeeCard from "@/components/employees/EmployeeCard";
import AddEmployeeModal from "@/components/employees/AddEmployeeModal";

const ROLE_BADGES = {
  admin: { label: "Admin", variant: "info" },
  moderator: { label: "Moderator", variant: "warning" },
  employee: { label: "Employee", variant: "neutral" },
};

function TableSkeleton() {
  return (
    <div aria-busy="true">
      <div className="flex h-10 items-center gap-4 border-b bg-muted/60 px-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="ml-[140px] h-3 w-16" />
        <Skeleton className="ml-[70px] h-3 w-10" />
        <Skeleton className="ml-auto h-3 w-14" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="flex w-[220px] items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="ml-6 h-5 w-16 rounded-full" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-14 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Employees() {
  const { employees, payrollPeriod, currentPeriod, loading, error } = usePayroll();
  const { isAdmin, canViewPayslip, canEditEmployee } = useRolePermissions();
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const isMobile = useIsMobile();

  const payrollKey = `payroll_${currentPeriod}`;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let data = [...employees];
    if (term) {
data = data.filter(
          (emp) =>
            emp.name.toLowerCase().includes(term)
        );
    }
    data.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortAsc ? cmp : -cmp;
    });
    return data;
  }, [employees, search, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * 10, page * 10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortAsc]);

  if (error) {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
        Error: {String(error.message || error)}
      </div>
    );
  }
  
  const openPayslip = (emp) => {
    setSelectedEmployee(emp);
    setDialogOpen(true);
  };

  const openEmployeeEditor = (emp) => {
    setEmployeeToEdit(emp);
  };

  const roleBadge = (role) => {
    const config = ROLE_BADGES[role] || ROLE_BADGES.employee;
    return (
      <Badge variant={config.variant}>{config.label}</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage employee details and view payslips."
        actions={
          isAdmin && (
            <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto">
              <Plus />
              Add employee
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Directory</h2>
            {!loading && <Badge variant="neutral">{filtered.length}</Badge>}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <CardContent className={isMobile ? "p-4" : "p-0"}>
          {loading ? (
            isMobile ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : (
              <TableSkeleton />
            )
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="No employees found" hint="Try adjusting your search." />
          ) : (
            <>
              {isMobile ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {paginated.map((emp) => (
                    <EmployeeCard
                      key={emp.id}
                      employee={emp}
                      onOpenPayslip={openPayslip}
                      canViewPayslip={canViewPayslip}
                      onEditEmployee={openEmployeeEditor}
                      canEditEmployee={canEditEmployee}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <button
                            className="flex items-center gap-1 uppercase hover:text-foreground"
                            onClick={() => setSortAsc((v) => !v)}
                          >
                            Employee
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        </TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                                {getInitials(emp.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{emp.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{emp.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{emp.position}</TableCell>
                         <TableCell>{roleBadge(emp.role)}</TableCell>
                         <TableCell className="text-right">
                           <div className="flex justify-end gap-1">
                             {canViewPayslip && (
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => openPayslip(emp)}
                               >
                                 <Eye className="mr-1 h-4 w-4" />
                                 View Payslip
                               </Button>
                             )}
                             {canEditEmployee && (
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => openEmployeeEditor(emp)}
                               >
                                 <Pencil className="mr-1 h-4 w-4" />
                                 Edit
                               </Button>
                             )}
                           </div>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              )}

              {totalPages > 1 && (
                <div className="border-t p-3">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page > 1) setCurrentPage(page - 1);
                          }}
                          className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <PaginationItem key={i + 1}>
                          <PaginationLink
                            href="#"
                            isActive={page === i + 1}
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(i + 1);
                            }}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page < totalPages) setCurrentPage(page + 1);
                          }}
                          className={
                            page >= totalPages ? "pointer-events-none opacity-50" : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payslip Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto border bg-white p-0 shadow-xl">
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2 text-text-primary">
                <FileText className="h-5 w-5" />
                Payslip
              </DialogTitle>
            </DialogHeader>
            <PayslipCard
              employee={selectedEmployee}
              period={payrollPeriod}
              payrollData={selectedEmployee?.[payrollKey]}
              payrollDate={(() => {
                const payroll = selectedEmployee?.[payrollKey];
                if (!payroll?.date_to) return payrollPeriod;
                const date = new Date(payroll.date_to + "T00:00:00");
                const month = date.toLocaleDateString("en-US", { month: "long" });
                const year = date.getFullYear();
                const lastDay = new Date(year, date.getMonth() + 1, 0).getDate();
                const range = currentPeriod === "period1" ? "1–15" : `16–${lastDay}`;
                return `${month} ${range}, ${year}`;
              })()}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Employee Modal */}
      {isAdmin && (
        <AddEmployeeModal 
          open={isAddModalOpen || !!employeeToEdit}
          employee={employeeToEdit}
          onClose={() => {
            setIsAddModalOpen(false);
            setEmployeeToEdit(null);
          }}
        />
      )}
    </div>
  );
}
