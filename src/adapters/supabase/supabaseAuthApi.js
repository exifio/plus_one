function authError(code, cause) {
  const error = new Error(code);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

export function createSupabaseAuthApi(supabase) {
  return {
    async getSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw authError('AUTH_SESSION_REQUEST_FAILED', error);
      return data?.session ?? null;
    },

    async getUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) throw authError('AUTH_USER_REQUEST_FAILED', error);
      return data.user;
    },

    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data?.session) throw authError('AUTH_SIGN_IN_FAILED', error);
      return data.session;
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw authError('AUTH_SIGN_OUT_FAILED', error);
    },

    onAuthStateChange(listener) {
      const { data, error } = supabase.auth.onAuthStateChange((event, session) => {
        listener(session, event);
      });
      if (error) throw authError('AUTH_SUBSCRIPTION_FAILED', error);
      return () => data?.subscription?.unsubscribe?.();
    },
  };
}
