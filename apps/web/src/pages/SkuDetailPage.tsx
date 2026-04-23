import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  TextField,
  MenuItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAppSelector } from '../store';
import { skusApi, categoriesApi } from '../services/api';
import type { SkuWithDetails, Category } from '@pim/types';
import AttributesEditor from '../components/sku/AttributesEditor';

const STATUSES = ['active', 'inactive', 'draft'] as const;

interface Draft {
  skuCode: string;
  name: string;
  description: string;
  categoryId: string;
  stockLevel: number;
  status: string;
}

const SkuDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tenant = useAppSelector((s) => s.auth.tenant);

  const [sku, setSku] = useState<SkuWithDetails | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenant || !id) return;
    setLoading(true); setError(null);
    try {
      const { data } = await skusApi.get(tenant.id, id);
      const s = data.data as SkuWithDetails;
      setSku(s);
      setDraft({
        skuCode: s.skuCode,
        name: s.name,
        description: s.description ?? '',
        categoryId: s.categoryId,
        stockLevel: s.stockLevel,
        status: s.status,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load SKU');
    } finally { setLoading(false); }
  }, [tenant, id]);

  const loadCategories = useCallback(async () => {
    if (!tenant) return;
    const { data } = await categoriesApi.list(tenant.id);
    setCategories((data.data as unknown as Category[]) ?? []);
  }, [tenant]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadCategories(); }, [loadCategories]);

  const save = async () => {
    if (!tenant || !id || !draft) return;
    setSaving(true); setError(null);
    try {
      await skusApi.update(tenant.id, id, {
        skuCode: draft.skuCode,
        name: draft.name,
        description: draft.description,
        categoryId: draft.categoryId,
        stockLevel: Number(draft.stockLevel) || 0,
        status: draft.status,
      });
      setEditing(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  };

  const cancel = () => {
    if (!sku) return;
    setDraft({
      skuCode: sku.skuCode,
      name: sku.name,
      description: sku.description ?? '',
      categoryId: sku.categoryId,
      stockLevel: sku.stockLevel,
      status: sku.status,
    });
    setEditing(false);
  };

  const remove = async () => {
    if (!tenant || !id) return;
    if (!confirm('Soft-delete this SKU?')) return;
    try {
      await skusApi.delete(tenant.id, id);
      navigate('/products');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sku || !draft) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>Back</Button>
        {error ? <Alert severity="error">{error}</Alert> : <Typography>SKU not found.</Typography>}
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/products')} sx={{ mb: 3 }}>
        Back to Products
      </Button>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h4" fontWeight={700}>{sku.name}</Typography>
          <Chip
            label={sku.status}
            color={sku.status === 'active' ? 'success' : sku.status === 'draft' ? 'warning' : 'default'}
          />
        </Stack>
        <Stack direction="row" spacing={1}>
          {editing ? (
            <>
              <Button variant="outlined" onClick={cancel} disabled={saving}>Cancel</Button>
              <Button variant="contained" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outlined" color="error" onClick={remove}>Delete</Button>
              <Button variant="contained" onClick={() => setEditing(true)}>Edit</Button>
            </>
          )}
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Chip label={`SKU: ${sku.skuCode}`} variant="outlined" />
        <Chip label={`Category: ${sku.category?.name ?? '—'}`} variant="outlined" />
        <Chip label={`Stock: ${sku.stockLevel}`} variant="outlined" />
      </Stack>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>Product Details</Typography>

        {editing ? (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="SKU Code" value={draft.skuCode}
                onChange={(e) => setDraft({ ...draft, skuCode: e.target.value })} fullWidth required />
              <TextField label="Name" value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })} fullWidth required />
            </Stack>
            <TextField label="Description" value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              multiline minRows={3} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField select label="Category" value={draft.categoryId}
                onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })} fullWidth>
                {categories.map((c) => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
              </TextField>
              <TextField type="number" label="Stock" value={draft.stockLevel}
                onChange={(e) => setDraft({ ...draft, stockLevel: parseInt(e.target.value, 10) || 0 })} fullWidth />
              <TextField select label="Status" value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })} fullWidth>
                {STATUSES.map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
              </TextField>
            </Stack>
          </Stack>
        ) : (
          sku.description ? (
            <Typography variant="body1" color="text.secondary">{sku.description}</Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">No description.</Typography>
          )
        )}
      </Paper>

      <AttributesEditor
        tenantId={tenant!.id}
        skuId={sku.id}
        categoryId={sku.categoryId}
        initialValues={sku.attributes ?? []}
        onChanged={() => void load()}
      />
    </Box>
  );
};

export default SkuDetailPage;
