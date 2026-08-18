import React from "react";
import { createRoot } from "react-dom/client";
import BibliotheksNavigator from "./BibliotheksNavigator.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BibliotheksNavigator />
  </React.StrictMode>
);
