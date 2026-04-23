import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WizardNav from './WizardNav';

describe('WizardNav', () => {
  it('renders default labels', () => {
    render(<WizardNav onNext={() => {}} onBack={() => {}} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('fires onNext/onBack', async () => {
    const onNext = vi.fn();
    const onBack = vi.fn();
    render(<WizardNav onNext={onNext} onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onNext).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('disables next while loading and shows spinner', () => {
    render(<WizardNav onNext={() => {}} loading />);
    expect(screen.getByRole('button', { name: /./ })).toBeDisabled();
  });

  it('hides back button when showBack=false', () => {
    render(<WizardNav onNext={() => {}} showBack={false} />);
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
  });

  it('honors custom labels', () => {
    render(<WizardNav onNext={() => {}} nextLabel="Start import" backLabel="Back" />);
    expect(screen.getByRole('button', { name: 'Start import' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });
});
