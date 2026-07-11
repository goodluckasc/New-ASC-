import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Add, Print, Download, WhatsApp } from '@mui/icons-material';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { format } from 'date-fns';
import DataTable, { type Column } from '../../components/Common/DataTable';
import InvoicePrint from './InvoicePrint';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Invoice, InvoiceStatus } from '../../types';

function formatDate(val: unknown): string {
  if (!val) return '-';
  if (val instanceof Date) return format(val, 'dd/MM/yyyy');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return format((val as { toDate: () => Date }).toDate(), 'dd/MM/yyyy');
  }
  return String(val);
}

const statusColors: Record<InvoiceStatus, string> = {
  Paid: '#388e3c',
  Partial: '#f57c00',
  Unpaid: '#d32f2f',
};

export default function InvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, _setSearchTerm] = useState('');
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'invoices'),
      (snapshot) => {
        setInvoices(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice-${printInvoice?.invoiceNumber || ''}`,
  });

  const handlePdfDownload = (invoice: Invoice) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('INVOICE', 14, 22);
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 14, 32);
    doc.text(`Date: ${formatDate(invoice.createdAt)}`, 14, 38);
    doc.text(`Customer: ${invoice.customerName}`, 14, 44);

    const labourBody = invoice.labourItems.map((l) => [l.labourName, l.quantity, l.rate, l.discount, l.amount]);
    if (labourBody.length) {
      doc.text('Labour Charges', 14, 54);
      (doc as any).autoTable({
        startY: 57,
        head: [['Description', 'Qty', 'Rate', 'Discount', 'Amount']],
        body: labourBody,
      });
    }

    const partsBody = invoice.partsItems.map((p) => [p.itemName, p.quantity, p.sellingPrice, p.discount, p.total]);
    if (partsBody.length) {
      const prevY = (doc as any).lastAutoTable?.finalY || 57;
      doc.text('Parts Charges', 14, prevY + 10);
      (doc as any).autoTable({
        startY: prevY + 13,
        head: [['Item', 'Qty', 'Price', 'Discount', 'Total']],
        body: partsBody,
      });
    }

    const finalY = (doc as any).lastAutoTable?.finalY || 90;
    doc.text(`Subtotal: ৳${invoice.subtotal?.toLocaleString() || '0'}`, 14, finalY + 10);
    doc.text(`Discount: ৳${invoice.discount?.toLocaleString() || '0'}`, 14, finalY + 16);
    doc.text(`VAT (${invoice.vat}%): ৳${((invoice.subtotal - invoice.discount) * invoice.vat / 100).toLocaleString()}`, 14, finalY + 22);
    doc.text(`Grand Total: ৳${invoice.grandTotal?.toLocaleString() || '0'}`, 14, finalY + 30);
    doc.text(`Paid: ৳${invoice.paidAmount?.toLocaleString() || '0'}`, 14, finalY + 36);
    doc.text(`Due: ৳${invoice.dueAmount?.toLocaleString() || '0'}`, 14, finalY + 42);
    doc.text(`Status: ${invoice.status}`, 14, finalY + 50);
    doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
  };

  const handleWhatsAppShare = (invoice: Invoice) => {
    const text = `*Invoice ${invoice.invoiceNumber}*\nCustomer: ${invoice.customerName}\nTotal: ৳${invoice.grandTotal?.toLocaleString() || '0'}\nPaid: ৳${invoice.paidAmount?.toLocaleString() || '0'}\nDue: ৳${invoice.dueAmount?.toLocaleString() || '0'}\nStatus: ${invoice.status}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredData = invoices.filter((inv) => {
    if (filterStatus && inv.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(term) ||
        inv.customerName.toLowerCase().includes(term) ||
        inv.jobCardNumber?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const columns: Column<Invoice>[] = [
    { id: 'invoiceNumber', label: 'Invoice #', width: 140, render: (r) => <Typography sx={{ fontWeight: 600 }}>{r.invoiceNumber}</Typography> },
    { id: 'date', label: 'Date', width: 110, hideOnSm: true, render: (r) => formatDate(r.createdAt) },
    { id: 'customerName', label: 'Customer', width: 160, render: (r) => r.customerName },
    { id: 'jobCardNumber', label: 'Job Card', width: 130, hideOnSm: true, render: (r) => r.jobCardNumber || '-' },
    { id: 'grandTotal', label: 'Total', width: 110, align: 'right', render: (r) => `৳${r.grandTotal?.toLocaleString() || '0'}` },
    { id: 'paidAmount', label: 'Paid', width: 100, align: 'right', hideOnSm: true, render: (r) => `৳${r.paidAmount?.toLocaleString() || '0'}` },
    { id: 'dueAmount', label: 'Due', width: 100, align: 'right', hideOnSm: true, render: (r) => `৳${r.dueAmount?.toLocaleString() || '0'}` },
    {
      id: 'status',
      label: 'Status',
      width: 100,
      render: (r) => (
        <Chip label={r.status} size="small" sx={{ color: '#fff', backgroundColor: statusColors[r.status], fontWeight: 600, fontSize: 11 }} />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      width: 140,
      sortable: false,
      render: (r) => (
        <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Print">
            <IconButton size="small" onClick={() => { setPrintInvoice(r); setTimeout(() => handlePrint(), 100); }}>
              <Print fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download PDF">
            <IconButton size="small" onClick={() => handlePdfDownload(r)}>
              <Download fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share on WhatsApp">
            <IconButton size="small" onClick={() => handleWhatsAppShare(r)}>
              <WhatsApp fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Invoices</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/billing/new')}>
          Generate Invoice
        </Button>
      </Box>

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
            <MenuItem value="Partial">Partial</MenuItem>
            <MenuItem value="Unpaid">Unpaid</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        getId={(r) => r.id}
        onRowClick={(r) => navigate(`/billing/${r.id}`)}
      />

      <Box sx={{ display: 'none' }}>
        <div ref={printRef}>{printInvoice && <InvoicePrint invoice={printInvoice} />}</div>
      </Box>
    </Box>
  );
}