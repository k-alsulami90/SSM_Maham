import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AppStoreProvider } from "./store/AppStore.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { AuthProvider } from "./auth/AuthProvider.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppStoreProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AppStoreProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
