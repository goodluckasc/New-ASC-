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
} from '@mui/material';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import type { Call, CallStatus } from '../../types';

function formatDate(val: unknown): string {
  if (!val) return '-';
  if (val instanceof Date) return format(val, 'dd/MM/yyyy');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return format((val as { toDate: () => Date }).toDate(), 'dd/MM/yyyy');
  }
  return String(val);
}

interface CallFormProps {
  open: boolean;
  onClose: () => void;
  call: Call;
}

export default function CallForm({ open, onClose, call }: CallFormProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState<CallStatus>(call.status);
  const [notes, setNotes] = useState(call.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'calls', call.id), {
        status,
        notes,
        updatedAt: serverTimestamp(),
      });
      enqueueSnackbar('Call updated successfully', { variant: 'success' });
      onClose();
    } catch {
      enqueueSnackbar('Failed to update call', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFollowUp = async () => {
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'followUps'), {
        customerId: call.customerId,
        customerName: call.customerName,
        mobile: call.mobile,
        vehicleId: call.vehicleId || null,
        vehicleRegNo: call.vehicleRegNo || null,
        date: new Date(),
        time: format(new Date(), 'HH:mm'),
        notes: `Follow-up from call: ${notes || 'No notes'}`,
        nextFollowUpDate: null,
        status: 'Pending',
        callId: call.id,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'calls', call.id), {
        status: 'Follow-up Required',
        notes,
        updatedAt: serverTimestamp(),
      });
      enqueueSnackbar('Follow-up created successfully', { variant: 'success' });
      onClose();
    } catch {
      enqueueSnackbar('Failed to create follow-up', { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Call Details</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField label="Customer" value={call.customerName} size="small" disabled sx={{ flex: 1 }} />
            <TextField label="Mobile" value={call.mobile || '-'} size="small" disabled sx={{ flex: 1 }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField label="Vehicle" value={call.vehicleRegNo || '-'} size="small" disabled sx={{ flex: 1 }} />
            <TextField label="Last Service" value={formatDate(call.lastServiceDate)} size="small" disabled sx={{ flex: 1 }} />
            <TextField label="Days Since Service" value={call.daysSinceService ?? '-'} size="small" disabled sx={{ flex: 1 }} />
          </Box>
          <TextField
            label="Status"
            select
            value={status}
            onChange={(e) => setStatus(e.target.value as CallStatus)}
            fullWidth
          >
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Called">Called</MenuItem>
            <MenuItem value="Busy">Busy</MenuItem>
            <MenuItem value="No Answer">No Answer</MenuItem>
            <MenuItem value="Customer Coming">Customer Coming</MenuItem>
            <MenuItem value="Follow-up Required">Follow-up Required</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Not Interested">Not Interested</MenuItem>
          </TextField>
          <TextField
            label="Notes"
            multiline
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button onClick={handleCreateFollowUp} color="secondary" variant="outlined">
          Create Follow-up
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            Save Changes
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}