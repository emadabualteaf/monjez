import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthPage } from "@/pages/auth";
import { WorkerFeed, WorkerApplications } from "@/pages/worker";
import { EmployerDashboard, PostJob, JobDetail } from "@/pages/employer";
import { CreditsPage, ProfilePage } from "@/pages/shared";
import { VerifyPhonePage } from "@/pages/verify-phone";
import { AdminDashboard } from "@/pages/admin";
import { TermsPage, PrivacyPage } from "@/pages/legal";
import { AppLayout } from "@/components/layout";
import { I18nProvider } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    }
  }
});

const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const token = localStorage.getItem('monjez_token');
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return originalFetch(input, { ...init, headers });
};

function ProtectedRoute({ component: Component, allowedRole, requireVerified, adminOnly }: {
  component: any;
  allowedRole?: 'worker' | 'employer';
  requireVerified?: boolean;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (!user) return <Redirect to="/" />;

  if (allowedRole && user.role !== allowedRole) {
    return <Redirect to={user.role === 'worker' ? '/worker' : '/employer'} />;
  }

  if (requireVerified && !user.phoneVerified) {
    return <Redirect to="/verify-phone" />;
  }

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">منجز</p>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <Switch>
        <Route path="/">
          {user ? <Redirect to={user.role === 'worker' ? '/worker' : '/employer'} /> : <AuthPage />}
        </Route>

        {/* Worker Routes */}
        <Route path="/worker">
          <ProtectedRoute component={WorkerFeed} allowedRole="worker" />
        </Route>
        <Route path="/worker/applications">
          <ProtectedRoute component={WorkerApplications} allowedRole="worker" />
        </Route>

        {/* Employer Routes */}
        <Route path="/employer">
          <ProtectedRoute component={EmployerDashboard} allowedRole="employer" />
        </Route>
        <Route path="/employer/post">
          <ProtectedRoute component={PostJob} allowedRole="employer" requireVerified={true} />
        </Route>
        <Route path="/employer/jobs/:id">
          {(params) => <ProtectedRoute component={() => <JobDetail params={params} />} allowedRole="employer" />}
        </Route>

        {/* Phone Verification */}
        <Route path="/verify-phone">
          <ProtectedRoute component={VerifyPhonePage} />
        </Route>

        {/* Admin */}
        <Route path="/admin">
          <ProtectedRoute component={AdminDashboard} />
        </Route>

        {/* Shared Routes */}
        <Route path="/credits">
          <ProtectedRoute component={CreditsPage} />
        </Route>
        <Route path="/profile">
          <ProtectedRoute component={ProfilePage} />
        </Route>

        {/* Legal Pages (public) */}
        <Route path="/terms" component={TermsPage} />
        <Route path="/privacy" component={PrivacyPage} />

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
