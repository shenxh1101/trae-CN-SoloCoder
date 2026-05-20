import React from 'react'
import { Layout, Menu, Dropdown, Avatar, Space } from 'antd'
import {
  DashboardOutlined,
  FormOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  CrownOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const { Header, Sider } = Layout

export default function AppLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/surveys', icon: <FormOutlined />, label: '我的问卷' },
    ...(user.is_staff ? [{ key: '/admin', icon: <CrownOutlined />, label: '管理面板' }] : []),
  ]

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人中心', disabled: true },
      { key: 'settings', icon: <SettingOutlined />, label: '账户设置', disabled: true },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={220}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1890ff' }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 'bold' }}>
            问卷调查系统
          </h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ height: 'calc(100% - 64px)', borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}
        >
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} src={user.avatar} />
              <span>{user.username}</span>
            </Space>
          </Dropdown>
        </Header>
        <Layout.Content style={{ padding: '24px', background: '#f5f5f5' }}>
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
