import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api.js";

export function useAuth() {
  const [state, setState] = useState({ loading: true, user: null, prefs: null });

  const refresh = useCallback(async () => {
    try {
      const data = await api.me();
      setState({ loading: false, user: data.user, prefs: data.prefs });
    } catch (err) {
      setState({ loading: false, user: null, prefs: null });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await api.authLogout();
    } catch {}
    setState({ loading: false, user: null, prefs: null });
  }, []);

  return { ...state, refresh, signOut };
}
