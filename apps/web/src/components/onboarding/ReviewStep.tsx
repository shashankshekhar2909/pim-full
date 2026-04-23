import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Alert, Divider } from '@mui/material';
import { useAppSelector } from '../../store';
import { importsApi } from '../../services/api';
import WizardNav from './WizardNav';
import type { UploadSnapshot } from './CsvUploadStep';

interface Props {
  tenantId: string;
  snapshot: UploadSnapshot;
  onNext: () => void;
  onBack: () => void;
  showCompany?: boolean;
}

const ReviewStep: React.FC<Props> = ({ tenantId, snapshot, onNext, onBack, showCompany = true }) => {
  const company = useAppSelector((s) => s.onboarding.companyDetails);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'done'>('idle');

  const runValidateAndProcess = async () => {
    if (!tenantId) return;
    setSubmitting(true); setError(null); setValidationStatus('validating');
    try {
      await importsApi.validate(tenantId, snapshot.importId, {
        categoryId: snapshot.categoryId,
        mapping: snapshot.mapping,
      });

      // Poll until validated (or validation_failed)
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const { data } = await importsApi.get(tenantId, snapshot.importId);
        if (data.data.status === 'validated') break;
        if (data.data.status === 'validation_failed') {
          setError(`Validation failed: ${data.data.errorCount} errors. You can skip invalid rows on the next step.`);
          break;
        }
      }
      setValidationStatus('done');

      await importsApi.process(tenantId, snapshot.importId, { skipInvalid: true });
      onNext();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start import');
    } finally {
      setSubmitting(false);
    }
  };

  const mappedCols = Object.entries(snapshot.mapping).filter(([, v]) => v);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Review and confirm before starting the import.
      </Typography>
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          {showCompany && (
            <>
              <Row label="Company" value={company.name ?? '—'} />
              <Row label="Admin" value={company.adminEmail ?? '—'} />
              <Divider />
            </>
          )}
          <Row label="Import ID" value={snapshot.importId} />
          <Row label="Rows to import" value={String(snapshot.preview.estimatedRowCount)} />
          <Row label="Columns mapped" value={`${mappedCols.length} / ${snapshot.preview.headers.length}`} />
        </Stack>
      </Paper>

      {validationStatus === 'validating' && (
        <Alert severity="info" sx={{ mt: 2 }}>Validating CSV…</Alert>
      )}

      <WizardNav
        onNext={runValidateAndProcess}
        onBack={onBack}
        loading={submitting}
        nextLabel="Start import"
      />
    </Box>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between">
    <Typography color="text.secondary">{label}</Typography>
    <Typography fontWeight={500}>{value}</Typography>
  </Stack>
);

export default ReviewStep;
