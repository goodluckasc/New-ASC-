import { type ReactNode } from 'react';
import { format } from 'date-fns';
import type { Invoice } from '../../types';

interface InvoicePrintProps {
  invoice: Invoice;
}

function formatDate(val: unknown): string {
  if (!val) return '-';
  if (val instanceof Date) return format(val, 'dd/MM/yyyy');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return format((val as { toDate: () => Date }).toDate(), 'dd/MM/yyyy');
  }
  return String(val);
}

const styles = {
  page: {
    width: '210mm',
    minHeight: '297mm',
    padding: '15mm 20mm',
    fontFamily: "'Helvetica', 'Arial', sans-serif",
    fontSize: '11px',
    color: '#333',
    lineHeight: 1.5,
    backgroundColor: '#fff',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    paddingBottom: '15px',
    borderBottom: '2px solid #1976d2',
  } as React.CSSProperties,
  logo: {
    width: '80px',
    height: '80px',
    backgroundColor: '#1976d2',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#1976d2',
    margin: 0,
  } as React.CSSProperties,
  subtitle: {
    fontSize: '10px',
    color: '#666',
    margin: '2px 0',
  } as React.CSSProperties,
  section: {
    marginBottom: '20px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#1976d2',
    margin: '0 0 8px 0',
    paddingBottom: '4px',
    borderBottom: '1px solid #ccc',
  } as React.CSSProperties,
  grid: {
    display: 'flex',
    gap: '40px',
    marginBottom: '10px',
  } as React.CSSProperties,
  label: {
    fontSize: '10px',
    color: '#888',
    margin: 0,
  } as React.CSSProperties,
  value: {
    fontSize: '12px',
    fontWeight: 600,
    margin: '2px 0 8px 0',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginBottom: '15px',
  },
  th: {
    backgroundColor: '#f5f5f5',
    padding: '8px 10px',
    textAlign: 'left' as const,
    fontSize: '10px',
    fontWeight: 700,
    borderBottom: '2px solid #1976d2',
  },
  td: {
    padding: '7px 10px',
    borderBottom: '1px solid #eee',
    fontSize: '10px',
  },
  tdRight: {
    padding: '7px 10px',
    borderBottom: '1px solid #eee',
    fontSize: '10px',
    textAlign: 'right' as const,
  },
  totalRow: {
    fontWeight: 700,
    backgroundColor: '#fafafa',
  },
  totals: {
    marginLeft: 'auto',
    width: '280px',
    marginTop: '10px',
  } as React.CSSProperties,
  totalLine: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '11px',
  } as React.CSSProperties,
  grandTotalLine: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    fontWeight: 700,
    borderTop: '2px solid #333',
    borderBottom: '2px solid #333',
    marginTop: '4px',
  } as React.CSSProperties,
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
    marginTop: '8px',
  },
  footer: {
    marginTop: '40px',
    paddingTop: '15px',
    borderTop: '1px solid #ccc',
    fontSize: '9px',
    color: '#888',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  companyInfo: {
    marginBottom: '5px',
    fontSize: '10px',
    color: '#555',
    whiteSpace: 'pre-line' as const,
  } as React.CSSProperties,
};

export default function InvoicePrint({ invoice }: InvoicePrintProps) {
  const vatAmount = ((invoice.subtotal - invoice.discount) * invoice.vat) / 100;

  const renderTable = (
    headers: string[],
    rows: Array<Record<string, ReactNode>>,
    colAligns: string[],
  ) => (
    <table style={styles.table}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={h} style={{ ...styles.th, textAlign: colAligns[i] as any }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length} style={{ ...styles.td, textAlign: 'center', color: '#999' }}>No items</td>
          </tr>
        ) : (
          rows.map((row, ri) => (
            <tr key={ri}>
              {headers.map((_, ci) => (
                <td key={ci} style={colAligns[ci] === 'right' ? styles.tdRight : styles.td}>
                  {Object.values(row)[ci] || '-'}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  const companyLines = invoice.companyDetails?.split('\n') || [];
  const statusColor = invoice.status === 'Paid' ? '#388e3c' : invoice.status === 'Partial' ? '#f57c00' : '#d32f2f';

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={styles.logo}>ASC</div>
          <div>
            <h1 style={styles.title}>INVOICE</h1>
            {companyLines.map((line, i) => (
              <p key={i} style={styles.companyInfo}>{line}</p>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 700 }}>{invoice.invoiceNumber}</h2>
          <p style={styles.subtitle}>Date: {formatDate(invoice.createdAt)}</p>
          <p style={styles.subtitle}>Job Card: {invoice.jobCardNumber}</p>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={{ flex: 1 }}>
          <p style={styles.label}>Bill To</p>
          <p style={styles.value}>{invoice.customerName}</p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={styles.label}>Vehicle</p>
          <p style={styles.value}>{invoice.vehicleDetails || '-'}</p>
        </div>
      </div>

      {invoice.labourItems.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Labour Charges</h3>
          {renderTable(
            ['Description', 'Qty', 'Rate', 'Discount', 'Amount'],
            invoice.labourItems.map((l) => ({
              desc: l.labourName,
              qty: l.quantity,
              rate: `৳${l.rate}`,
              disc: `৳${l.discount}`,
              amt: `৳${l.amount}`,
            })),
            ['left', 'right', 'right', 'right', 'right'],
          )}
        </div>
      )}

      {invoice.partsItems.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Parts Charges</h3>
          {renderTable(
            ['Item', 'Part #', 'Qty', 'Price', 'Discount', 'Total'],
            invoice.partsItems.map((p) => ({
              item: p.itemName,
              part: p.partNumber || '-',
              qty: p.quantity,
              price: `৳${p.sellingPrice}`,
              disc: `৳${p.discount}`,
              total: `৳${p.total}`,
            })),
            ['left', 'left', 'right', 'right', 'right', 'right'],
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={styles.totals}>
          <div style={styles.totalLine}>
            <span>Subtotal:</span>
            <span>৳{invoice.subtotal?.toLocaleString() || '0'}</span>
          </div>
          <div style={styles.totalLine}>
            <span>Discount:</span>
            <span>- ৳{invoice.discount?.toLocaleString() || '0'}</span>
          </div>
          <div style={styles.totalLine}>
            <span>VAT ({invoice.vat}%):</span>
            <span>৳{vatAmount.toLocaleString()}</span>
          </div>
          <div style={styles.grandTotalLine}>
            <span>Grand Total:</span>
            <span>৳{invoice.grandTotal?.toLocaleString() || '0'}</span>
          </div>
          <div style={styles.totalLine}>
            <span>Paid:</span>
            <span>৳{invoice.paidAmount?.toLocaleString() || '0'}</span>
          </div>
          <div style={{ ...styles.totalLine, color: invoice.dueAmount > 0 ? '#d32f2f' : '#388e3c', fontWeight: 700 }}>
            <span>Due:</span>
            <span>৳{invoice.dueAmount?.toLocaleString() || '0'}</span>
          </div>
          <div style={{ textAlign: 'right', marginTop: '10px' }}>
            <span style={{ ...styles.statusBadge, backgroundColor: statusColor }}>{invoice.status}</span>
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <p style={{ margin: '0 0 5px 0', fontWeight: 600, color: '#555' }}>Terms & Conditions</p>
        <p style={{ margin: 0 }}>1. All payments must be made within 30 days from the invoice date.</p>
        <p style={{ margin: 0 }}>2. A service charge of 2% per month will be applied on overdue payments.</p>
        <p style={{ margin: 0 }}>3. This is a computer-generated invoice and does not require a physical signature.</p>
        <p style={{ margin: '10px 0 0 0', color: '#aaa' }}>
          Thank you for your business! | Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')}
        </p>
      </div>
    </div>
  );
}