import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Statistic, Row, Col, message } from 'antd'
import { FormOutlined, CheckCircleOutlined, UserOutlined, BarChartOutlined } from '@ant-design/icons'
import api from '../api'
import AppLayout from '../components/AppLayout.jsx'
import dayjs from 'dayjs'

export default function AdminPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    if (!user.is_staff) {
      message.error('没有管理员权限')
      return
    }
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/overview/')
      setData(data)
    } catch (error) {
      message.error('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    if (!seconds) return '-'
    if (seconds < 60) return `${seconds}秒`
    return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  }

  const statusMap = {
    draft: { color: 'default', text: '草稿' },
    published: { color: 'success', text: '已发布' },
    closed: { color: 'warning', text: '已关闭' },
  }

  const columns = [
    { title: '问卷标题', dataIndex: 'title', key: 'title' },
    { title: '创建者', dataIndex: 'creator', key: 'creator' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>,
    },
    { title: '回收份数', dataIndex: 'response_count', key: 'response_count' },
    { title: '平均完成时间', dataIndex: 'average_completion_time', key: 'average_completion_time', render: formatTime },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (d) => dayjs(d).format('YYYY-MM-DD HH:mm') },
    { title: '发布时间', dataIndex: 'published_at', key: 'published_at', render: (d) => d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-' },
  ]

  if (!user.is_staff) {
    return (
      <AppLayout>
        <Card>
          <h2>没有权限访问</h2>
          <p>该页面仅管理员可访问</p>
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="page-header">
        <h2>管理面板</h2>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="问卷总数"
              value={data?.total_surveys || 0}
              prefix={<FormOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="已发布问卷"
              value={data?.published_surveys || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="总回收份数"
              value={data?.total_responses || 0}
              prefix={<BarChartOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="活跃用户"
              value={new Set(data?.surveys?.map(s => s.creator) || []).size}
              prefix={<UserOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="所有问卷">
        <Table
          columns={columns}
          dataSource={data?.surveys || []}
          rowKey="survey_id"
          loading={loading}
        />
      </Card>
    </AppLayout>
  )
}
