import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
} from '@mui/material';
import { useAppSelector } from '../../store';
import { categoriesApi, attributesApi } from '../../services/api';
import type { Category, AttributeDefinition } from '@pim/types';
import WizardNav from './WizardNav';

const TYPES = [
  'text', 'longtext', 'richtext', 'integer', 'decimal', 'boolean',
  'date', 'datetime', 'select', 'multiselect', 'image', 'file', 'relationship', 'json',
];

interface Props { onNext: () => void; onBack: () => void; }

const AttributeDefinitionStep: React.FC<Props> = ({ onNext, onBack }) => {
  const tenantId = useAppSelector((s) => s.onboarding.tenantId);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [attrs, setAttrs] = useState<AttributeDefinition[]>([]);
  const [form, setForm] = useState({ name: '', type: 'text', isRequired: false });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await categoriesApi.list(tenantId);
    const list = (data.data as unknown as Category[]) ?? [];
    setCategories(list);
    if (list[0] && !categoryId) setCategoryId(list[0].id);
  }, [tenantId, categoryId]);

  const loadAttrs = useCallback(async () => {
    if (!tenantId || !categoryId) return;
    const { data } = await attributesApi.list(tenantId, categoryId);
    setAttrs(data.data ?? []);
  }, [tenantId, categoryId]);

  useEffect(() => { void loadCategories(); }, [loadCategories]);
  useEffect(() => { void loadAttrs(); }, [loadAttrs]);

  const add = async () => {
    if (!tenantId || !categoryId || !form.name.trim()) return;
    setLoading(true); setError(null);
    try {
      await attributesApi.create(tenantId, categoryId, {
        name: form.name.trim(),
        type: form.type,
        isRequired: form.isRequired,
      });
      setForm({ name: '', type: 'text', isRequired: false });
      await loadAttrs();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create attribute');
    } finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    if (!tenantId || !categoryId) return;
    await attributesApi.delete(tenantId, categoryId, id);
    await loadAttrs();
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Define the product attributes for each category.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        select
        label="Category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        sx={{ mb: 2, minWidth: 240 }}
        size="small"
      >
        {categories.map((c) => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
      </TextField>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
        <TextField
          label="Attribute name"
          size="small"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          sx={{ flexGrow: 1 }}
        />
        <TextField
          select size="small" label="Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          sx={{ minWidth: 140 }}
        >
          {TYPES.map((t) => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
        </TextField>
        <FormControlLabel
          control={<Checkbox checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} />}
          label="Required"
        />
        <Button variant="contained" onClick={add} disabled={loading || !form.name.trim() || !categoryId}>Add</Button>
      </Stack>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Required</TableCell>
              <TableCell width={60}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attrs.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center">No attributes defined</TableCell></TableRow>
            ) : attrs.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.name}</TableCell>
                <TableCell>{a.type}</TableCell>
                <TableCell>{a.isRequired ? 'Yes' : 'No'}</TableCell>
                <TableCell><IconButton size="small" onClick={() => remove(a.id)}>✕</IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <WizardNav onNext={onNext} onBack={onBack} />
    </Box>
  );
};

export default AttributeDefinitionStep;
