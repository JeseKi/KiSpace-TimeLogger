import { createRoot } from 'react-dom/client'
import './index.css'
import { App as AntdApp } from 'antd';
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AntdApp>
    <App />
    </AntdApp>
  </BrowserRouter>
)
