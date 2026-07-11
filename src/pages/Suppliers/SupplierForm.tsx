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
import type { Supplier } from '../../types';

interface SupplierFormProps {
  open: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSave: () => void;
}

export default function SupplierForm({ open, onClose, supplier, onSave }: SupplierFormProps) {
  const isEdit = !!supplier;
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    mobile: supplier?.mobile || '',
    address: supplier?.address || '',
    email: supplier?.email || '',
    previousBalance: supplier?.previousBalance?.toString() || '0',
    currentDue: supplier?.currentDue?.toString() || '0',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.mobile.trim()) newErrors.mobile = 'Mobile is required';
    else if (!/^\d{10,}$/.test(formData.mobile)) newErrors.mobile = 'Invalid mobile number';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Invalid email address';
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
      const data = {
        name: formData.name,
        mobile: formData.mobile,
        address: formData.address || null,
        email: formData.email || null,
        previousBalance: Number(formData.previousBalance) || 0,
        currentDue: Number(formData.currentDue) || 0,
        paymentHistory: supplier?.paymentHistory || [],
      };

      if (isEdit && supplier) {
        await updateDoc(doc(db, 'suppliers', supplier.id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      onSave();
      onClose();
    } catch {
      setErrors((prev) => ({ ...prev, submit: 'Failed to save supplier' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
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
            label="Address"
            value={formData.address}
            onChange={handleChange('address')}
            fullWidth
            multiline
            rows={2}
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
            label="Previous Balance"
            type="number"
            value={formData.previousBalance}
            onChange={handleChange('previousBalance')}
            fullWidth
          />
          <TextField
            label="Current Due"
            type="number"
            value={formData.currentDue}
            onChange={handleChange('currentDue')}
            fullWidth
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
