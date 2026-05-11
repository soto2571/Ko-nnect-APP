import { getServiceClient } from './supabase.ts';

/**
 * Returns true if userId is the owner of businessId,
 * OR is an active employee with a role where isAdmin = true.
 */
export async function isAdminOrOwner(userId: string, businessId: string): Promise<boolean> {
  const sb = getServiceClient();

  const { data: user } = await sb
    .from('users')
    .select('role, businessId')
    .eq('userId', userId)
    .single();

  if (user?.role === 'owner' && user?.businessId === businessId) return true;

  const { data: emp } = await sb
    .from('employees')
    .select('roleId')
    .eq('userId', userId)
    .eq('businessId', businessId)
    .is('deletedAt', null)
    .single();

  if (!emp?.roleId) return false;

  const { data: role } = await sb
    .from('business_roles')
    .select('isAdmin')
    .eq('roleId', emp.roleId)
    .single();

  return role?.isAdmin === true;
}

/**
 * Returns the businessId for a user if they are the owner, or the
 * businessId of the business they belong to as an employee.
 */
export async function getUserBusinessId(userId: string): Promise<string | null> {
  const sb = getServiceClient();
  const { data } = await sb
    .from('users')
    .select('businessId')
    .eq('userId', userId)
    .single();
  return data?.businessId ?? null;
}
