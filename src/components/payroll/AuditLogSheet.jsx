import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList } from "lucide-react";

export default function AuditLogSheet({ employee, open, onClose, period = "period1" }) {
  const auditLogKey = `auditLog_${period}`;
  const periodLabel = period === "period2" ? "Period 2" : "Period 1";
  const logs = [...(employee?.[auditLogKey] || [])].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {employee?.name} — {periodLabel} Audit Log
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="mt-6 h-[calc(100vh-8rem)]">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                No audit history yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6 pr-4">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-text-primary">{log.action}</p>
                      <p className="text-sm text-text-muted">
                        by {log.performedBy}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-text-muted">
                      {format(new Date(log.timestamp), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>

                  {log.action === "Payroll Edited" && log.changes && Object.keys(log.changes).length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-8 text-xs">Field</TableHead>
                            <TableHead className="h-8 text-xs">From</TableHead>
                            <TableHead className="h-8 text-xs">To</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(log.changes).map(([field, change]) => (
                            <TableRow key={field}>
                              <TableCell className="py-2 text-xs font-medium capitalize">
                                {field.replace(/_/g, " ")}
                              </TableCell>
                              <TableCell className="py-2 text-xs text-danger">
                                {Number(change.from).toLocaleString("en-PH", {
                                  style: "currency",
                                  currency: "PHP",
                                })}
                              </TableCell>
                              <TableCell className="py-2 text-xs text-success">
                                {Number(change.to).toLocaleString("en-PH", {
                                  style: "currency",
                                  currency: "PHP",
                                })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
