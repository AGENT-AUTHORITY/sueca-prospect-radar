import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Prospecting } from "./pages/Prospecting";
import { Prospects } from "./pages/Prospects";
import { Territory } from "./pages/Territory";
import { Pipeline } from "./pages/Pipeline";
import { SearchRuns } from "./pages/SearchRuns";
import { SettingsPage } from "./pages/Settings";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="prospecting" element={<Prospecting />} />
        <Route path="prospects" element={<Prospects />} />
        <Route path="territory" element={<Territory />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="runs" element={<SearchRuns />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
