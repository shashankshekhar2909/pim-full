import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Stepper, Step, StepLabel, Paper, Alert } from '@mui/material';
import { useAppSelector } from '../store';
import CsvUploadStep from '../components/onboarding/CsvUploadStep';
import type { UploadSnapshot } from '../components/onboarding/CsvUploadStep';
import ReviewStep from '../components/onboarding/ReviewStep';
import ProgressStep from '../components/onboarding/ProgressStep';

type Step = 'upload' | 'review' | 'progress';
const STEPS: Step[] = ['upload', 'review', 'progress'];
const LABELS: Record<Step, string> = {
  upload: 'Upload & Map',
  review: 'Review',
  progress: 'Progress',
};

const ImportProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAppSelector((s) => s.auth.tenant);
  const [step, setStep] = useState<Step>('upload');
  const [snapshot, setSnapshot] = useState<UploadSnapshot | null>(null);

  if (!tenant) {
    return <Alert severity="warning">You must be logged in to a tenant to import products.</Alert>;
  }

  const renderStep = () => {
    switch (step) {
      case 'upload':
        return (
          <CsvUploadStep
            tenantId={tenant.id}
            showBack={false}
            onNext={(s) => { setSnapshot(s); setStep('review'); }}
          />
        );
      case 'review':
        return snapshot ? (
          <ReviewStep
            tenantId={tenant.id}
            snapshot={snapshot}
            showCompany={false}
            onBack={() => setStep('upload')}
            onNext={() => setStep('progress')}
          />
        ) : null;
      case 'progress':
        return snapshot ? (
          <ProgressStep
            tenantId={tenant.id}
            importId={snapshot.importId}
            onFinish={() => navigate('/search')}
          />
        ) : null;
    }
  };

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Import Products</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Upload a CSV, XLS, or XLSX file to add SKUs to <strong>{tenant.name}</strong>.
      </Typography>

      <Stepper activeStep={STEPS.indexOf(step)} sx={{ mb: 4 }} alternativeLabel>
        {STEPS.map((s) => (<Step key={s}><StepLabel>{LABELS[s]}</StepLabel></Step>))}
      </Stepper>

      <Paper
        elevation={0}
        sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2, minHeight: 320 }}
      >
        {renderStep()}
      </Paper>
    </Box>
  );
};

export default ImportProductsPage;
