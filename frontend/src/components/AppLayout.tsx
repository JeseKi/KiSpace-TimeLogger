import React from 'react';
import { Layout, Typography } from 'antd'; // 引入 Ant Design 组件

const { Header, Content, Footer } = Layout; // 解构 Layout 下的组件
const { Title } = Typography; // 引入标题组件

// 定义 Props 类型，允许传入子组件
interface AppLayoutProps {
  children: React.ReactNode; // children 属性用来接收嵌套的内容
}

/**
 * 应用的基础布局组件
 * 使用 Ant Design Layout 和 Tailwind CSS
 */
const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    // 使用 Ant Design 的 Layout 组件作为最外层容器
    // 使用 Tailwind 设置最小高度为屏幕高度，并设置 flex 布局让 Footer 始终在底部 (如果内容不够长)
    <Layout className="!min-h-screen flex flex-col">

      {/* 1. 应用头部 */}
      {/* 使用 Ant Design 的 Header 组件，并用 Tailwind 设置内边距、背景色、flex 布局 */}
      <Header className="!px-8 !bg-gray-800 flex items-center justify-between">
         {/* 左侧标题 - 使用 Ant Design Typography.Title 并用 Tailwind 设置文字颜色 */}
        <Title level={3} className="!text-white !m-0">
          📊 Kiball 时间统计
        </Title>
      </Header>

      {/* 2. 主要内容区 */}
      {/* 使用 Ant Design Content 组件 */}
      {/* 使用 Tailwind 设置内边距、flex-grow 让其填充剩余空间 */}
      {/* 并在内部创建一个容器设置最大宽度、居中、上下外边距、背景色、圆角和阴影 (对应草图的 app-main) */}
      <Content className="flex-grow p-4 md:p-6">
        <div className="max-w-6xl mx-auto bg-white p-4 md:p-6 rounded-lg shadow-md">
           {/* 这里会渲染传入 AppLayout 的子组件 (比如未来的页面内容) */}
          {children}
        </div>
      </Content>

      {/* 3. 页脚 */}
      {/* 使用 Ant Design Footer 组件 */}
      {/* 使用 Tailwind 设置文字居中、上下内边距、文字颜色和大小 */}
      <Footer className="!text-center !py-4 !px-6 bg-gray-100 text-gray-500 text-sm">
        Made with ❤️ by Master & Kiball 喵~ © {new Date().getFullYear()}
      </Footer>

    </Layout>
  );
};

export default AppLayout; // 导出组件