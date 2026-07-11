import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  increment,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Vehicle } from '../../types';

interface VehicleFormProps {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onSave: () => void;
}

interface FormData {
  customerName: string;
  customerMobile: string;
  registrationNumber: string;
  chassisNumber: string;
  engineNumber: string;
  brand: string;
  model: string;
  variant: string;
  color: string;
  fuelType: string;
  warrantyStatus: string;
  currentOdometer: string;
  purchaseDate: string;
  lastServiceDate: string;
  nextServiceDueDate: string;
  dcNo: string;
  dcDate: string;
}

const emptyForm: FormData = {
  customerName: '',
  customerMobile: '',
  registrationNumber: '',
  chassisNumber: '',
  engineNumber: '',
  brand: '',
  model: '',
  variant: '',
  color: '',
  fuelType: '',
  warrantyStatus: '',
  currentOdometer: '',
  purchaseDate: '',
  lastServiceDate: '',
  nextServiceDueDate: '',
  dcNo: '',
  dcDate: '',
};

function toDateInput(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) return formatForInput(val);
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return formatForInput((val as { toDate: () => Date }).toDate());
  }
  return String(val);
}

function formatForInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildFormData(vehicle: Vehicle | null): FormData {
  if (!vehicle) return emptyForm;
  return {
    customerName: '',
    customerMobile: '',
    registrationNumber: vehicle.registrationNumber || '',
    chassisNumber: vehicle.chassisNumber || '',
    engineNumber: vehicle.engineNumber || '',
    brand: vehicle.brand || '',
    model: vehicle.model || '',
    variant: vehicle.variant || '',
    color: vehicle.color || '',
    fuelType: vehicle.fuelType || '',
    warrantyStatus: vehicle.warrantyStatus || '',
    currentOdometer: vehicle.currentOdometer?.toString() || '',
    purchaseDate: toDateInput(vehicle.purchaseDate),
    lastServiceDate: toDateInput(vehicle.lastServiceDate),
    nextServiceDueDate: toDateInput(vehicle.nextServiceDueDate),
    dcNo: vehicle.dcNo || '',
    dcDate: toDateInput(vehicle.dcDate),
  };
}

export default function VehicleForm({ open, onClose, vehicle, onSave }: VehicleFormProps) {
  const isEdit = !!vehicle;
  const [formData, setFormData] = useState<FormData>(() => buildFormData(vehicle));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(buildFormData(vehicle));
  }, [vehicle]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.registrationNumber.trim())
      newErrors.registrationNumber = 'Registration number is required';
    if (!formData.customerName.trim())
      newErrors.customerName = 'Customer name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const getOrCreateCustomer = async () => {
    const name = formData.customerName.trim();
    const mobile = formData.customerMobile.trim();

    if (mobile) {
      const q = query(collection(db, 'customers'), where('mobile', '==', mobile));
      const snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0].id;
    }

    const nameQ = query(collection(db, 'customers'), where('name', '==', name));
    const nameSnap = await getDocs(nameQ);
    if (!nameSnap.empty) return nameSnap.docs[0].id;

    const c = await addDoc(collection(db, 'customers'), {
      name,
      mobile: mobile || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return c.id;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const customerId = await getOrCreateCustomer();

      const data = {
        customerId,
        registrationNumber: formData.registrationNumber,
        chassisNumber: formData.chassisNumber || null,
        engineNumber: formData.engineNumber || null,
        brand: formData.brand || null,
        model: formData.model || null,
        variant: formData.variant || null,
        color: formData.color || null,
        fuelType: formData.fuelType || null,
        warrantyStatus: formData.warrantyStatus || null,
        currentOdometer: formData.currentOdometer ? Number(formData.currentOdometer) : null,
        purchaseDate: formData.purchaseDate || null,
        lastServiceDate: formData.lastServiceDate || null,
        nextServiceDueDate: formData.nextServiceDueDate || null,
        dcNo: formData.dcNo || null,
        dcDate: formData.dcDate || null,
      };

      if (isEdit && vehicle) {
        await updateDoc(doc(db, 'vehicles', vehicle.id), {
          ...data,
          createdAt: vehicle.createdAt,
        });
      } else {
        await addDoc(collection(db, 'vehicles'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'customers', customerId), {
          vehicleCount: increment(1),
        });
      }
      onSave();
      onClose();
    } catch {
      setErrors((prev) => ({ ...prev, submit: 'Failed to save vehicle' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Customer Name *"
            value={formData.customerName}
            onChange={handleChange('customerName')}
            error={!!errors.customerName}
            helperText={errors.customerName}
            fullWidth
            required
          />
          <TextField
            label="Customer Mobile"
            value={formData.customerMobile}
            onChange={handleChange('customerMobile')}
            fullWidth
          />

          <TextField
            label="Registration Number *"
            value={formData.registrationNumber}
            onChange={handleChange('registrationNumber')}
            error={!!errors.registrationNumber}
            helperText={errors.registrationNumber}
            fullWidth
            required
          />

          <TextField label="Chassis Number" value={formData.chassisNumber} onChange={handleChange('chassisNumber')} fullWidth />
          <TextField label="Engine Number" value={formData.engineNumber} onChange={handleChange('engineNumber')} fullWidth />
          <TextField label="Brand" value={formData.brand} onChange={handleChange('brand')} fullWidth />
          <TextField label="Model" value={formData.model} onChange={handleChange('model')} fullWidth />
          <TextField label="Variant" value={formData.variant} onChange={handleChange('variant')} fullWidth />
          <TextField label="Color" value={formData.color} onChange={handleChange('color')} fullWidth />
          <TextField label="Fuel Type" value={formData.fuelType} onChange={handleChange('fuelType')} fullWidth />
          <TextField label="Warranty Status" value={formData.warrantyStatus} onChange={handleChange('warrantyStatus')} fullWidth />
          <TextField
            label="Current Odometer"
            value={formData.currentOdometer}
            onChange={handleChange('currentOdometer')}
            type="number"
            fullWidth
          />

          <TextField label="DC No" value={formData.dcNo} onChange={handleChange('dcNo')} fullWidth />
          <TextField
            label="DC Date"
            type="date"
            value={formData.dcDate}
            onChange={handleChange('dcDate')}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Purchase Date"
            type="date"
            value={formData.purchaseDate}
            onChange={handleChange('purchaseDate')}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Last Service Date"
            type="date"
            value={formData.lastServiceDate}
            onChange={handleChange('lastServiceDate')}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Next Service Due Date"
            type="date"
            value={formData.nextServiceDueDate}
            onChange={handleChange('nextServiceDueDate')}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
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
