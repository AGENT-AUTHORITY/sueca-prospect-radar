import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { App } from "./App";
import { LanguageProvider } from "./lib/i18n";
import { AuthProvider } from "./lib/auth";
import { AuthGate } from "./components/LoginGate";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <AuthGate>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthGate>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>
);
