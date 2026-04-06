import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey, useLoginUser, useRegisterUser } from "@workspace/api-client-react";
import { useLocation } from "wouter";

export function useAuth() {
  const { data: user, isLoading, isFetching, status } = useGetMe({
    query: { 
      retry: false, 
      staleTime: 1000 * 60 * 5,
      throwOnError: false,
      enabled: !!localStorage.getItem("monjez_token"),
      queryKey: ['user'],
    }
  });
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const hasToken = !!localStorage.getItem("monjez_token");
  const actuallyLoading = hasToken && (isLoading || isFetching);

  const loginMutation = useLoginUser({
    mutation: {
      onSuccess: (data: any) => {
        localStorage.setItem("monjez_token", data.token);
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        setLocation(data.user.role === 'worker' ? '/worker' : '/employer');
      }
    }
  });

  const registerMutation = useRegisterUser({
    mutation: {
      onSuccess: (data: any, variables: any) => {
        loginMutation.mutate({ data: { phone: variables.data.phone, password: variables.data.password } });
      }
    }
  });

  const logout = () => {
    localStorage.removeItem("monjez_token");
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
    setLocation("/");
  };

  return { 
    user, 
    isLoading: actuallyLoading, 
    isAuthenticated: !!user, 
    logout, 
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending
  };
}
