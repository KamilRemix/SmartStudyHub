import React, { useState, useEffect } from 'react';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';

interface AuthNavigatorProps {
  initialScreen?: 'login' | 'register';
}

export const AuthNavigator: React.FC<AuthNavigatorProps> = ({ initialScreen = 'login' }) => {
  const [screen, setScreen] = useState<'login' | 'register'>(initialScreen);

  useEffect(() => {
    setScreen(initialScreen);
  }, [initialScreen]);

  if (screen === 'register') {
    return <RegisterScreen onNavigateToLogin={() => setScreen('login')} />;
  }
  return <LoginScreen onNavigateToRegister={() => setScreen('register')} />;
};
