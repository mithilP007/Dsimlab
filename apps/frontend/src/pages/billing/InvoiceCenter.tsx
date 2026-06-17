import { useEffect, useState } from "react";
import { useBillingStore, type Invoice } from "@/stores/billingStore";
import { useAuthStore } from "@/stores/authStore";
import { Receipt, FileText, Edit, Printer, X, Save, Percent } from "lucide-react";

export function InvoiceCenter() {
  const { invoices, fetchInvoices, updateInvoiceAddress, error } = useBillingStore();
  const { user } = useAuthStore();

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  
  // Form states
  const [billingAddress, setBillingAddress] = useState("");
  const [taxDetails, setTaxDetails] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleEditClick = (inv: Invoice) => {
    setEditingInvoice(inv);
    setBillingAddress(inv.billingAddress || "");
    setTaxDetails(inv.taxDetails || "");
  };

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setUpdating(true);
    try {
      await updateInvoiceAddress(editingInvoice.id, {
        billingAddress,
        taxDetails: taxDetails || undefined
      });
      alert("Billing address updated successfully.");
      setEditingInvoice(null);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:text-black print:p-0">
      {/* Background radial glow (hidden when printing) */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[350px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none print:hidden" />

      <div className="max-w-5xl mx-auto print:max-w-full print:w-full">
        {/* Header - Hidden on Print */}
        <div className="mb-8 border-b border-slate-900 pb-6 print:hidden">
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-8 h-8 text-emerald-400" /> Invoice Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your billing profile, review past receipts, and download formal tax invoices.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl text-sm print:hidden">
            {error}
          </div>
        )}

        {/* Invoice List Table - Hidden on Print */}
        <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl print:hidden">
          <h3 className="text-lg font-bold text-white mb-4">Past Billing Invoices</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Invoice Number</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Tax (18% GST)</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/20">
                    <td className="py-4 font-mono font-semibold text-slate-200">{inv.invoiceNumber}</td>
                    <td className="py-4">{formatDate(inv.createdAt)}</td>
                    <td className="py-4 font-bold text-white">
                      ₹{inv.amount.toLocaleString()}
                    </td>
                    <td className="py-4 text-slate-400">
                      ₹{inv.tax.toLocaleString()}
                    </td>
                    <td className="py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          inv.status === "paid"
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/10"
                            : "bg-red-950/80 text-red-400 border border-red-500/10"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-4 text-right space-x-2">
                      <button
                        onClick={() => handleEditClick(inv)}
                        className="px-3 py-1.5 bg-slate-950 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs transition inline-flex items-center gap-1"
                        title="Edit Address / GSTIN"
                      >
                        <Edit className="w-3.5 h-3.5" /> Address
                      </button>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-3 py-1.5 bg-indigo-900/30 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/20 rounded-lg text-xs transition inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No invoices found on this account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Address Modal - Hidden on Print */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-slate-900 border border-slate-850 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingInvoice(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-400" /> Update Billing Details
            </h3>

            <div className="bg-slate-950 p-3 rounded-xl mb-4 border border-slate-850">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Editing Invoice</span>
              <span className="font-mono text-sm text-indigo-400 font-semibold">{editingInvoice.invoiceNumber}</span>
            </div>

            <form onSubmit={handleUpdateAddress} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Billing Address</label>
                <textarea
                  rows={3}
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Street Address, City, State, Country, ZIP"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/30"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Tax Registration Details (Optional)</label>
                <input
                  type="text"
                  value={taxDetails}
                  onChange={(e) => setTaxDetails(e.target.value)}
                  placeholder="GSTIN or Local Tax ID (e.g. 27AAAAA1111A1Z1)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/30"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="flex-grow py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded-xl text-sm font-semibold transition border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-grow py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> {updating ? "Saving..." : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Template Overlays */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 overflow-y-auto p-4 sm:p-8 flex justify-center items-start print:relative print:bg-white print:p-0 print:overflow-visible">
          {/* Printable Invoice Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-3xl w-full shadow-2xl relative my-8 print:bg-white print:border-none print:shadow-none print:my-0 print:p-0 print:rounded-none">
            
            {/* Close Button & Print Button - Hidden on Print */}
            <div className="absolute top-4 right-4 flex gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex items-center gap-1 text-xs font-semibold px-4"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Print Only Stylesheet */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                .print\\:relative, .print\\:relative * {
                  visibility: visible;
                }
                .print\\:relative {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  color: #000 !important;
                  background-color: #fff !important;
                }
                .print\\:text-black {
                  color: #000 !important;
                }
                .print\\:border-black {
                  border-color: #000 !important;
                }
                .print-hidden-element {
                  display: none !important;
                }
              }
            `}} />

            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-8 mb-8 print:border-neutral-200">
              <div>
                <span className="text-2xl font-black tracking-wider text-white print:text-black">SIM<span className="text-indigo-500">LAB</span></span>
                <p className="text-xs text-slate-400 mt-1 print:text-neutral-500">Digital Marketing Simulation Labs</p>
                <p className="text-xs text-slate-500 print:text-neutral-500 mt-2">
                  Bengaluru, Karnataka, India<br />
                  support@simplab.com | GSTIN: 29DMSL1234F1Z0
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-extrabold text-white uppercase print:text-black tracking-wide">Receipt</h2>
                <p className="font-mono text-sm text-indigo-400 font-bold mt-1">{selectedInvoice.invoiceNumber}</p>
                <div className="mt-4 text-xs text-slate-400 print:text-neutral-500 space-y-1">
                  <div>Date Issued: {formatDate(selectedInvoice.createdAt)}</div>
                  {selectedInvoice.dueDate && <div>Due Date: {formatDate(selectedInvoice.dueDate)}</div>}
                  <div>Status: <span className="font-semibold text-emerald-400 uppercase print:text-black">{selectedInvoice.status}</span></div>
                </div>
              </div>
            </div>

            {/* Client billing address section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2 print:text-neutral-400">Billed To</h4>
                <p className="text-sm font-bold text-white print:text-black">{user?.name}</p>
                <p className="text-xs text-slate-400 print:text-neutral-500 mt-1">{user?.email}</p>
                {user?.institution && <p className="text-xs text-slate-400 print:text-neutral-500">{user.institution}</p>}
              </div>
              <div>
                <h4 className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2 print:text-neutral-400">Billing Address & Tax ID</h4>
                <p className="text-xs text-slate-300 print:text-neutral-700 whitespace-pre-line leading-relaxed">
                  {selectedInvoice.billingAddress || "No billing address set. Click 'Address' in Invoice list to set details."}
                </p>
                {selectedInvoice.taxDetails && (
                  <p className="text-xs font-mono font-semibold text-indigo-400 print:text-neutral-800 mt-3 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 shrink-0" /> Tax ID: {selectedInvoice.taxDetails}
                  </p>
                )}
              </div>
            </div>

            {/* Line items table */}
            <div className="border-b border-slate-800 mb-8 print:border-neutral-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider print:border-neutral-200 print:text-neutral-500">
                    <th className="pb-3">Description</th>
                    <th className="pb-3 text-right">Unit Price</th>
                    <th className="pb-3 text-right">Quantity</th>
                    <th className="pb-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300 print:divide-neutral-100 print:text-neutral-800">
                  <tr>
                    <td className="py-4">
                      <span className="font-bold text-white print:text-black">SimLab Platform Subscription Plan</span>
                      <p className="text-[10px] text-slate-500 mt-1 print:text-neutral-400">Includes active sandbox run enforcements & score analysis ledger metrics.</p>
                    </td>
                    <td className="py-4 text-right">₹{selectedInvoice.amount.toLocaleString()}</td>
                    <td className="py-4 text-right">1</td>
                    <td className="py-4 text-right font-bold text-white print:text-black">₹{selectedInvoice.amount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-8">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400 print:text-neutral-500">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-200 print:text-black">₹{(selectedInvoice.amount - selectedInvoice.tax).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400 print:text-neutral-500">
                  <span>GST (18% SGST/CGST):</span>
                  <span className="font-semibold text-slate-200 print:text-black">₹{selectedInvoice.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base border-t border-slate-800 pt-2 font-extrabold text-white print:text-black print:border-neutral-200">
                  <span>Grand Total:</span>
                  <span>₹{selectedInvoice.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Invoice Footer */}
            <div className="text-center text-[10px] text-slate-500 pt-8 border-t border-slate-850 print:border-neutral-200 print:text-neutral-400">
              Thank you for subscribing to SimLab! This is an electronically generated receipt; no signature is required.
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
export default InvoiceCenter;
