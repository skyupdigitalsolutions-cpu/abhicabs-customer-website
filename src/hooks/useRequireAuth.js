import { useEffect, useState } from "react";
import { navigate } from "vike/client/router";
import { isAuthenticated } from "../api/tokens";

export function useRequireAuth(redirectTo = "/login") {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed]   = useState(false);

  useEffect(() => {
    // Only runs in the browser — never during SSR
    const ok = isAuthenticated();
    setAuthed(ok);
    setChecked(true);
    if (!ok) {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(
          "abhicabs_login_return",
          window.location.pathname + window.location.search
        );
      }
      navigate(redirectTo);
    }
  }, [redirectTo]);

  return { authed, checked };
}