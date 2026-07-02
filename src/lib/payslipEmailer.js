import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/payrollUtils";

const EARNINGS_KEYS = [
  { key: "holiday_days", label: "Holiday Days", isDays: true },
  { key: "holiday_pay", label: "Holiday Pay" },
  { key: "snwh_days", label: "SNWH Days", isDays: true },
  { key: "snwh_pay", label: "SNWH Pay" },
  { key: "wellness_allowance", label: "Wellness Allowance" },
  { key: "communication_allowance", label: "Communication Allowance" },
  { key: "birthday_allowance", label: "Birthday Allowance" },
  { key: "commission", label: "Commission" },
  { key: "allowance", label: "Allowance" },
  { key: "bonuses", label: "Bonuses" },
  { key: "thirteenth_month_pay", label: "13th Month Pay" },
];

const DEDUCTIONS_KEYS = [
  { key: "cash_advance", label: "Cash Advance" },
  { key: "sss", label: "SSS" },
  { key: "philhealth", label: "PhilHealth" },
  { key: "pagibig", label: "Pag-IBIG" },
  { key: "hmo", label: "HMO" },
  { key: "others", label: "Others" },
];

/**
 * Generates a completely unique 4-character Reference Number (e.g., A7F2)
 */
function generateReferenceNumber() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export async function generateAndSendPayslip(emp, payroll, computed, periodLabel, overrideEmail = null) {
  try {
    // Safely grab the ID
    const employeeId = emp.id || emp.emp_id; 

    // 1. Generate the unique reference number using the safe ID
    const referenceNo = generateReferenceNumber();

    // 2. Generate the HTML String (Added Reference Number in the Header)
    const pdfHTML = `
      <div id="payslip-pdf-container" style="width: 700px; padding: 40px; background: white; font-family: 'Segoe UI', sans-serif; color: #0f172a;">
        <style>
          #payslip-pdf-container .header { text-align: center; margin-bottom: 24px; }
          #payslip-pdf-container .header h1 { font-size: 24px; font-weight: 700; margin: 0; }
          #payslip-pdf-container .header p { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 4px; margin-bottom: 0; }
          #payslip-pdf-container .header .period { font-size: 11px; color: #94a3b8; margin-top: 4px; }
          #payslip-pdf-container .header .ref-no { font-size: 10px; color: #94a3b8; margin-top: 4px; font-family: monospace; }
          #payslip-pdf-container .employee-info { margin-bottom: 20px; }
          #payslip-pdf-container .employee-info .name { font-weight: 600; font-size: 14px; margin: 0; }
          #payslip-pdf-container .employee-info .detail { font-size: 13px; color: #64748b; margin: 0; }
          #payslip-pdf-container .section { margin-bottom: 16px; }
          #payslip-pdf-container .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 0; }
          #payslip-pdf-container .row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
          #payslip-pdf-container .row span { display: block; }
          #payslip-pdf-container .row.total { font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 4px; }
          #payslip-pdf-container .deduction { color: #dc2626; }
          #payslip-pdf-container .net-pay { background: #1e3682; color: #fff; text-align: center; padding: 16px; border-radius: 8px; margin-top: 20px; }
          #payslip-pdf-container .net-pay .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; margin: 0; }
          #payslip-pdf-container .net-pay .amount { font-size: 28px; font-weight: 700; margin-top: 4px; margin-bottom: 0; }
        </style>
        <div class="header">
          <h1>JPMC Payroll</h1>
          <p>Official Payslip</p>
          <p class="period">${periodLabel}</p>
          <p class="ref-no">REF: ${referenceNo}</p>
        </div>
        <div class="employee-info">
          <p class="name">${emp.name}</p>
          <p class="detail">${emp.position}</p>
        </div>
        <div class="section">
          <p class="section-title">Basic Pay</p>
          <div class="row"><span>Daily Rate</span><span>${formatCurrency(payroll.daily_pay)}</span></div>
          <div class="row"><span>Work Days</span><span>${payroll.work_days}</span></div>
          <div class="row total"><span>Total Basic Pay</span><span>${formatCurrency(computed.total_basic_pay)}</span></div>
        </div>
        <div class="section">
          <p class="section-title">Earnings</p>
          ${EARNINGS_KEYS.map(({ key, label, isDays }) => {
            const val = payroll[key];
            if (!val || Number(val) === 0) return "";
            const valueStr = isDays ? val : formatCurrency(val);
            if (key === "commission" && payroll.commission_remarks) {
              return `<div class="row"><span>${label}</span><span>${valueStr}</span></div><div class="row" style="padding-left:12px;font-size:11px;color:#94a3b8;"><span>${payroll.commission_remarks}</span></div>`;
            }
            return `<div class="row"><span>${label}</span><span>${valueStr}</span></div>`;
          }).join("")}
          <div class="row total"><span>Total Earnings</span><span>${formatCurrency(computed.total_earnings)}</span></div>
        </div>
        <div class="section">
          <p class="section-title">Deductions</p>
          ${DEDUCTIONS_KEYS.map(({ key, label }) => {
            const val = payroll[key];
            if (!val || Number(val) === 0) return "";
            return `<div class="row deduction"><span>${label}</span><span>-${formatCurrency(val)}</span></div>`;
          }).join("")}
          <div class="row total deduction"><span>Total Deductions</span><span>-${formatCurrency(computed.total_deductions)}</span></div>
        </div>
        <div class="net-pay">
          <p class="label">Net Pay</p>
          <p class="amount">${formatCurrency(computed.net_pay)}</p>
        </div>
      </div>
    `;

    // 3. Mount the invisible DOM node
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = pdfHTML;
    tempDiv.style.position = "absolute";
    tempDiv.style.top = "0";
    tempDiv.style.left = "0";
    tempDiv.style.zIndex = "-1000";
    tempDiv.style.opacity = "0";
    document.body.appendChild(tempDiv);

    // 4. Snapshot and convert to PDF
    const targetElement = document.getElementById("payslip-pdf-container");
    const canvas = await html2canvas(targetElement, { 
      scale: 2, 
      backgroundColor: "#ffffff", 
      width: 700 
    });
    const imgData = canvas.toDataURL("image/png");
    
    document.body.removeChild(tempDiv); 

    const pdf = new jsPDF("p", "pt", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    
    const pdfDataUri = pdf.output("datauristring");
    const pdfBase64 = pdfDataUri.split(",")[1];

    // 5. Fire to Edge Function
    const targetEmail = overrideEmail ? overrideEmail : emp.email;

    const { error: emailError } = await supabase.functions.invoke('send-payslip', {
      body: {
        email: targetEmail,
        employeeName: emp.name,
        period: periodLabel,
        pdfBase64: pdfBase64 
      }
    });

    if (emailError) throw emailError;
    
    // 6. IF SUCCESSFUL: Log it silently to the database!
    const { error: dbError } = await supabase.from('payslip_records').insert({
      reference_no: referenceNo,
      emp_id: employeeId,
      employee_name: emp.name,
      period_label: periodLabel,
      net_pay: computed.net_pay
    });

    if (dbError) {
      console.error("Email sent, but failed to log to payslip_records table:", dbError);
    }

    return true;

  } catch (err) {
    console.error(`Failed to generate/send PDF to ${emp.email}:`, err);
    return false;
  }
}