import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import HeroAsciiOne from "./components/ui/hero-ascii-one";
import "./styles.css";

const rootElement = document.getElementById("zvlz-landing-root");

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <HeroAsciiOne />
    </StrictMode>
  );
}
