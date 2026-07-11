import { useState } from 'react';
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
} from '@mui/material';
import { addDoc, collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import type { Invoice, PaymentMethod } from '../../types';

interface PaymentFormProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onPaymentComplete?: () => void;
}

export default function PaymentForm({ open, onClose, invoice, onPaymentComplete }: PaymentFormProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [amount, setAmount] = useState(invoice?.dueAmount || 0);
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!invoice) return;
    if (amount <= 0) {
      enqueueSnackbar('Amount must be greater than 0', { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const paymentData = {
        invoiceId: invoice.id,
        jobCardId: invoice.jobCardId,
        amount,
        method,
        date: new Date(date),
        reference,
        notes,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'payments'), paymentData);

      const newPaid = (invoice.paidAmount || 0) + amount;
      const newDue = invoice.grandTotal - newPaid;
      const newStatus = newDue <= 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';

      await updateDoc(doc(db, 'invoices', invoice.id), {
        paidAmount: newPaid,
        dueAmount: Math.max(0, newDue),
        status: newStatus,
      });

      await addDoc(collection(db, 'activityLog'), {
        userId: '',
        userName: 'System',
        action: 'Payment Recorded',
        module: 'Payments',
        description: `Payment of ৳${amount} received for invoice ${invoice.invoiceNumber} via ${method}`,
        timestamp: serverTimestamp(),
      });

      enqueueSnackbar('Payment recorded successfully', { variant: 'success' });
      onPaymentComplete?.();
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
          {invoice && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
              <TextField label="Invoice" value={invoice.invoiceNumber} size="small" disabled sx={{ flex: 1 }} />
              <TextField label="Total" value={`৳${invoice.grandTotal?.toLocaleString() || '0'}`} size="small" disabled sx={{ flex: 1 }} />
              <TextField label="Due" value={`৳${invoice.dueAmount?.toLocaleString() || '0'}`} size="small" disabled sx={{ flex: 1 }} />
            </Box>
          )}
          <TextField
            label="Amount *"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            fullWidth
            required
            slotProps={{ htmlInput: { min: 0, max: invoice?.dueAmount } }}
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