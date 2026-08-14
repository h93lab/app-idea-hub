import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AIWorkspace from "@/pages/AIWorkspace";
import Compare from "@/pages/Compare";
import IdeaDetail from "@/pages/IdeaDetail";
import Ideas from "@/pages/Ideas";
import PersonalStudio from "@/pages/PersonalStudio";
import NotFound from "@/pages/NotFound";
import Scraper from "@/pages/Scraper";
import Settings from "@/pages/Settings";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/ideas" component={Ideas} />
    <Route path="/ideas/:id" component={IdeaDetail} />
    <Route path="/compare" component={Compare} />
    <Route path="/studio" component={PersonalStudio} />
    <Route path="/scraper" component={Scraper} />
    <Route path="/ai" component={AIWorkspace} />
    <Route path="/settings" component={Settings} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <ErrorBoundary>
        <ThemeProvider defaultTheme="amoled" switchable>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ThemeProvider>
  </ErrorBoundary>;
}

export default App;
