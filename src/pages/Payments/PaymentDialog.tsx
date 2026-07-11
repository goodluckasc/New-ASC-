import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { addDoc, collection, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import type { Invoice, PaymentMethod } from '../../types';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export default function PaymentDialog({ open, onClose, onSave }: PaymentDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const unsub = onSnapshot(collection(db, 'invoices'), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice));
      setInvoices(all.filter((inv) => inv.status !== 'Paid'));
    });
    return unsub;
  }, [open]);

  useEffect(() => {
    if (selectedInvoice) {
      setAmount(selectedInvoice.dueAmount || 0);
    }
  }, [selectedInvoice]);

  const handleSave = async () => {
    if (!selectedInvoice) {
      enqueueSnackbar('Please select an invoice', { variant: 'error' });
      return;
    }
    if (amount <= 0) {
      enqueueSnackbar('Amount must be greater than 0', { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const paymentData = {
        invoiceId: selectedInvoice.id,
        jobCardId: selectedInvoice.jobCardId,
        customerName: selectedInvoice.customerName,
        amount,
        method,
        date: new Date(date),
        reference,
        notes,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'payments'), paymentData);

      const newPaid = (selectedInvoice.paidAmount || 0) + amount;
      const newDue = selectedInvoice.grandTotal - newPaid;
      const newStatus = newDue <= 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';

      await updateDoc(doc(db, 'invoices', selectedInvoice.id), {
        paidAmount: newPaid,
        dueAmount: Math.max(0, newDue),
        status: newStatus,
      });

      await addDoc(collection(db, 'activityLog'), {
        userId: '',
        userName: 'System',
        action: 'Payment Recorded',
        module: 'Payments',
        description: `Payment of ৳${amount} received for invoice ${selectedInvoice.invoiceNumber} via ${method}`,
        timestamp: serverTimestamp(),
      });

      enqueueSnackbar('Payment recorded successfully', { variant: 'success' });
      onSave?.();
      onClose();
    } catch {
      enqueueSnackbar('Failed to record payment', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Record Payment</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Autocomplete
            options={invoices}
            getOptionLabel={(o) => `${o.invoiceNumber} - ${o.customerName} (Due: ৳${o.dueAmount?.toLocaleString() || '0'})`}
            value={selectedInvoice}
            onChange={(_, v) => setSelectedInvoice(v)}
            renderInput={(params) => <TextField {...params} label="Select Invoice *" />}
            fullWidth
          />
          {selectedInvoice && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField label="Invoice" value={selectedInvoice.invoiceNumber} size="small" disabled sx={{ flex: 1 }} />
              <TextField label="Total" value={`৳${selectedInvoice.grandTotal?.toLocaleString() || '0'}`} size="small" disabled sx={{ flex: 1 }} />
              <TextField label="Due" value={`৳${selectedInvoice.dueAmount?.toLocaleString() || '0'}`} size="small" disabled sx={{ flex: 1 }} />
            </Box>
          )}
          <TextField
            label="Amount *"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            fullWidth
            required
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField
            label="Payment Method *"
            select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            fullWidth
            required
          >
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Card">Card</MenuItem>
            <MenuItem value="Bank">Bank</MenuItem>
            <MenuItem value="Mobile Banking">Mobile Banking</MenuItem>
          </TextField>
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Reference Number"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            fullWidth
          />
          <TextField
            label="Notes"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Save Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}