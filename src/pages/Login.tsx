import React, { useState } from "react";
import { useAuth } from "../context/auth-context";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    try {
      // ✅ Mejor práctica: el componente NO hace fetch.
      // Llama al AuthProvider (que hace POST /auth/login y guarda token/user/allowed_modules).
      await login(email.trim(), password);

      toast.success("Acceso concedido", {
        description: "Sistema Sentinel en línea",
      });

      window.location.reload();
    } catch (err: any) {
      console.error("Login Error:", err);
      toast.error("No se pudo iniciar sesión", {
        description: String(err?.message ?? err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <style>{`
        /* Tipografías del sistema: sin descargas externas, para que la
           pantalla se vea igual aunque la red bloquee fuentes remotas. */
        .lg-root {
          --tinta:    #16202B;
          --suave:    #566676;
          --tenue:    #8494A4;
          --papel:    #EEF2F6;
          --tarjeta:  #FFFFFF;
          --borde:    #DCE3EA;
          --campo:    #F7F9FB;
          --acento:   #1B5FA8;
          --acento-2: #E8F0F8;
          --ok:       #1B7F5A;

          --sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          --mono: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace;

          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
          background: var(--papel);
          font-family: var(--sans);
          color: var(--tinta);
        }

        /* Retícula muy tenue: da textura sin ensuciar el blanco. */
        .lg-reticula {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(27, 95, 168, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(27, 95, 168, 0.045) 1px, transparent 1px);
          background-size: 46px 46px;
          pointer-events: none;
        }

        /* Halo claro detrás de la tarjeta, para separarla del fondo. */
        .lg-halo {
          position: absolute;
          top: 50%; left: 50%;
          width: 760px; height: 760px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, #FFFFFF 0%, rgba(255,255,255,0) 68%);
          pointer-events: none;
        }

        .lg-tarjeta {
          position: relative;
          width: 100%;
          max-width: 424px;
          background: var(--tarjeta);
          border: 1px solid var(--borde);
          border-radius: 14px;
          box-shadow:
            0 1px 2px rgba(22, 32, 43, 0.04),
            0 12px 32px rgba(22, 32, 43, 0.07),
            0 32px 64px rgba(22, 32, 43, 0.05);
          padding: 40px 38px 32px;
          animation: lgEntrada 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Filete superior: el único trazo de color fuerte de la pantalla. */
        .lg-tarjeta::before {
          content: '';
          position: absolute;
          top: -1px; left: 26px; right: 26px;
          height: 3px;
          border-radius: 0 0 3px 3px;
          background: linear-gradient(90deg, var(--acento), #4B93D4);
        }

        @keyframes lgEntrada {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }

        .lg-insignia {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-family: var(--mono);
          font-size: 10.5px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--ok);
          background: #E9F4EF;
          border: 1px solid #CDE7DC;
          border-radius: 999px;
          padding: 4px 11px 4px 9px;
          margin-bottom: 18px;
        }

        .lg-punto {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--ok);
          animation: lgLatido 2s ease-in-out infinite;
        }

        @keyframes lgLatido {
          0%, 100% { opacity: 1; }
          50%      { opacity: .25; }
        }

        .lg-titulo {
          font-size: 27px;
          font-weight: 680;
          letter-spacing: -.02em;
          line-height: 1.1;
          margin: 0 0 5px;
        }
        .lg-titulo span { color: var(--acento); }

        .lg-sub {
          margin: 0 0 28px;
          font-size: 14px;
          color: var(--suave);
        }

        .lg-form { display: flex; flex-direction: column; gap: 17px; }

        .lg-etiqueta {
          display: block;
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: .11em;
          text-transform: uppercase;
          color: var(--tenue);
          margin-bottom: 7px;
        }

        .lg-caja { position: relative; display: flex; align-items: center; }

        .lg-icono {
          position: absolute;
          left: 13px;
          display: flex;
          color: var(--tenue);
          pointer-events: none;
          transition: color .18s;
        }
        .lg-caja:focus-within .lg-icono { color: var(--acento); }

        .lg-input {
          width: 100%;
          background: var(--campo);
          border: 1px solid var(--borde);
          border-radius: 9px;
          color: var(--tinta);
          font-family: var(--sans);
          font-size: 14.5px;
          padding: 11px 13px 11px 40px;
          outline: none;
          transition: border-color .18s, box-shadow .18s, background .18s;
        }
        .lg-input::placeholder { color: #A9B6C3; }
        .lg-input:focus {
          background: var(--tarjeta);
          border-color: var(--acento);
          box-shadow: 0 0 0 3px var(--acento-2);
        }
        .lg-input.con-boton { padding-right: 42px; }

        .lg-ojo {
          position: absolute;
          right: 6px;
          background: none;
          border: none;
          padding: 7px;
          border-radius: 7px;
          color: var(--tenue);
          cursor: pointer;
          display: flex;
          line-height: 0;
        }
        .lg-ojo:hover { color: var(--acento); background: var(--acento-2); }
        .lg-ojo:focus-visible { outline: 2px solid var(--acento); outline-offset: 1px; }

        .lg-boton {
          margin-top: 6px;
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 9px;
          background: var(--acento);
          color: #fff;
          font-family: var(--sans);
          font-size: 15px;
          font-weight: 620;
          letter-spacing: .01em;
          cursor: pointer;
          transition: background .18s, transform .06s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
        }
        .lg-boton:hover:not(:disabled) { background: #17538F; }
        .lg-boton:active:not(:disabled) { transform: translateY(1px); }
        .lg-boton:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
        .lg-boton:disabled { opacity: .6; cursor: not-allowed; }

        .lg-girador {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lgGiro .7s linear infinite;
        }
        @keyframes lgGiro { to { transform: rotate(360deg); } }

        .lg-pie {
          margin-top: 26px;
          padding-top: 16px;
          border-top: 1px solid var(--borde);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: .06em;
          color: var(--tenue);
        }
        .lg-pie .lg-cifrado {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--ok);
        }

        @media (prefers-reduced-motion: reduce) {
          .lg-tarjeta, .lg-punto, .lg-girador { animation: none; }
        }

        @media (max-width: 460px) {
          .lg-tarjeta { padding: 32px 24px 26px; }
          .lg-titulo { font-size: 24px; }
        }
      `}</style>

      <div className="lg-root">
        <div className="lg-reticula" />
        <div className="lg-halo" />

        <div className="lg-tarjeta">
          <span className="lg-insignia">
            <span className="lg-punto" /> Sistema activo
          </span>

          <h1 className="lg-titulo">
            Sentinel <span>AI</span>
          </h1>
          <p className="lg-sub">
            Sistema de detección inteligente de armas
          </p>

          <form className="lg-form" onSubmit={handleSubmit}>
            <div>
              <label className="lg-etiqueta" htmlFor="lg-email">
                Correo institucional
              </label>
              <div className="lg-caja">
                <span className="lg-icono" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m2 7 10 6 10-6" />
                  </svg>
                </span>
                <input
                  id="lg-email"
                  className="lg-input"
                  type="email"
                  placeholder="usuario@dominio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="lg-etiqueta" htmlFor="lg-pass">
                Contraseña
              </label>
              <div className="lg-caja">
                <span className="lg-icono" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="lg-pass"
                  className="lg-input con-boton"
                  type={verPassword ? "text" : "password"}
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="lg-ojo"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.16 3.19M6.6 6.6A18 18 0 0 0 2 12s3 8 10 8a9 9 0 0 0 5.4-1.6" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <path d="m2 2 20 20" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button className="lg-boton" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="lg-girador" /> Verificando…
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>

          <div className="lg-pie">
            <span>© 2026 Sentinel Security</span>
            <span className="lg-cifrado">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Conexión cifrada
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
