import { SmartHomeProvider } from "@/hooks/use-smart-home";
import { AppShell } from "@/components/app-shell";

export default function Home() {
  return (
    <SmartHomeProvider>
      <AppShell />
    </SmartHomeProvider>
  );
}
