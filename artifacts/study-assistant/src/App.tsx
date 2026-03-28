import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
          <h1 className="text-6xl font-serif font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-serif text-foreground mb-6">Page Not Found</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <a 
            href="/" 
            className="inline-flex items-center justify-center h-11 px-8 rounded-xl bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            Return Home
          </a>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
