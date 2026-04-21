import React from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Button,
  CircularProgress,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../store';
import { nextStep, prevStep } from '../store/slices/onboardingSlice';
import type { OnboardingStep } from '../store/slices/onboardingSlice';

const STEP_LABELS: Record<OnboardingStep, string> = {
  'company-details': 'Company Details',
  'category-setup': 'Category Setup',
  'attribute-definition': 'Attributes',
  'csv-upload': 'Upload Data',
  review: 'Review',
  progress: 'Import Progress',
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
  const { currentStep, isSubmitting } = useAppSelector((state) => state.onboarding);
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Set Up Your Workspace
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Follow the steps below to configure your product catalogue and import your data.
      </Typography>

      <Stepper activeStep={currentIndex} sx={{ mb: 4 }}>
        {STEPS.map((step) => (
          <Step key={step}>
            <StepLabel>{STEP_LABELS[step]}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography variant="h5" fontWeight={600} gutterBottom>
          {STEP_LABELS[currentStep]}
        </Typography>

        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body1" color="text.disabled" textAlign="center">
            The full onboarding wizard — including company details form, category tree builder,
            attribute definition, CSV upload with column mapping, and import progress tracking — is
            coming in Phase 2.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => dispatch(prevStep())}
            disabled={currentIndex === 0 || isSubmitting}
          >
            Previous
          </Button>
          <Button
            variant="contained"
            onClick={() => dispatch(nextStep())}
            disabled={currentIndex === STEPS.length - 1 || isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Next'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default OnboardingPage;
