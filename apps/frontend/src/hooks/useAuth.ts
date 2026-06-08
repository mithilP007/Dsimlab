import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const navigate = useNavigate();
  const { user, isAuthenticated, fetchMe } = useAuthStore();

  useEffect(() => {
    const verifySession = async () => {
      const currentUser = await fetchMe();
      if (!currentUser) {
        // Redirect to login if unauthenticated
        if (window.location.pathname !== '/login' && window.location.pathname !== '/landing') {
          navigate('/login', { replace: true });
        }
        return;
      }

      // Role-based redirection as per step 3 instructions
      if (currentUser.role === 'individual') {
        navigate('/dashboard/individual', { replace: true });
      } else if (currentUser.role === 'student-college') {
        navigate('/dashboard/student', { replace: true });
      } else if (currentUser.role === 'instructor') {
        navigate('/dashboard/instructor', { replace: true });
      }
    };

    verifySession();
  }, [fetchMe, navigate]);

  return { user, isAuthenticated };
}

export default useAuth;
