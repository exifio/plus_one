import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export const ADMIN_NOT_AUTHORIZED = 'ADMIN_NOT_AUTHORIZED';

export async function isAdminUser(userId: string): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message || '관리자 권한을 확인하지 못했습니다.');
  }
  return data !== null;
}

export async function signInAdmin(email: string, password: string): Promise<void> {
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(error?.message || '이메일 또는 비밀번호를 확인해주세요.');
  }

  try {
    if (!(await isAdminUser(data.user.id))) {
      throw new Error(ADMIN_NOT_AUTHORIZED);
    }
  } catch (membershipError) {
    await supabase.auth.signOut();
    throw membershipError;
  }
}

export async function signOutAdmin(): Promise<void> {
  if (!supabase) {
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message || '로그아웃하지 못했습니다.');
  }
}

export async function getAdminSession(): Promise<Session | null> {
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message || '로그인 상태를 확인하지 못했습니다.');
  }
  if (!data.session?.user) {
    return null;
  }
  if (!(await isAdminUser(data.session.user.id))) {
    await supabase.auth.signOut();
    return null;
  }
  return data.session;
}

export function subscribeToAuthChanges(
  onSessionChange: (session: Session | null) => void,
): () => void {
  if (!supabase) {
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onSessionChange(session);
  });
  return () => data.subscription.unsubscribe();
}
