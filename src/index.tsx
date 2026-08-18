import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./context/auth-context";

ReactDOM.createRoot(document.getElementById("root")!).render(
  // react-router-dom ya figuraba entre las dependencias pero no se usaba: la
  // navegacion era un switch sobre un estado, asi que toda la aplicacion vivia
  // en "/" y no habia forma de enlazar a una seccion, compartir una URL ni
  // usar el boton atras del navegador.
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
