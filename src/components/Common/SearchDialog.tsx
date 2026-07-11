import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListSubheader,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Person,
  DirectionsCar,
  Assignment,
  Receipt,
} from '@mui/icons-material';
import {
  collectionGroup,
  query,
  orderBy,
  startAt,
  endAt,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

interface SearchResult {
  id: string;
  type: 'customer' | 'vehicle' | 'jobCard' | 'invoice';
  label: string;
  subtitle: string;
  path: string;
}

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchDialog({ open, onClose }: SearchDialogProps) {
  const navigate = useNavigate();
  const [query_, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const term = searchTerm.trim().toLowerCase();
    const allResults: SearchResult[] = [];

    try {
      const customersQuery = query(
        collectionGroup(db, 'customers'),
        orderBy('name'),
        startAt(term),
        endAt(term + '\uf8ff'),
        limit(5)
      );
      const customersSnap = await getDocs(customersQuery);
      customersSnap.forEach((doc) => {
        const data = doc.data();
        allResults.push({
          id: doc.id,
          type: 'customer',
          label: data.name,
          subtitle: data.mobile || '',
          path: `/customers/${doc.id}`,
        });
      });

      const vehiclesQuery = query(
        collectionGroup(db, 'vehicles'),
        orderBy('registrationNumber'),
        startAt(term),
        endAt(term + '\uf8ff'),
        limit(5)
      );
      const vehiclesSnap = await getDocs(vehiclesQuery);
      vehiclesSnap.forEach((doc) => {
        const data = doc.data();
        allResults.push({
          id: doc.id,
          type: 'vehicle',
          label: data.registrationNumber,
          subtitle: `${data.brand} ${data.model}`,
          path: `/vehicles/${doc.id}`,
        });
      });

      const jobCardsQuery = query(
        collectionGroup(db, 'jobCards'),
        orderBy('jobCardNumber'),
        startAt(term),
        endAt(term + '\uf8ff'),
        limit(5)
      );
      const jobCardsSnap = await getDocs(jobCardsQuery);
      jobCardsSnap.forEach((doc) => {
        const data = doc.data();
        allResults.push({
          id: doc.id,
          type: 'jobCard',
          label: data.jobCardNumber,
          subtitle: data.customerName || '',
          path: `/jobcards/${doc.id}`,
        });
      });

      const invoicesQuery = query(
        collectionGroup(db, 'invoices'),
        orderBy('invoiceNumber'),
        startAt(term),
        endAt(term + '\uf8ff'),
        limit(5)
      );
      const invoicesSnap = await getDocs(invoicesQuery);
      invoicesSnap.forEach((doc) => {
        const data = doc.data();
        allResults.push({
          id: doc.id,
          type: 'invoice',
          label: data.invoiceNumber,
          subtitle: data.customerName || '',
          path: `/billing/${doc.id}`,
        });
      });
    } catch {
      // silent fail
    }

    setResults(allResults);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query_), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query_, performSearch]);

  const handleSelect = (result: SearchResult) => {
    onClose();
    navigate(result.path);
    setQuery('');
    setResults([]);
  };

  const groupedResults = {
    customer: results.filter((r) => r.type === 'customer'),
    vehicle: results.filter((r) => r.type === 'vehicle'),
    jobCard: results.filter((r) => r.type === 'jobCard'),
    invoice: results.filter((r) => r.type === 'invoice'),
  };

  const typeIcons: Record<string, React.ReactNode> = {
    customer: <Person />,
    vehicle: <DirectionsCar />,
    jobCard: <Assignment />,
    invoice: <Receipt />,
  };

  const typeLabels: Record<string, string> = {
    customer: 'Customers',
    vehicle: 'Vehicles',
    jobCard: 'Job Cards',
    invoice: 'Invoices',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { position: 'absolute', top: 80 } } }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Search customers, vehicles, invoices..."
          value={query_}
          onChange={(e) => setQuery(e.target.value)}
          variant="standard"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              disableUnderline: true,
            },
          }}
          sx={{ fontSize: 18 }}
        />
      </DialogTitle>
      <DialogContent sx={{ mt: 1, p: 0 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {!loading && results.length === 0 && query_.trim() && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No results found</Typography>
          </Box>
        )}
        {!loading && results.length > 0 && (
          <List dense>
            {(Object.keys(groupedResults) as Array<keyof typeof groupedResults>).map(
              (key) =>
                groupedResults[key].length > 0 && (
                  <li key={key}>
                    <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                      <ListSubheader sx={{ bgcolor: 'background.paper' }}>
                        {typeLabels[key]}
                      </ListSubheader>
                      {groupedResults[key].map((result) => (
                        <ListItemButton
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleSelect(result)}
                          sx={{ pl: 4 }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}>
                              {typeIcons[result.type]}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={result.label}
                            secondary={result.subtitle}
                          />
                        </ListItemButton>
                      ))}
                    </ul>
                  </li>
                )
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
