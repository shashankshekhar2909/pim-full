import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Checkbox,
  MenuItem,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import { attributesApi, skusApi } from '../../services/api';
import type { AttributeDefinition, SkuAttribute } from '@pim/types';

interface Props {
  tenantId: string;
  skuId: string;
  categoryId: string;
  initialValues: SkuAttribute[];
  onChanged?: () => void;
}

// Current displayable string for an attribute value row
function valueToInput(a: SkuAttribute | undefined): string {
  if (!a) return '';
  if (a.value != null) return a.value;
  if (a.valueNumber != null) return String(a.valueNumber);
  if (a.valueDate != null) return String(a.valueDate).slice(0, 10);
  if (a.valueJson != null) return JSON.stringify(a.valueJson);
  return '';
}

const AttributesEditor: React.FC<Props> = ({ tenantId, skuId, categoryId, initialValues, onChanged }) => {
  const [defs, setDefs] = useState<AttributeDefinition[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [originals, setOriginals] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await attributesApi.list(tenantId, categoryId);
      const list = data.data ?? [];
      setDefs(list);

      const byAttrId = new Map(initialValues.map((v) => [v.attributeId, v]));
      const d: Record<string, string> = {};
      for (const def of list) d[def.id] = valueToInput(byAttrId.get(def.id));
      setDrafts(d);
      setOriginals({ ...d });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load attributes');
    } finally { setLoading(false); }
  }, [tenantId, categoryId, initialValues]);

  useEffect(() => { void load(); }, [load]);

  const setDraft = (attrId: string, value: string) =>
    setDrafts((d) => ({ ...d, [attrId]: value }));

  const save = async (def: AttributeDefinition) => {
    setSavingId(def.id); setError(null);
    try {
      const raw = drafts[def.id] ?? '';
      await skusApi.setAttribute(tenantId, skuId, def.id, raw === '' ? null : raw);
      setOriginals((o) => ({ ...o, [def.id]: raw }));
      onChanged?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setError(`${def.name}: ${msg}`);
    } finally { setSavingId(null); }
  };

  const reset = (def: AttributeDefinition) => {
    setDrafts((d) => ({ ...d, [def.id]: originals[def.id] ?? '' }));
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={20} /></Box>;
  }

  if (defs.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>Attributes</Typography>
        <Typography color="text.disabled">No attribute definitions for this category.</Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>Attributes</Typography>
      <Divider sx={{ mb: 2 }} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Table size="small">
        <TableBody>
          {defs.map((def) => {
            const draft = drafts[def.id] ?? '';
            const original = originals[def.id] ?? '';
            const dirty = draft !== original;

            return (
              <TableRow key={def.id}>
                <TableCell sx={{ width: 240, color: 'text.secondary', verticalAlign: 'middle' }}>
                  {def.name}
                  {def.isRequired && <span style={{ color: '#d32f2f' }}> *</span>}
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                    {def.type}
                  </Typography>
                </TableCell>
                <TableCell>
                  <AttributeInput def={def} value={draft} onChange={(v) => setDraft(def.id, v)} />
                </TableCell>
                <TableCell sx={{ width: 90, whiteSpace: 'nowrap' }}>
                  {dirty && (
                    <>
                      <IconButton
                        size="small"
                        color="primary"
                        disabled={savingId === def.id}
                        onClick={() => save(def)}
                        title="Save"
                      >
                        {savingId === def.id ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                      </IconButton>
                      <IconButton size="small" onClick={() => reset(def)} title="Revert">
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
};

const AttributeInput: React.FC<{
  def: AttributeDefinition;
  value: string;
  onChange: (v: string) => void;
}> = ({ def, value, onChange }) => {
  const t = def.type;

  if (t === 'boolean') {
    return (
      <Checkbox
        checked={value === 'true' || value === '1'}
        onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
      />
    );
  }

  if (t === 'integer' || t === 'decimal') {
    return (
      <TextField
        size="small" fullWidth type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputProps={t === 'integer' ? { step: 1 } : { step: 'any' }}
      />
    );
  }

  if (t === 'date') {
    return (
      <TextField
        size="small" fullWidth type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
    );
  }

  if (t === 'datetime') {
    return (
      <TextField
        size="small" fullWidth type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
    );
  }

  if (t === 'select') {
    const opts = ((def.options as { values?: string[] } | null)?.values) ?? [];
    return (
      <TextField
        select size="small" fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <MenuItem value="">—</MenuItem>
        {opts.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
      </TextField>
    );
  }

  if (t === 'longtext' || t === 'richtext' || t === 'json') {
    return (
      <TextField
        size="small" fullWidth multiline minRows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <TextField
      size="small" fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default AttributesEditor;
