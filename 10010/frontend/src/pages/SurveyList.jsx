import React, { useState, useEffect } from 'react'
import { Button, Table, Tag, Space, Popconfirm, message, Card, Input } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ShareAltOutlined, BarChartOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import AppLayout from '../components/AppLayout.jsx'
import dayjs from 'dayjs'

const { Search } = Input

export default function SurveyList() {
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState([])
  const [filteredSurveys, setFilteredSurveys] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchSurveys()
  }, [])

  const fetchSurveys = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/surveys?page_size=100')
      const result = data.results || data
      setSurveys(result)
      setFilteredSurveys(result)
    } catch (error) {
      message.error('获取问卷列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value) => {
    if (!value) {
      setFilteredSurveys(surveys)
    } else {
      setFilteredSurveys(surveys.filter(s => s.title.toLowerCase().includes(value.toLowerCase())))
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/surveys/${id}/`)
      message.success('删除成功')
      fetchSurveys()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handlePublish = async (id) => {
    try {
      await api.post(`/surveys/${id}/publish/`)
      message.success('发布成功')
      fetchSurveys()
    } catch (error) {
      message.error('发布失败，请先添加题目')
    }
  }

  const handleClose = async (id) => {
    try {
      await api.post(`/surveys/${id}/close/`)
      message.success('已关闭')
      fetchSurveys()
    } catch (error) {
      message.error('操作失败')
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
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
      ),
    },
    {
      title: '回收份数',
      dataIndex: 'response_count',
      key: 'response_count',
      width: 100,
      render: (count) => count || 0,
    },
    {
      title: '平均完成时间',
      dataIndex: 'average_completion_time',
      key: 'average_completion_time',
      width: 120,
      render: (seconds) => {
        if (!seconds) return '-'
        if (seconds < 60) return `${seconds}秒`
        return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'draft' && (
            <Button type="link" size="small" onClick={() => handlePublish(record.id)}>
              发布
            </Button>
          )}
          {record.status === 'published' && (
            <Button type="link" size="small" onClick={() => handleClose(record.id)}>
              关闭
            </Button>
          )}
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/surveys/${record.id}/preview`)}>
            预览
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/surveys/${record.id}/edit`)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<ShareAltOutlined />} onClick={() => {
            const url = `${window.location.origin}/survey/${record.id}`
            navigator.clipboard.writeText(url)
            message.success('链接已复制到剪贴板')
          }}>
            分享
          </Button>
          <Button type="link" size="small" icon={<BarChartOutlined />} onClick={() => navigate(`/surveys/${record.id}/stats`)}>
            统计
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <AppLayout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>我的问卷</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/surveys/new')}>
          创建问卷
        </Button>
      </div>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Search
            placeholder="搜索问卷标题"
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Table
          columns={columns}
          dataSource={filteredSurveys}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
        />
      </Card>
    </AppLayout>
  )
}
