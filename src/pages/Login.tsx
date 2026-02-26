import React, { useState } from "react";
import { useAuth } from "../context/auth-context";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    try {
      // ✅ Mejor práctica: el componente NO hace fetch.
      // Llama al AuthProvider (que hace POST /auth/login y guarda token/user/allowed_modules).
      await login(email.trim(), password);

      toast.success("ACCESO CONCEDIDO: Sistema Sentinel en línea");

      // ✅ Si estás usando React Router, lo ideal es navegar:
      // navigate("/");
      // Como no veo router aquí, hacemos fallback:
      window.location.reload();
    } catch (err: any) {
      console.error("Login Error:", err);
      toast.error("FALLO DE ACCESO", {
        description: String(err?.message ?? err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          background: #020a14;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Rajdhani', sans-serif;
          overflow: hidden;
          position: relative;
        }

        .grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,120,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,120,255,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: gridPan 20s linear infinite;
        }

        @keyframes gridPan {
          0% { transform: translateY(0); }
          100% { transform: translateY(40px); }
        }

        .glow-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(0,100,255,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0,150,255,0.5), transparent);
          animation: scan 4s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        .card {
          position: relative;
          width: 420px;
          background: rgba(4, 16, 30, 0.92);
          border: 1px solid rgba(0, 120, 255, 0.25);
          box-shadow:
            0 0 0 1px rgba(0,100,255,0.1),
            0 0 40px rgba(0,80,255,0.12),
            0 30px 60px rgba(0,0,0,0.6);
          backdrop-filter: blur(12px);
          animation: cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px));
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .card::before {
          content: '';
          position: absolute;
          top: -1px; right: -1px;
          width: 0; height: 0;
          border-style: solid;
          border-width: 0 22px 22px 0;
          border-color: transparent rgba(0,120,255,0.7) transparent transparent;
        }

        .card-inner {
          padding: 44px 40px 40px;
        }

        .header {
          margin-bottom: 36px;
          animation: fadeUp 0.5s ease 0.1s both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: #0078ff;
          background: rgba(0,120,255,0.08);
          border: 1px solid rgba(0,120,255,0.2);
          padding: 4px 10px;
          letter-spacing: 2px;
          margin-bottom: 16px;
        }

        .badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #0078ff;
          animation: blink 1.5s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }

        .title {
          font-size: 28px;
          font-weight: 700;
          color: #e8f0fe;
          letter-spacing: 1px;
          line-height: 1;
          margin-bottom: 6px;
        }

        .title span {
          color: #0078ff;
        }

        .subtitle {
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px;
          color: rgba(100, 150, 200, 0.6);
          letter-spacing: 1px;
        }

        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,120,255,0.3), transparent);
          margin-bottom: 32px;
          animation: fadeUp 0.5s ease 0.2s both;
        }

        .form { display: flex; flex-direction: column; gap: 18px; }

        .field {
          animation: fadeUp 0.5s ease both;
        }

        .field-label {
          display: block;
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: rgba(0,120,255,0.7);
          letter-spacing: 2px;
          margin-bottom: 8px;
        }

        .input-wrap {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(0,120,255,0.5);
          font-size: 14px;
          pointer-events: none;
          transition: color 0.2s;
        }

        .input-wrap.focused .input-icon {
          color: #0078ff;
        }

        .field-input {
          width: 100%;
          background: rgba(0,30,60,0.6);
          border: 1px solid rgba(0,80,180,0.25);
          color: #c8deff;
          font-family: 'Share Tech Mono', monospace;
          font-size: 13px;
          padding: 12px 14px 12px 40px;
          outline: none;
          transition: all 0.25s;
          letter-spacing: 0.5px;
        }

        .field-input:focus {
          border-color: rgba(0,120,255,0.6);
          background: rgba(0,40,80,0.7);
          box-shadow: 0 0 0 3px rgba(0,100,255,0.08);
        }

        .input-line {
          position: absolute;
          bottom: 0; left: 0;
          height: 2px;
          width: 0;
          background: linear-gradient(90deg, #0050ff, #00aaff);
          transition: width 0.3s ease;
        }

        .input-wrap.focused .input-line {
          width: 100%;
        }

        .btn {
          position: relative;
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #0045cc, #0070ff);
          border: none;
          color: #fff;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 3px;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.25s;
          clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 20px));
        }

        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-loader {
          display: inline-block;
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .footer {
          margin-top: 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .footer-text {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: rgba(60,100,160,0.6);
          letter-spacing: 1px;
        }
      `}</style>

      <div className="login-root">
        <div className="grid-bg" />
        <div className="glow-center" />
        <div className="scan-line" />

        <div className="card">
          <div className="card-inner">
            <div className="header">
              <div className="badge">
                <div className="badge-dot" /> SISTEMA ACTIVO
              </div>
              <h1 className="title">
                SENTINEL <span>AI</span>
              </h1>
              <p className="subtitle">CONTROL DE ACCESO SEGURO v2.4.1</p>
            </div>

            <div className="divider" />

            <form className="form" onSubmit={handleSubmit}>
              <div className="field">
                <label className="field-label">IDENTIFICADOR (EMAIL)</label>
                <div
                  className={`input-wrap ${focused === "email" ? "focused" : ""}`}
                >
                  <span className="input-icon">✉</span>
                  <input
                    className="field-input"
                    type="email"
                    placeholder="usuario@dominio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    required
                    autoComplete="email"
                  />
                  <div className="input-line" />
                </div>
              </div>

              <div className="field">
                <label className="field-label">CLAVE DE ACCESO</label>
                <div
                  className={`input-wrap ${
                    focused === "password" ? "focused" : ""
                  }`}
                >
                  <span className="input-icon">🔒</span>
                  <input
                    className="field-input"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    required
                    autoComplete="current-password"
                  />
                  <div className="input-line" />
                </div>
              </div>

              <div className="field" style={{ marginTop: "10px" }}>
                <button className="btn" type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="btn-loader" /> VERIFICANDO...
                    </>
                  ) : (
                    "INICIAR SESIÓN"
                  )}
                </button>
              </div>
            </form>

            <div className="footer">
              <span className="footer-text">© 2026 SENTINEL SECURITY</span>
              <span
                style={{
                  color: "rgba(0,200,120,0.7)",
                  fontSize: "10px",
                  fontFamily: "Share Tech Mono",
                }}
              >
                CIFRADO TLS 2.0
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}