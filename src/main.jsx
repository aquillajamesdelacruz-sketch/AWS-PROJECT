import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";

import "./index.css";
import "./App.css";
import "./page/login.css";
import "./page/register.css";
import "./page/dashboard.css";
import "./component/Watchlist.css";
import "./component/Collection.css";
import "./component/DashboardHome.css";
import "./component/BoughtSavings.css";
import "./component/Settings.css";
import "./component/AddItemModal.css";
import "./styles/Theme.css";
import "./page/landing.css";
import "./styles/System.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
