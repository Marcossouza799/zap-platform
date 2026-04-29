import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import FlowEditor from "./pages/FlowEditor";
import FlowList from "./pages/FlowList";
import Kanban from "./pages/Kanban";
import Inbox from "./pages/Inbox";
import Settings from "./pages/Settings";
import Connections from "./pages/Connections";
import FlowMonitor from "./pages/FlowMonitor";
import AppLayout from "./components/AppLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/app" component={() => <AppLayout><Dashboard /></AppLayout>} />
      <Route path="/app/inbox" component={() => <AppLayout><Inbox /></AppLayout>} />
      <Route path="/app/contacts" component={() => <AppLayout><Contacts /></AppLayout>} />
      <Route path="/app/flows" component={() => <AppLayout><FlowList /></AppLayout>} />
      <Route path="/app/flows/:id" component={({ params }) => <AppLayout><FlowEditor flowId={Number(params.id)} /></AppLayout>} />
      <Route path="/app/kanban" component={() => <AppLayout><Kanban /></AppLayout>} />
      <Route path="/app/connections" component={() => <AppLayout><Connections /></AppLayout>} />
      <Route path="/app/monitor" component={() => <AppLayout><FlowMonitor /></AppLayout>} />
      <Route path="/app/settings" component={() => <AppLayout><Settings /></AppLayout>} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
