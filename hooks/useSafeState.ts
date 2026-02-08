// hooks/useSafeState.ts

import { useState, useCallback } from 'react';
import { safeSync } from '@/lib/errorHandler';

export const useSafeState = <T>(initialValue: T) => {
  const [state, setState] = useState<T>(initialValue);
  
  const safeSetState = useCallback((value: T | ((prev: T) => T)) => {
    safeSync(() => {
      setState(value);
    }, 'Failed to update state');
  }, []);

  return [state, safeSetState] as const;
};