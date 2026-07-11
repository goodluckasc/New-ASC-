import { useState, useMemo, type ReactNode } from 'react';
import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Skeleton,
  Paper,
  Checkbox,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert,
} from '@mui/icons-material';

export interface Column<T> {
  id: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
  sortable?: boolean;
  hideOnSm?: boolean;
  render: (row: T) => ReactNode;
}

export interface Action<T> {
  label: string;
  icon: ReactNode;
  onClick: (row: T) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  actions?: Action<T>[];
  selectable?: boolean;
  onSelectionChange?: (selected: string[]) => void;
  getId: (row: T) => string;
  toolbarContent?: ReactNode;
  emptyMessage?: string;
}

function stableSort<T>(array: T[], comparator: (a: T, b: T) => number): T[] {
  const stabilized = array.map((el, index) => [el, index] as const);
  stabilized.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}

function descendingComparator<T>(a: T, b: T, orderBy: string): number {
  const aVal = String((a as Record<string, unknown>)[orderBy] ?? '');
  const bVal = String((b as Record<string, unknown>)[orderBy] ?? '');
  if (bVal < aVal) return -1;
  if (bVal > aVal) return 1;
  return 0;
}

function getComparator<T>(
  order: 'asc' | 'desc',
  orderBy: string
): (a: T, b: T) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  onRowClick,
  actions,
  selectable = false,
  onSelectionChange,
  getId,
  toolbarContent,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));
  const visibleColumns = columns.filter((col) => !(isSm && col.hideOnSm));
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState<string>(columns[0]?.id || '');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeRow, setActiveRow] = useState<T | null>(null);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelected = checked ? data.map((row) => getId(row)) : [];
    setSelected(newSelected);
    onSelectionChange?.(newSelected);
  };

  const handleSelectOne = (id: string) => {
    const currentIndex = selected.indexOf(id);
    const newSelected =
      currentIndex === -1
        ? [...selected, id]
        : selected.filter((s) => s !== id);
    setSelected(newSelected);
    onSelectionChange?.(newSelected);
  };

  const handleActionOpen = (event: React.MouseEvent<HTMLElement>, row: T) => {
    setAnchorEl(event.currentTarget);
    setActiveRow(row);
  };

  const handleActionClose = () => {
    setAnchorEl(null);
    setActiveRow(null);
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = col.render(row);
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, columns]);

  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData;
    return stableSort(filteredData, getComparator(order, orderBy));
  }, [filteredData, order, orderBy]);

  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const renderSkeleton = () =>
    Array.from({ length: 5 }).map((_, rowIdx) => (
      <TableRow key={rowIdx}>
        {selectable && (
          <TableCell padding="checkbox" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
            <Skeleton variant="rectangular" width={20} height={20} />
          </TableCell>
        )}
        {visibleColumns.map((col) => (
          <TableCell key={col.id}>
            <Skeleton variant="text" />
          </TableCell>
        ))}
        {actions && (
          <TableCell>
            <Skeleton variant="circular" width={32} height={32} />
          </TableCell>
        )}
      </TableRow>
    ));

  const renderEmpty = () => (
    <TableRow>
      <TableCell
        colSpan={visibleColumns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
        align="center"
        sx={{ py: 6 }}
      >
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </TableCell>
    </TableRow>
  );

  return (
    <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          flexWrap: 'wrap',
        }}
      >
        <TextField
          size="small"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: { xs: '100%', sm: 250 }, minWidth: { sm: 250 } }}
        />
        <Box sx={{ flex: 1 }} />
        {toolbarContent}
      </Box>

      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                  <Checkbox
                    indeterminate={
                      selected.length > 0 && selected.length < data.length
                    }
                    checked={data.length > 0 && selected.length === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
              )}
              {visibleColumns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align || 'left'}
                  sortDirection={orderBy === col.id ? order : false}
                  sx={{ width: col.width, fontWeight: 600 }}
                >
                  {col.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleRequestSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
              {actions && (
                <TableCell padding="checkbox" sx={{ width: 48 }} />
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? renderSkeleton()
              : paginatedData.length === 0
                ? renderEmpty()
                : paginatedData.map((row) => {
                    const id = getId(row);
                    const isSelected = selected.includes(id);
                    return (
                      <TableRow
                        key={id}
                        hover
                        selected={isSelected}
                        onClick={() => onRowClick?.(row)}
                        sx={{
                          cursor: onRowClick ? 'pointer' : 'default',
                          '&:last-child td': { border: 0 },
                        }}
                      >
                        {selectable && (
                          <TableCell padding="checkbox" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleSelectOne(id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                        )}
                        {visibleColumns.map((col) => (
                          <TableCell key={col.id} align={col.align || 'left'}>
                            {col.render(row)}
                          </TableCell>
                        ))}
                        {actions && (
                          <TableCell padding="checkbox">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActionOpen(e, row);
                              }}
                            >
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionClose}
      >
        {actions?.map((action) => (
          <MenuItem
            key={action.label}
            onClick={() => {
              if (activeRow) action.onClick(activeRow);
              handleActionClose();
            }}
          >
            <ListItemIcon>{action.icon}</ListItemIcon>
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
}
