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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, ArrowUpDown, Eye, Users, FileText, Plus} from "lucide-react";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import AddEmployeeModal from "@/components/employees/AddEmployeeModal";

const ROLE_BADGES = {
  admin: { label: "Admin", variant: "default" },
  moderator: { label: "Moderator", variant: "secondary" },
  employee: { label: "Employee", variant: "outline" },
};

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="ml-auto h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function Employees() {
  const { employees, payrollPeriod, loading, error } = usePayroll();
  const { isAdmin } = useRolePermissions();
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const payrollKey = `payroll_${payrollPeriod}`;

  const activeEmployeesForPeriod = employees.filter((employee) => {
    return employee[payrollKey] !== undefined && employee[payrollKey] !== null;
  });

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

  if (error) return <p className="p-6 text-red-500">Error: {error}</p>;
  
  const openPayslip = (emp) => {
    setSelectedEmployee(emp);
    setDialogOpen(true);
  };

  const roleBadge = (role) => {
    const config = ROLE_BADGES[role] || ROLE_BADGES.employee;
    return (
      <Badge variant={config.variant}>{config.label}</Badge>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left Side: Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">
            Manage and view employee details and payslips.
          </p>
        </div>
        
        {/* Right Side: Actions & Search */}
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          {isAdmin && (
            <Button 
              onClick={() => setIsAddModalOpen(true)} 
              className="w-full sm:w-auto gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          )}
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
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Employee Directory</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                No employees found
              </p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>
                        <button
                          className="flex items-center gap-1"
                          onClick={() => setSortAsc((v) => !v)}
                        >
                          Name
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
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs">
                              {getInitials(emp.name)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">
                          {emp.name}
                        </TableCell>
<TableCell>{emp.position}</TableCell>
                         <TableCell>{roleBadge(emp.role)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPayslip(emp)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View Payslip
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
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
            <PayslipCard employee={selectedEmployee} period={payrollPeriod} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Employee Modal */}
      {isAdmin && (
        <AddEmployeeModal 
          open={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
        />
      )}
    </div>
  );
}