import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useRef } from "react";

// Info icon SVG component
const InfoIcon = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="inline-block align-middle">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0-4h.01" />
  </svg>
);

const Login: React.FC = () => {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const navigate = useNavigate();
  const instructionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Syro - Customization Bot";
    // Check if already logged in
    fetch('http://localhost:3002/me', { credentials: 'include', cache: 'no-cache' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user);
          navigate("/dashboard");
        }
        setChecking(false);
      });
  }, [navigate]);

  // Animar instrucciones con GSAP
  useEffect(() => {
    if (showInstructions && instructionsRef.current) {
      gsap.fromTo(
        instructionsRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
    }
  }, [showInstructions]);

  const handleLogin = () => {
    window.location.href = "http://localhost:3002/login";
  };

  const handleLogout = async () => {
    await fetch('http://localhost:3002/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
    window.location.reload();
  };

  if (checking) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-screen w-screen bg-white overflow-hidden">
      {/* Light effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[300px] bg-gradient-to-br from-blue-500 via-blue-400 to-blue-200 opacity-70 rounded-[100%] blur-2xl pointer-events-none z-0 rotate-12" />
      <div className="absolute top-[-5%] left-[5%] w-[400px] h-[400px] bg-gradient-to-tr from-cyan-400 via-blue-300 to-white/60 opacity-40 rounded-[80%] blur-xl pointer-events-none z-0" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[250px] bg-gradient-to-tr from-blue-700 via-purple-400 to-blue-200 opacity-50 rounded-[100%] blur-2xl pointer-events-none z-0 -rotate-6" />
      <div className="absolute top-[40%] left-[60%] w-[400px] h-[180px] bg-gradient-to-tl from-cyan-400 via-blue-500 to-white/70 opacity-50 rounded-[100%] blur-xl pointer-events-none z-0 rotate-3" />

      {/* Content */}
      <span className="text-gray-400 text-sm mb-4 tracking-wide uppercase z-10">Customize your Discord like never before</span>
      <h1 className="text-[12rem] font-extrabold bg-gradient-to-r from-blue-400 via-blue-600 to-blue-900 bg-clip-text text-transparent uppercase leading-none mb-2 z-10">Syro</h1>
      <h2 className="text-[12rem] font-extrabold bg-gradient-to-r from-blue-400 via-blue-600 to-blue-900 bg-clip-text text-transparent uppercase tracking-widest leading-none z-10 mb-12">Bot</h2>
      {!user ? (
        <>
          <div className="flex flex-row items-center gap-4 z-10 mb-2">
            <button
              onClick={handleLogin}
              className="px-8 py-2 rounded-lg font-semibold text-base shadow-md transition-all duration-200 tracking-wider uppercase bg-white border-2 border-blue-600 text-blue-700 hover:bg-blue-50 hover:border-blue-800 hover:text-blue-900"
            >
              Login with Discord
            </button>
            <button
              onClick={async () => {
                const res = await fetch('http://localhost:3002/invite');
                const data = await res.json();
                window.open(data.url, '_blank');
              }}
              className="px-8 py-2 rounded-lg font-semibold text-base shadow-md transition-all duration-200 tracking-wider uppercase bg-blue-600 text-white hover:bg-blue-700"
            >
              Invite Bot to Server
            </button>
            <button
              onClick={() => setShowInstructions(v => !v)}
              className={`p-2 rounded-xl bg-blue-600 text-white border-2 border-blue-600 hover:bg-blue-700 hover:border-blue-800 transition-all duration-200 flex items-center justify-center ${showInstructions ? 'ring-2 ring-blue-400' : ''}`}
              title="Show instructions"
              aria-label="Show instructions"
              type="button"
            >
              <InfoIcon />
            </button>
          </div>
          {/* Contenedor para reservar espacio y evitar salto */}
          <div style={{ minHeight: 100, transition: 'min-height 0.3s' }} className="w-full flex justify-center items-start">
            {showInstructions && (
              <div
                ref={instructionsRef}
                className="mt-6 text-center text-sm text-gray-500 z-10 max-w-md animate-fade-in"
                style={{ width: '100%' }}
              >
                <ol className="space-y-1">
                  <li>Click "Invite Bot to Server" to add Syro to your Discord server.</li>
                  <li>Then click "Login with Discord" to access the dashboard.</li>
                  <li>Configure features from the control panel.</li>
                </ol>
              </div>
            )}
          </div>
        </>
      ) : (
        <button
          onClick={handleLogout}
          className="px-10 py-2 rounded-lg font-semibold text-base shadow-md transition-all duration-200 tracking-wider uppercase z-10 bg-white border-2 border-blue-600 text-blue-700 hover:bg-blue-50 hover:border-blue-800 hover:text-blue-900"
        >
          Log out
        </button>
      )}
    </div>
  );
};

export default Login;