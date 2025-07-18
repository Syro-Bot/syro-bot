import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useRef } from "react";
import { useAuth } from '../contexts/AuthContext';
import { AUTH_BASE_URL } from '../config/constants';

/**
 * Type definition for a Discord user (minimal for login context)
 */
interface User {
  id: string;
  username: string;
  avatar?: string;
}

/**
 * Type definition for the bot invite API response
 */
interface InviteResponse {
  url: string;
}

// Info icon SVG component (could be moved to shared if reused)
const InfoIcon = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="inline-block align-middle">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0-4h.01" />
  </svg>
);

/**
 * Login page for Syro dashboard.
 * Handles Discord OAuth login, bot invitation, and user instructions.
 */
const Login: React.FC = () => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const navigate = useNavigate();
  const instructionsRef = useRef<HTMLDivElement>(null);
  const { user, loading, login, logout, isAuthenticated } = useAuth();

  // Set page title and redirect if already authenticated
  useEffect(() => {
    document.title = "Syro - Customization Bot";
    if (isAuthenticated && user) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  // Animate instructions panel
  useEffect(() => {
    if (showInstructions && instructionsRef.current) {
      gsap.fromTo(
        instructionsRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
    }
  }, [showInstructions]);

  // Handle Discord login
  const handleLogin = () => {
    login();
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
  };

  // Handle bot invite
  const handleInviteBot = async () => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      const res = await fetch(`${AUTH_BASE_URL}/invite`);
      if (!res.ok) throw new Error('Failed to fetch invite URL');
      const data: InviteResponse = await res.json();
      if (!data.url) throw new Error('No invite URL returned');
      window.open(data.url, '_blank');
    } catch (err: any) {
      setInviteError(err.message || 'Unknown error');
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-white overflow-hidden px-4 py-8">
      {/* Light effects for background aesthetics */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[150px] md:w-[600px] md:h-[300px] bg-gradient-to-br from-blue-500 via-blue-400 to-blue-200 opacity-70 rounded-[100%] blur-2xl pointer-events-none z-0 rotate-12" />
      <div className="absolute top-[-5%] left-[5%] w-[200px] h-[200px] md:w-[400px] md:h-[400px] bg-gradient-to-tr from-cyan-400 via-blue-300 to-white/60 opacity-40 rounded-[80%] blur-xl pointer-events-none z-0" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[350px] h-[125px] md:w-[700px] md:h-[250px] bg-gradient-to-tr from-blue-700 via-purple-400 to-blue-200 opacity-50 rounded-[100%] blur-2xl pointer-events-none z-0 -rotate-6" />
      <div className="absolute top-[40%] left-[60%] w-[200px] h-[90px] md:w-[400px] md:h-[180px] bg-gradient-to-tl from-cyan-400 via-blue-500 to-white/70 opacity-50 rounded-[100%] blur-xl pointer-events-none z-0 rotate-3" />

      {/* Main content */}
      <span className="text-gray-400 text-xs md:text-sm mb-2 md:mb-4 tracking-wide uppercase z-10 text-center">Customize your Discord like never before</span>
      <h1 className="text-[6rem] md:text-[8rem] lg:text-[12rem] font-extrabold bg-gradient-to-r from-blue-400 via-blue-600 to-blue-900 bg-clip-text text-transparent uppercase leading-none mb-1 md:mb-2 z-10">Syro</h1>
      <h2 className="text-[6rem] md:text-[8rem] lg:text-[12rem] font-extrabold bg-gradient-to-r from-blue-400 via-blue-600 to-blue-900 bg-clip-text text-transparent uppercase tracking-widest leading-none z-10 mb-6 md:mb-12">Bot</h2>
      {!isAuthenticated ? (
        <>
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 z-10 mb-2">
            <button
              onClick={handleLogin}
              className="w-full md:w-auto px-6 md:px-8 py-4 md:py-2 rounded-lg font-semibold text-base md:text-base shadow-md transition-all duration-200 tracking-wider uppercase bg-white border-2 border-blue-600 text-blue-700 hover:bg-blue-50 hover:border-blue-800 hover:text-blue-900"
              aria-label="Login with Discord"
            >
              Login with Discord
            </button>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={handleInviteBot}
                className="flex-1 md:flex-none px-6 md:px-8 py-4 md:py-2 rounded-lg font-semibold text-base md:text-base shadow-md transition-all duration-200 tracking-wider uppercase bg-blue-600 text-white hover:bg-blue-700"
                aria-label="Invite Bot to Server"
                disabled={inviteLoading}
              >
                {inviteLoading ? 'Inviting...' : 'Invite Bot to Server'}
              </button>
              <button
                onClick={() => setShowInstructions(v => !v)}
                className={`p-4 md:p-2 rounded-xl bg-blue-600 text-white border-2 border-blue-600 hover:bg-blue-700 hover:border-blue-800 transition-all duration-200 flex items-center justify-center ${showInstructions ? 'ring-2 ring-blue-400' : ''}`}
                title="Show instructions"
                aria-label="Show instructions"
                type="button"
              >
                <InfoIcon />
              </button>
            </div>
          </div>
          {/* Error message for invite */}
          {inviteError && (
            <div className="w-full max-w-md text-center text-red-600 bg-red-100 border border-red-300 rounded-lg py-2 px-4 mb-2">
              {inviteError}
            </div>
          )}
          {/* Instructions panel */}
          <div style={{ minHeight: 80, transition: 'min-height 0.3s' }} className="w-full flex justify-center items-start px-4">
            {showInstructions && (
              <div
                ref={instructionsRef}
                className="mt-4 md:mt-6 text-center text-xs md:text-sm text-gray-500 z-10 max-w-md animate-fade-in"
                style={{ width: '100%' }}
                aria-live="polite"
              >
                <h3 className="font-semibold text-base mb-2">How to get started</h3>
                <ol className="space-y-2 md:space-y-1">
                  <li>Click <b>"Invite Bot to Server"</b> to add Syro to your Discord server.</li>
                  <li>Then click <b>"Login with Discord"</b> to access the dashboard.</li>
                  <li>Configure features from the control panel.</li>
                </ol>
              </div>
            )}
          </div>
        </>
      ) : (
        <button
          onClick={handleLogout}
          className="w-full md:w-auto px-8 md:px-10 py-3 md:py-2 rounded-lg font-semibold text-sm md:text-base shadow-md transition-all duration-200 tracking-wider uppercase z-10 bg-white border-2 border-blue-600 text-blue-700 hover:bg-blue-50 hover:border-blue-800 hover:text-blue-900"
          aria-label="Log out"
        >
          Log out
        </button>
      )}
    </div>
  );
};

export default Login;