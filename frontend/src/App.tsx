import { Routes, Route } from 'react-router-dom'
import CallbackPage from './components/CallbackPage'
import LoginPage from './components/LoginPage'
import { useEffect, useState } from 'react'
import { GetUserInfo } from './Api'
import AppLayout from './components/AppLayout'
import TimeLogPage from './components/TimeLogPage'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const accessToken =localStorage.getItem('access_token') || '';

  useEffect(() => {
    const checkAuth = async () => {
      if (!accessToken) {
        setIsAuthenticated(false);
        setIsChecking(false);
        return;
      }

      try {
        await GetUserInfo(accessToken);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Token 验证或获取用户信息失败', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('userInfo');
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [accessToken]);

  if (isChecking) {
    return <div>正在检查认证状态...</div>;
  }
  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? 
      <AppLayout>
        <TimeLogPage />
      </AppLayout> 
      : <LoginPage />} 
      />
      <Route path="/callback" element={<CallbackPage />} />
    </Routes>
  )
}

export default App
