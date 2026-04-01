import { useCompany } from '@/components/providers/CompanyProvider';

export function useIsReadOnly(): boolean {
  const { isDemo } = useCompany();
  return isDemo;
}
