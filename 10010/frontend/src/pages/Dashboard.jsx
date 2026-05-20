import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Button, Table, Tag } from 'antd'
import { PlusOutlined, FormOutlined, BarChartOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import AppLayout from '../components/AppLayout.jsx'
import dayjs from 'dayjs'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, published: 0, responses: 0 })
  const [recentSurveys, setRecentSurveys] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/surveys?page_size=5')
      const surveys = data.results || data
      setRecentSurveys(surveys.slice(0, 5))
      setStats({
        total: surveys.length,
        published: surveys.filter(s => s.status === 'published').length,
        responses: surveys.reduce((acc, s) => acc + (s.response_count || 0), 0),
      })
    } catch (error) {
      console.error('获取数据失败', error)
    } finally {
      setLoading(false)
    }
  }

  const statusMap = {
    draft: { color: 'default', text: '草稿' },
    published: { color: 'success', text: '已发布' },
    closed: { color: 'warning', text: '已关闭' },
  }

  const columns = [
    {
      title: '问卷标题',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <a onClick={() => navigate(`/surveys/${record.id}/stats`)}>{text}</a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
      ),
    },
    {
      title: '回收份数',
      dataIndex: 'response_count',
      key: 'response_count',
      render: (count) => count || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ]

  return (
    <AppLayout>
      <div className="page-header">
        <h2>工作台</h2>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card className="card-hover">
            <Statistic
              title="问卷总数"
              value={stats.total}
              prefix={<FormOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="card-hover">
            <Statistic
              title="已发布"
              value={stats.published}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="card-hover">
            <Statistic
              title="回收份数"
              value={stats.responses}
              prefix={<BarChartOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="最近问卷"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/surveys/new')}>
            创建问卷
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={recentSurveys}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
    </AppLayout>
  )
}
