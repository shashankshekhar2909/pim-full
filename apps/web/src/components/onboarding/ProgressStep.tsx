import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Chip,
} from '@mui/material';
import { importsApi } from '../../services/api';

interface Props {
  tenantId: string;
  importId: string;
  onFinish: () => void;
}

interface ImportStatus {
  status: string;
  totalRows: number | null;
  processedRows: number;
  failedRows: number;
  errors: { rowNumber: number; columnName?: string | null; errorType: string; errorMessage: string }[];
  errorCount: number;
}

const TERMINAL = new Set(['completed', 'failed']);

const ProgressStep: React.FC<Props> = ({ tenantId, importId, onFinish }) => {
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const tick = async () => {
      try {
        const { data } = await importsApi.get(tenantId, importId);
        const s = data.data as unknown as ImportStatus;
        setStatus(s);
        if (!TERMINAL.has(s.status)) {
          timer.current = window.setTimeout(tick, 1500);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to poll import status');
      }
    };
    void tick();
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [tenantId, importId]);

  if (!status) return <LinearProgress />;

  const total = status.totalRows ?? 0;
  const pct = total > 0 ? Math.round((status.processedRows / total) * 100) : 0;
  const terminal = TERMINAL.has(status.status);

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          label={status.status}
          color={status.status === 'completed' ? 'success' : status.status === 'failed' ? 'error' : 'info'}
        />
        <Typography variant="body2" color="text.secondary">
          {status.processedRows} processed · {status.failedRows} failed{total ? ` · ${total} total` : ''}
        </Typography>
      </Box>

      <LinearProgress
        variant={total > 0 ? 'determinate' : 'indeterminate'}
        value={pct}
        sx={{ mb: 3, height: 8, borderRadius: 1 }}
      />

      {status.errors.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Errors ({status.errorCount} total, showing first {status.errors.length})
          </Typography>
          <Paper variant="outlined" sx={{ maxHeight: 280, overflow: 'auto', mb: 3 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  <TableCell>Column</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {status.errors.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell>{e.rowNumber}</TableCell>
                    <TableCell>{e.columnName ?? '—'}</TableCell>
                    <TableCell>{e.errorType}</TableCell>
                    <TableCell>{e.errorMessage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      {terminal && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={onFinish}>Finish</Button>
        </Box>
      )}
    </Box>
  );
};

export default ProgressStep;
