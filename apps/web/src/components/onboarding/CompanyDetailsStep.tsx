import React, { useState } from 'react';
import { Box, TextField, Stack, Alert, Typography, MenuItem } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store';
import { setCompanyDetails, setTenantId, setError } from '../../store/slices/onboardingSlice';
import { tenantsApi } from '../../services/api';
import WizardNav from './WizardNav';

const INDUSTRIES = ['Retail', 'Manufacturing', 'Electronics', 'Fashion', 'Food & Beverage', 'Other'];
const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata'];

interface Props {
  onNext: () => void;
}

const CompanyDetailsStep: React.FC<Props> = ({ onNext }) => {
  const dispatch = useAppDispatch();
  const { companyDetails, tenantId, error } = useAppSelector((s) => s.onboarding);
  const [form, setForm] = useState({
    name: companyDetails.name ?? '',
    slug: companyDetails.slug ?? '',
    industry: companyDetails.industry ?? 'Retail',
    timezone: companyDetails.timezone ?? 'UTC',
    locale: companyDetails.locale ?? 'en-US',
    adminEmail: companyDetails.adminEmail ?? '',
    adminPassword: companyDetails.adminPassword ?? '',
    adminFirstName: companyDetails.adminFirstName ?? '',
    adminLastName: companyDetails.adminLastName ?? '',
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleNext = async () => {
    dispatch(setError(null));
    if (!form.name || !form.adminEmail || !form.adminPassword) {
      dispatch(setError('Company name, admin email, and password are required'));
      return;
    }
    dispatch(setCompanyDetails(form));

    // If tenant not yet created, create it now.
    if (!tenantId) {
      setSubmitting(true);
      try {
        const { data } = await tenantsApi.create({
          name: form.name,
          slug: form.slug || undefined,
          config: { timezone: form.timezone, locale: form.locale },
          adminUser: {
            email: form.adminEmail,
            password: form.adminPassword,
            firstName: form.adminFirstName,
            lastName: form.adminLastName,
          },
        });
        dispatch(setTenantId(data.data.id));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to create tenant';
        dispatch(setError(msg));
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }
    onNext();
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Tell us about your company and create the first admin account.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack spacing={2}>
        <TextField label="Company name" value={form.name} onChange={update('name')} required fullWidth />
        <TextField
          label="Slug"
          value={form.slug}
          onChange={update('slug')}
          helperText="URL-safe identifier (auto-generated if empty)"
          fullWidth
        />
        <Stack direction="row" spacing={2}>
          <TextField select label="Industry" value={form.industry} onChange={update('industry')} fullWidth>
            {INDUSTRIES.map((i) => (<MenuItem key={i} value={i}>{i}</MenuItem>))}
          </TextField>
          <TextField select label="Timezone" value={form.timezone} onChange={update('timezone')} fullWidth>
            {TIMEZONES.map((t) => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
          </TextField>
        </Stack>
        <Typography variant="subtitle2" sx={{ mt: 2 }}>Admin user</Typography>
        <Stack direction="row" spacing={2}>
          <TextField label="First name" value={form.adminFirstName} onChange={update('adminFirstName')} fullWidth />
          <TextField label="Last name" value={form.adminLastName} onChange={update('adminLastName')} fullWidth />
        </Stack>
        <TextField type="email" label="Admin email" value={form.adminEmail} onChange={update('adminEmail')} required fullWidth />
        <TextField type="password" label="Admin password" value={form.adminPassword} onChange={update('adminPassword')} required fullWidth />
      </Stack>
      <WizardNav onNext={handleNext} nextLabel={tenantId ? 'Next' : 'Create tenant & continue'} loading={submitting} />
    </Box>
  );
};

export default CompanyDetailsStep;
