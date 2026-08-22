import { useCallback, useEffect, useState } from "react";

export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  const run = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await fn();
      setState({ loading: false, error: "", data });
      return data;
    } catch (error) {
      setState({ loading: false, error: error.message || "Something went wrong", data: null });
      throw error;
    }
  }, deps);

  useEffect(() => {
    run().catch(() => {});
  }, [run]);

  return { ...state, run };
}
