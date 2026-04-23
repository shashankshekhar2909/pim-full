import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../store';
import {
  nextStep,
  prevStep,
  resetOnboarding,
} from '../store/slices/onboardingSlice';
import type { OnboardingStep } from '../store/slices/onboardingSlice';
import CompanyDetailsStep from '../components/onboarding/CompanyDetailsStep';
import CategorySetupStep from '../components/onboarding/CategorySetupStep';
import AttributeDefinitionStep from '../components/onboarding/AttributeDefinitionStep';
import CsvUploadStep from '../components/onboarding/CsvUploadStep';
import type { UploadSnapshot } from '../components/onboarding/CsvUploadStep';
import ReviewStep from '../components/onboarding/ReviewStep';
import ProgressStep from '../components/onboarding/ProgressStep';

const STEP_LABELS: Record<OnboardingStep, string> = {
  'company-details': 'Company',
  'category-setup': 'Categories',
  'attribute-definition': 'Attributes',
  'csv-upload': 'Upload CSV',
  review: 'Review',
  progress: 'Progress',
};

const STEPS: OnboardingStep[] = [
  'company-details',
  'category-setup',
  'attribute-definition',
  'csv-upload',
  'review',
  'progress',
];

const OnboardingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentStep = useAppSelector((s) => s.onboarding.currentStep);
  const tenantId = useAppSelector((s) => s.onboarding.tenantId);
  const currentIndex = STEPS.indexOf(currentStep);
  const [snapshot, setSnapshot] = useState<UploadSnapshot | null>(null);

  const goNext = () => dispatch(nextStep());
  const goBack = () => dispatch(prevStep());

  const renderStep = () => {
    switch (currentStep) {
      case 'company-details':
        return <CompanyDetailsStep onNext={goNext} />;
      case 'category-setup':
        return <CategorySetupStep onNext={goNext} onBack={goBack} />;
      case 'attribute-definition':
        return <AttributeDefinitionStep onNext={goNext} onBack={goBack} />;
      case 'csv-upload':
        return tenantId
          ? <CsvUploadStep tenantId={tenantId} onNext={(s) => { setSnapshot(s); goNext(); }} onBack={goBack} />
          : <Typography color="error">No tenant — please complete step 1 first.</Typography>;
      case 'review':
        return snapshot && tenantId
          ? <ReviewStep tenantId={tenantId} snapshot={snapshot} onNext={goNext} onBack={goBack} />
          : <Typography color="error">No upload snapshot — please go back and re-upload.</Typography>;
      case 'progress':
        return snapshot && tenantId
          ? <ProgressStep
              tenantId={tenantId}
              importId={snapshot.importId}
              onFinish={() => { dispatch(resetOnboarding()); navigate('/'); }}
            />
          : <Typography color="error">Missing import context.</Typography>;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Set Up Your Workspace</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Follow the steps to configure your catalogue and import your data.
      </Typography>

      <Stepper activeStep={currentIndex} sx={{ mb: 4 }} alternativeLabel>
        {STEPS.map((s) => (<Step key={s}><StepLabel>{STEP_LABELS[s]}</StepLabel></Step>))}
      </Stepper>

      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          minHeight: 320,
        }}
      >
        <Typography variant="h5" fontWeight={600} gutterBottom>
          {STEP_LABELS[currentStep]}
        </Typography>
        {renderStep()}
      </Paper>
    </Box>
  );
};

export default OnboardingPage;
