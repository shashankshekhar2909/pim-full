import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Stack,
  MenuItem,
  TextField,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  LinearProgress,
  Collapse,
} from '@mui/material';
import { categoriesApi, importsApi } from '../../services/api';
import type { ImportUploadResult } from '../../services/api';
import type { Category } from '@pim/types';
import WizardNav from './WizardNav';

export interface UploadSnapshot {
  importId: string;
  categoryId: string;
  mapping: Record<string, string>;
  preview: ImportUploadResult['preview'];
}

interface Props {
  tenantId: string;
  onNext: (snapshot: UploadSnapshot) => void;
  onBack?: () => void;
  showBack?: boolean;
}

const TARGET_FIELDS = [
  { value: '', label: '— skip column —' },
  { value: 'skuCode', label: 'SKU code (required)' },
  { value: 'name', label: 'Name (required)' },
  { value: 'description', label: 'Description' },
  { value: 'pricing.price', label: 'Price' },
  { value: 'stockLevel', label: 'Stock level' },
];

const CsvUploadStep: React.FC<Props> = ({ tenantId, onNext, onBack, showBack = true }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ImportUploadResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await categoriesApi.list(tenantId);
    const list = (data.data as unknown as Category[]) ?? [];
    setCategories(list);
    if (list[0] && !categoryId) setCategoryId(list[0].id);
  }, [tenantId, categoryId]);

  useEffect(() => { void loadCategories(); }, [loadCategories]);

  const createCategory = async () => {
    if (!tenantId || !newCatName.trim()) return;
    setCreatingCat(true); setError(null);
    try {
      const { data } = await categoriesApi.create(tenantId, { name: newCatName.trim() });
      setNewCatName('');
      setShowNewCat(false);
      await loadCategories();
      // Select the newly created category
      const newId = (data.data as unknown as Category).id;
      if (newId) setCategoryId(newId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create category');
    } finally {
      setCreatingCat(false);
    }
  };

  const upload = async () => {
    if (!tenantId || !file) return;
    setUploading(true); setError(null);
    try {
      const { data } = await importsApi.upload(tenantId, file);
      setUploadResult(data.data);
      setMapping(data.data.suggestedMapping);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally { setUploading(false); }
  };

  const proceed = () => {
    if (!uploadResult || !categoryId) return;
    // Ensure required mappings exist
    const targets = new Set(Object.values(mapping));
    if (!targets.has('skuCode') || !targets.has('name')) {
      setError('Map at least skuCode and name columns before continuing');
      return;
    }
    onNext({
      importId: uploadResult.id,
      categoryId,
      mapping,
      preview: uploadResult.preview,
    });
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload your SKU data as CSV, XLS, or XLSX. We'll preview and let you map columns before importing.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
        <TextField
          select size="small" label="Category" value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          {categories.map((c) => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
        </TextField>
        <Button size="small" onClick={() => setShowNewCat((v) => !v)}>
          {showNewCat ? 'Cancel' : '+ New category'}
        </Button>
        <Button variant="outlined" component="label">
          {file ? file.name : 'Choose file (CSV / XLSX)'}
          <input
            type="file" accept=".csv,.xls,.xlsx" hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Button>
        <Button variant="contained" onClick={upload} disabled={!file || !categoryId || uploading}>
          Upload & preview
        </Button>
      </Stack>

      <Collapse in={showNewCat}>
        <Stack direction="row" spacing={1} sx={{ mb: 2, mt: 1 }}>
          <TextField
            size="small" label="New category name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <Button variant="contained" onClick={createCategory} disabled={creatingCat || !newCatName.trim()}>
            Create
          </Button>
        </Stack>
      </Collapse>

      {uploading && <LinearProgress sx={{ mb: 2 }} />}

      {uploadResult && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {uploadResult.preview.estimatedRowCount} rows detected. Map columns:
          </Typography>
          <Paper variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>CSV column</TableCell>
                  <TableCell>Map to</TableCell>
                  <TableCell>Preview (first row)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {uploadResult.preview.headers.map((h) => (
                  <TableRow key={h}>
                    <TableCell>{h}</TableCell>
                    <TableCell>
                      <TextField
                        select size="small" fullWidth
                        value={mapping[h] ?? ''}
                        onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                      >
                        {TARGET_FIELDS.map((f) => (<MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>))}
                        <MenuItem value={`attr:${h}`}>Attribute: {h}</MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell>{uploadResult.preview.rows[0]?.[h] ?? ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      <WizardNav
        onNext={proceed}
        onBack={onBack}
        showBack={showBack}
        nextDisabled={!uploadResult}
      />
    </Box>
  );
};

export default CsvUploadStep;
