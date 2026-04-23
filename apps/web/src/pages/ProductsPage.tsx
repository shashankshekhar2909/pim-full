import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  MenuItem,
  Stack,
  Button,
  TablePagination,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Toolbar,
} from '@mui/material';
import { useAppSelector } from '../store';
import { skusApi, categoriesApi } from '../services/api';
import type { Sku, Category } from '@pim/types';

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAppSelector((s) => s.auth.tenant);
  const [rows, setRows] = useState<(Sku & { category?: Category })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true); setError(null);
    try {
      const { data } = await skusApi.list(tenant.id, {
        page: page + 1,
        limit,
        ...(q ? { q } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(status ? { status } : {}),
      });
      setRows((data.data as unknown) as (Sku & { category?: Category })[]);
      setTotal(data.meta?.total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load SKUs');
    } finally { setLoading(false); }
  }, [tenant, page, limit, q, categoryId, status]);

  const loadCategories = useCallback(async () => {
    if (!tenant) return;
    const { data } = await categoriesApi.list(tenant.id);
    setCategories((data.data as unknown as Category[]) ?? []);
  }, [tenant]);

  useEffect(() => { void loadCategories(); }, [loadCategories]);
  useEffect(() => { void load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!tenant) return;
    if (!confirm('Soft-delete this SKU?')) return;
    try {
      await skusApi.delete(tenant.id, id);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    const pageIds = rows.map((r) => r.id);
    const allSelected = pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const bulkDelete = async () => {
    if (!tenant || selected.size === 0) return;
    if (!confirm(`Soft-delete ${selected.size} SKUs?`)) return;
    try {
      await skusApi.bulkDelete(tenant.id, [...selected]);
      clearSelection();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bulk delete failed');
    }
  };

  const bulkSetStatus = async (newStatus: string) => {
    if (!tenant || selected.size === 0 || !newStatus) return;
    try {
      await skusApi.bulkUpdate(tenant.id, {
        skuIds: [...selected],
        patch: { status: newStatus },
      });
      setBulkStatus('');
      clearSelection();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bulk update failed');
    }
  };

  const bulkExport = async () => {
    if (!tenant) return;
    try {
      const filters: { skuIds?: string[]; categoryId?: string; status?: string } = {};
      if (selected.size > 0) filters.skuIds = [...selected];
      else {
        if (categoryId) filters.categoryId = categoryId;
        if (status) filters.status = status;
      }
      const response = await skusApi.bulkExport(tenant.id, filters);
      const blob = new Blob([response.data as BlobPart], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skus-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someOnPageSelected = rows.some((r) => selected.has(r.id)) && !allOnPageSelected;

  if (!tenant) return <Alert severity="warning">Not signed in.</Alert>;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Products</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={bulkExport}>Export</Button>
          <Button variant="outlined" onClick={() => navigate('/products/import')}>Import</Button>
          <Button variant="contained" onClick={() => setAddOpen(true)}>+ Add SKU</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2}>
          <TextField
            size="small" label="Search (code or name)" value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            sx={{ flexGrow: 1 }}
          />
          <TextField
            select size="small" label="Category" value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All</MenuItem>
            {categories.map((c) => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
          </TextField>
          <TextField
            select size="small" label="Status" value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        {selected.size > 0 && (
          <Toolbar
            variant="dense"
            sx={{ bgcolor: 'primary.50', borderBottom: '1px solid', borderColor: 'divider', gap: 2 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {selected.size} selected
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <TextField
              select size="small" label="Set status" value={bulkStatus}
              onChange={(e) => { setBulkStatus(e.target.value); void bulkSetStatus(e.target.value); }}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
            </TextField>
            <Button variant="outlined" size="small" onClick={bulkExport}>Export CSV</Button>
            <Button variant="outlined" color="error" size="small" onClick={bulkDelete}>Delete</Button>
            <Button size="small" onClick={clearSelection}>Clear</Button>
          </Toolbar>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={allOnPageSelected}
                      indeterminate={someOnPageSelected}
                      onChange={togglePage}
                    />
                  </TableCell>
                  <TableCell>SKU Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell width={80}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.disabled' }}>
                      No products yet. Use <strong>Import</strong> or <strong>Add SKU</strong>.
                    </TableCell>
                  </TableRow>
                ) : rows.map((r) => {
                  const isSelected = selected.has(r.id);
                  return (
                    <TableRow key={r.id} hover selected={isSelected}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={isSelected} onChange={() => toggleOne(r.id)} />
                      </TableCell>
                      <TableCell onClick={() => navigate(`/skus/${r.id}`)} sx={{ cursor: 'pointer' }}>{r.skuCode}</TableCell>
                      <TableCell onClick={() => navigate(`/skus/${r.id}`)} sx={{ cursor: 'pointer' }}>{r.name}</TableCell>
                      <TableCell>{r.category?.name ?? '—'}</TableCell>
                      <TableCell align="right">{r.stockLevel}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={r.status}
                          color={r.status === 'active' ? 'success' : r.status === 'draft' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleDelete(r.id)} title="Delete">✕</IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={limit}
              onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Paper>

      <AddSkuDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        categories={categories}
        tenantId={tenant.id}
        onCreated={() => { setAddOpen(false); void load(); }}
      />
    </Box>
  );
};

// ------------------------------------------------------------------

interface AddProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  tenantId: string;
  onCreated: () => void;
}

const AddSkuDialog: React.FC<AddProps> = ({ open, onClose, categories, tenantId, onCreated }) => {
  const [form, setForm] = useState({ skuCode: '', name: '', categoryId: '', stockLevel: 0 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && categories[0] && !form.categoryId) {
      setForm((f) => ({ ...f, categoryId: categories[0].id }));
    }
  }, [open, categories, form.categoryId]);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      await skusApi.create(tenantId, {
        skuCode: form.skuCode.trim(),
        name: form.name.trim(),
        categoryId: form.categoryId,
        stockLevel: Number(form.stockLevel) || 0,
      });
      setForm({ skuCode: '', name: '', categoryId: categories[0]?.id ?? '', stockLevel: 0 });
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create SKU');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add SKU</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="SKU Code" value={form.skuCode}
            onChange={(e) => setForm({ ...form, skuCode: e.target.value })} required fullWidth />
          <TextField label="Name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
          <TextField select label="Category" value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required fullWidth>
            {categories.map((c) => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
          </TextField>
          <TextField type="number" label="Stock level" value={form.stockLevel}
            onChange={(e) => setForm({ ...form, stockLevel: parseInt(e.target.value, 10) || 0 })} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={saving || !form.skuCode.trim() || !form.name.trim() || !form.categoryId}
        >
          {saving ? 'Saving…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductsPage;
