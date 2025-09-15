import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import OeconomiaDashboard from "./components/OeconomiaDashboard";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <OeconomiaDashboard />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
