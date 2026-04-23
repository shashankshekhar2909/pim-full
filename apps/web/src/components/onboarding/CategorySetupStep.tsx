import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  Stack,
  Paper,
} from '@mui/material';
import { useAppSelector } from '../../store';
import { categoriesApi } from '../../services/api';
import type { Category } from '@pim/types';
import WizardNav from './WizardNav';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const CategorySetupStep: React.FC<Props> = ({ onNext, onBack }) => {
  const tenantId = useAppSelector((s) => s.onboarding.tenantId);
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await categoriesApi.list(tenantId);
    setItems(Array.isArray(data.data) ? (data.data as unknown as Category[]) : []);
  }, [tenantId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const add = async () => {
    if (!tenantId || !name.trim()) return;
    setLoading(true); setError(null);
    try {
      await categoriesApi.create(tenantId, {
        name: name.trim(),
        parentCategoryId: parentId || null,
      });
      setName(''); setParentId('');
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!tenantId) return;
    try {
      await categoriesApi.delete(tenantId, id);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete category');
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Create the category hierarchy for your catalogue. You need at least one.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          label="Category name"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        <TextField
          select
          SelectProps={{ native: true }}
          label="Parent"
          size="small"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <option value="">— none (root) —</option>
          {items.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </TextField>
        <Button variant="contained" onClick={add} disabled={loading || !name.trim()}>Add</Button>
      </Stack>

      <Paper variant="outlined" sx={{ maxHeight: 280, overflow: 'auto' }}>
        {items.length === 0 ? (
          <Typography color="text.disabled" sx={{ p: 2 }}>No categories yet.</Typography>
        ) : (
          <List dense>
            {items.map((c) => (
              <ListItem
                key={c.id}
                sx={{ pl: 2 + (c.level ?? 0) * 3 }}
                secondaryAction={
                  <IconButton size="small" onClick={() => remove(c.id)} aria-label="delete">✕</IconButton>
                }
              >
                <ListItemText primary={c.name} secondary={c.slug} />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <WizardNav
        onNext={onNext}
        onBack={onBack}
        nextDisabled={items.length === 0}
      />
    </Box>
  );
};

export default CategorySetupStep;
