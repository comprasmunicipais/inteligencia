'use server';

import { adminService, Company, UserProfile } from '@/lib/services/admin';
import { revalidatePath } from 'next/cache';

export async function getCompaniesAction() {
  return await adminService.getCompanies();
}

export async function createCompanyAction(company: Partial<Company>) {
  const result = await adminService.createCompany(company);
  revalidatePath('/admin/companies');

  // Disparar sync do PNCP para a nova empresa em background (fire and forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.comprasmunicipais.com.br';
  fetch(`${appUrl}/api/pncp/sync?company_id=${result.id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    cache: 'no-store',
  }).catch(() => {});

  return result;
}

export async function updateCompanyAction(id: string, company: Partial<Company>) {
  const result = await adminService.updateCompany(id, company);
  revalidatePath('/admin/companies');
  return result;
}

export async function getUsersAction() {
  return await adminService.getUsers();
}

export async function updateUserRoleAction(id: string, role: string) {
  const result = await adminService.updateUserRole(id, role);
  revalidatePath('/admin/users');
  return result;
}

export async function updateUserStatusAction(id: string, status: string) {
  const result = await adminService.updateUserStatus(id, status);
  revalidatePath('/admin/users');
  return result;
}
