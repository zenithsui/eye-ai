import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
const eyeLogo = '/eye-logo.jpg';

export function SplashScreen() {
  const { userName, setUserName, setCurrentScreen } = useApp();
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    if (userName) setCurrentScreen('home');
  }, [userName, setCurrentScreen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
      setCurrentScreen('home');
    }
  };

  if (userName) return null;

  return (
    <div className="screen screen-enter p-6 flex flex-col items-center justify-center text-center"
      style={{ background: 'linear-gradient(160deg, #0a0a0a 0%, #111 50%, #080808 100%)' }}>
      <div className="mb-8 relative">
        <div className="w-28 h-28 rounded-full overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.08)]">
          <img src={eyeLogo} alt="Eye AI" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 rounded-full"
          style={{ boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)' }} />
      </div>

      <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg tracking-tight">👁️ Eye AI</h1>
      <p className="text-base text-white/50 mb-12 italic">Aapka intelligent saathi</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-4">
        <input
          data-testid="input-name"
          type="text"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          placeholder="Aapka naam kya hai?"
          className="w-full rounded-full px-6 py-4 text-white text-center outline-none transition-colors"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          required
        />
        <button
          data-testid="btn-submit-name"
          type="submit"
          className="w-full text-white font-bold rounded-full px-6 py-4 transition-transform hover:scale-[0.99] active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #333, #666)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          Chalein! →
        </button>
      </form>
    </div>
  );
}
