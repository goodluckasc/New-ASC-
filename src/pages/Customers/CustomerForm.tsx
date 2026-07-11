import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';
import { addDoc, collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Customer } from '../../types';

interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSave: () => void;
}

export default function CustomerForm({ open, onClose, customer, onSave }: CustomerFormProps) {
  const isEdit = !!customer;
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    mobile: customer?.mobile || '',
    alternativeMobile: customer?.alternativeMobile || '',
    email: customer?.email || '',
    address: customer?.address || '',
    nationalId: customer?.nationalId || '',
    notes: customer?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.mobile.trim()) newErrors.mobile = 'Mobile is required';
    else if (!/^\d{10}$/.test(formData.mobile)) newErrors.mobile = 'Mobile must be 10 digits';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Invalid email address';
    if (formData.alternativeMobile && !/^\d{10}$/.test(formData.alternativeMobile))
      newErrors.alternativeMobile = 'Must be 10 digits';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit && customer) {
        await updateDoc(doc(db, 'customers', customer.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          vehicleCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      onSave();
      onClose();
    } catch {
      setErrors((prev) => ({ ...prev, submit: 'Failed to save customer' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Name *"
            value={formData.name}
            onChange={handleChange('name')}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
            required
          />
          <TextField
            label="Mobile *"
            value={formData.mobile}
            onChange={handleChange('mobile')}
            error={!!errors.mobile}
            helperText={errors.mobile}
            fullWidth
            required
          />
          <TextField
            label="Alternative Mobile"
            value={formData.alternativeMobile}
            onChange={handleChange('alternativeMobile')}
            error={!!errors.alternativeMobile}
            helperText={errors.alternativeMobile}
            fullWidth
          />
          <TextField
            label="Email"
            value={formData.email}
            onChange={handleChange('email')}
            error={!!errors.email}
            helperText={errors.email}
            fullWidth
          />
          <TextField
            label="Address"
            value={formData.address}
            onChange={handleChange('address')}
            fullWidth
            multiline
            rows={2}
          />
          <TextField
            label="National ID"
            value={formData.nationalId}
            onChange={handleChange('nationalId')}
            fullWidth
          />
          <TextField
            label="Notes"
            value={formData.notes}
            onChange={handleChange('notes')}
            fullWidth
            multiline
            rows={3}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
