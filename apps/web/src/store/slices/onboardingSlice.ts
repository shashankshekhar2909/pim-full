import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type OnboardingStep =
  | 'company-details'
  | 'category-setup'
  | 'attribute-definition'
  | 'csv-upload'
  | 'review'
  | 'progress';

interface CompanyDetails {
  name: string;
  slug: string;
  industry: string;
  contactEmail: string;
  logoUrl?: string;
  timezone: string;
  locale: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  companyDetails: Partial<CompanyDetails>;
  tenantId: string | null;
  isSubmitting: boolean;
  error: string | null;
}

const STEP_ORDER: OnboardingStep[] = [
  'company-details',
  'category-setup',
  'attribute-definition',
  'csv-upload',
  'review',
  'progress',
];

const initialState: OnboardingState = {
  currentStep: 'company-details',
  completedSteps: [],
  companyDetails: {},
  tenantId: null,
  isSubmitting: false,
  error: null,
};

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    setStep(state, action: PayloadAction<OnboardingStep>) {
      state.currentStep = action.payload;
    },
    nextStep(state) {
      const currentIndex = STEP_ORDER.indexOf(state.currentStep);
      if (currentIndex < STEP_ORDER.length - 1) {
        if (!state.completedSteps.includes(state.currentStep)) {
          state.completedSteps.push(state.currentStep);
        }
        state.currentStep = STEP_ORDER[currentIndex + 1];
      }
    },
    prevStep(state) {
      const currentIndex = STEP_ORDER.indexOf(state.currentStep);
      if (currentIndex > 0) {
        state.currentStep = STEP_ORDER[currentIndex - 1];
      }
    },
    setCompanyDetails(state, action: PayloadAction<Partial<CompanyDetails>>) {
      state.companyDetails = { ...state.companyDetails, ...action.payload };
    },
    setTenantId(state, action: PayloadAction<string>) {
      state.tenantId = action.payload;
    },
    setSubmitting(state, action: PayloadAction<boolean>) {
      state.isSubmitting = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    resetOnboarding() {
      return initialState;
    },
  },
});

export const {
  setStep,
  nextStep,
  prevStep,
  setCompanyDetails,
  setTenantId,
  setSubmitting,
  setError,
  resetOnboarding,
} = onboardingSlice.actions;

export { STEP_ORDER };
export default onboardingSlice.reducer;
