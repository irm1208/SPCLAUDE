import { useState, useEffect } from 'react';

export function useRateLimit(maxAttempts = 5, lockoutMinutes = 5) {
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  useEffect(() => {
    // Check local storage for persistent lockout
    const storedLockout = localStorage.getItem('peps_lockout');
    if (storedLockout) {
      const time = parseInt(storedLockout, 10);
      if (Date.now() < time) {
        setLockoutUntil(time);
      } else {
        localStorage.removeItem('peps_lockout');
      }
    }
  }, []);

  const recordAttempt = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    if (newAttempts >= maxAttempts) {
      const lockTime = Date.now() + lockoutMinutes * 60 * 1000;
      setLockoutUntil(lockTime);
      localStorage.setItem('peps_lockout', lockTime.toString());
      setAttempts(0); // reset attempts for next time
    }
  };

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;
  
  let remainingMinutes = 0;
  if (isLockedOut && lockoutUntil) {
    remainingMinutes = Math.ceil((lockoutUntil - Date.now()) / 60000);
  }

  return {
    recordAttempt,
    isLockedOut,
    remainingMinutes,
    reset: () => {
      setAttempts(0);
      setLockoutUntil(null);
      localStorage.removeItem('peps_lockout');
    }
  };
}
