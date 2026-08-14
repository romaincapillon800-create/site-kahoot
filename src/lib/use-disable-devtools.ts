"use client";

import { useEffect } from "react";

export function useDisableDevtools() {
  useEffect(() => {
    let devtoolsOpen = false;
    let checkInterval: NodeJS.Timeout | null = null;

    // Détecter les DevTools via la taille de la fenêtre
    const checkDevTools = () => {
      const threshold = 160;
      const isOpen =
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold;

      if (isOpen && !devtoolsOpen) {
        devtoolsOpen = true;
        console.clear();
        handleDevtoolsDetected();
      } else if (!isOpen && devtoolsOpen) {
        devtoolsOpen = false;
      }
    };

    // Handler quand les DevTools sont détectés
    const handleDevtoolsDetected = () => {
      // Fermer les DevTools en rechargant la page avec une redirection
      console.clear();
      window.location.href = window.location.href;
    };

    // Bloquer les raccourcis clavier
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+I ou Cmd+Option+I (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+J ou Cmd+Option+J (DevTools console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "J") {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+C ou Cmd+Option+C (Inspect element)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        return false;
      }

      // Cmd+Option+U (Mac View Source)
      if (e.metaKey && e.altKey && e.key === "u") {
        e.preventDefault();
        return false;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        return false;
      }

      // Cmd+Option+C (Mac Inspect)
      if (e.metaKey && e.altKey && e.key === "c") {
        e.preventDefault();
        return false;
      }

      // Cmd+Option+I (Mac DevTools)
      if (e.metaKey && e.altKey && e.key === "i") {
        e.preventDefault();
        return false;
      }

      // Cmd+Option+J (Mac Console)
      if (e.metaKey && e.altKey && e.key === "j") {
        e.preventDefault();
        return false;
      }
    };

    // Bloquer le clic droit et l'inspect
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Ajouter protection supplémentaire
    const disableConsole = () => {
      Object.defineProperty(window, "console", {
        get() {
          throw new Error("Console accès refusé");
        },
      });
    };

    // Protéger contre le debugger
    const protectDebugger = () => {
      setInterval(() => {
        eval("debugger");
      }, 1000);
    };

    // Ajouter les event listeners
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);

    // Vérifier les DevTools toutes les secondes
    checkInterval = setInterval(checkDevTools, 1000);

    // Initial check
    checkDevTools();

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);
}
