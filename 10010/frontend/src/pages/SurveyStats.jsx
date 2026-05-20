import React, { useState, useEffect } from 'react'
import { Card, Button, Statistic, Row, Col, Table, Tag, Space, message, Tabs, Empty } from 'antd'
import { ArrowLeftOutlined, DownloadOutlined, PieChartOutlined, BarChartOutlined, StarOutlined, FileTextOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import api from '../api'
import AppLayout from '../components/AppLayout.jsx'
import dayjs from 'dayjs'

export default function SurveyStats() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [survey, setSurvey] = useState(null)
  const [stats, setStats] = useState([])
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [surveyRes, statsRes, responsesRes] = await Promise.all([
        api.get(`/surveys/${id}/`),
        api.get(`/surveys/${id}/stats/`),
        api.get(`/surveys/${id}/responses/`),
      ])
      setSurvey(surveyRes.data)
      setStats(statsRes.data)
      setResponses(responsesRes.data)
    } catch (error) {
      message.error('获取统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await api.get(`/surveys/${id}/export/`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${survey?.title || '问卷结果'}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      message.success('导出成功')
    } catch (error) {
      message.error('导出失败')
    }
  }

  const getChartOption = (stat) => {
    if (stat.question_type === 'single_choice') {
      return {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: { show: true, formatter: '{b}: {c} ({d}%)' },
          data: stat.stats.options?.map(o => ({ value: o.value, name: o.label })) || [],
        }],
      }
    } else if (stat.question_type === 'multiple_choice') {
      return {
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: stat.stats.options?.map(o => o.label) || [] },
        yAxis: { type: 'value' },
        series: [{
          type: 'bar',
          data: stat.stats.options?.map(o => o.value) || [],
          itemStyle: { color: '#1890ff' },
        }],
      }
    } else if (stat.question_type === 'rating') {
      return {
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: stat.stats.distribution?.map(d => d.rating + '分') || [] },
        yAxis: { type: 'value' },
        series: [{
          type: 'bar',
          data: stat.stats.distribution?.map(d => d.count) || [],
          itemStyle: { color: '#faad14' },
        }],
      }
    }
    return {}
  }

  const getIcon = (type) => {
    const icons = {
      single_choice: <PieChartOutlined style={{ color: '#722ed1' }} />,
      multiple_choice: <BarChartOutlined style={{ color: '#1890ff' }} />,
      rating: <StarOutlined style={{ color: '#faad14' }} />,
      text: <FileTextOutlined style={{ color: '#52c41a' }} />,
    }
    return icons[type] || null
  }

  const formatTime = (seconds) => {
    if (!seconds) return '-'
    if (seconds < 60) return `${seconds}秒`
    return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  }

  const responseColumns = [
    { title: '回答ID', dataIndex: 'id', key: 'id', render: (id) => String(id).slice(0, 8) },
    { title: '回答者', dataIndex: 'respondent_name', key: 'respondent_name', render: (name) => name || '匿名' },
    { title: '邮箱', dataIndex: 'respondent_email', key: 'respondent_email', render: (email) => email || '-' },
    { title: '开始时间', dataIndex: 'started_at', key: 'started_at', render: (d) => dayjs(d).format('YYYY-MM-DD HH:mm') },
    { title: '完成时间', dataIndex: 'completed_at', key: 'completed_at', render: (d) => d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-' },
  ]

  if (!survey) return <div style={{ padding: 24 }}>加载中...</div>

  return (
    <AppLayout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            返回
          </Button>
          <h2>{survey.title} - 统计分析</h2>
        </Space>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
          导出Excel
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="回收份数"
              value={survey.response_count || 0}
              prefix={<PieChartOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="平均完成时间"
              value={formatTime(survey.average_completion_time)}
              prefix={<BarChartOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="题目数量"
              value={survey.questions?.length || 0}
              prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'charts',
            label: '图表分析',
            children: (
              <div>
                {stats.length === 0 ? (
                  <Empty description="暂无数据" />
                ) : (
                  stats.map((stat, index) => (
                    <Card
                      key={stat.question_id}
                      title={
                        <Space>
                          {getIcon(stat.question_type)}
                          <span>Q{index + 1}. {stat.question_title}</span>
                          <Tag color="blue">{stat.stats.total || 0} 人回答</Tag>
                          {stat.question_type === 'rating' && (
                            <Tag color="gold">平均分: {stat.stats.average}</Tag>
                          )}
                        </Space>
                      }
                      style={{ marginBottom: 16 }}
                    >
                      {['single_choice', 'multiple_choice', 'rating'].includes(stat.question_type) ? (
                        <div className="chart-container">
                          <ReactECharts option={getChartOption(stat)} style={{ height: '100%' }} />
                        </div>
                      ) : (
                        <div>
                          {stat.stats.answers?.length > 0 ? (
                            <Table
                              dataSource={stat.stats.answers.map((text, i) => ({ key: i, text }))}
                              columns={[
                                { title: '序号', dataIndex: 'key', key: 'key', render: (_, __, i) => i + 1, width: 80 },
                                { title: '回答内容', dataIndex: 'text', key: 'text' },
                              ]}
                              pagination={{ pageSize: 10 }}
                              size="small"
                            />
                          ) : (
                            <Empty description="暂无文本回答" />
                          )}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            ),
          },
          {
            key: 'responses',
            label: '回答详情',
            children: (
              <Card>
                <Table
                  columns={responseColumns}
                  dataSource={responses}
                  rowKey="id"
                  loading={loading}
                  expandable={{
                    expandedRowRender: (record) => (
                      <Table
                        dataSource={record.answers}
                        columns={[
                          { title: '问题', dataIndex: 'question_title', key: 'question_title' },
                          {
                            title: '回答',
                            key: 'answer',
                            render: (_, item) => {
                              if (item.selected_options?.length > 0) {
                                return item.selected_options.map(o => o.text).join(', ')
                              }
                              if (item.rating_value) {
                                return `${item.rating_value} 分`
                              }
                              return item.text_answer || '-'
                            },
                          },
                        ]}
                        pagination={false}
                        size="small"
                      />
                    ),
                  }}
                />
              </Card>
            ),
          },
        ]}
      />
    </AppLayout>
  )
}
