import { AppProvider, useApp } from './context/AppContext';
import { SplashScreen } from './screens/SplashScreen';
import { HomeScreen } from './screens/HomeScreen';
import { VoiceScreen } from './screens/VoiceScreen';
import { ChatScreen } from './screens/ChatScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ToastContainer } from './components/Toast';

function AppContent() {
  const { currentScreen } = useApp();
  return (
    <div className="app-container">
      {currentScreen === 'splash' && <SplashScreen />}
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'voice' && <VoiceScreen />}
      {currentScreen === 'chat' && <ChatScreen />}
      {currentScreen === 'settings' && <SettingsScreen />}
      {currentScreen === 'history' && <HistoryScreen />}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
