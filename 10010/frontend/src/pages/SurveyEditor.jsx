import React, { useState, useEffect } from 'react'
import {
  Form, Input, Button, Card, Space, Select, Switch, Radio,
  InputNumber, Modal, List, message, Empty, Divider, Dropdown,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined,
  SaveOutlined, SettingOutlined, LinkOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import AppLayout from '../components/AppLayout.jsx'

const QUESTION_TYPES = [
  { value: 'single_choice', label: '单选题' },
  { value: 'multiple_choice', label: '多选题' },
  { value: 'text', label: '文本题' },
  { value: 'rating', label: '评分题' },
]

export default function SurveyEditor() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  
  const [form] = Form.useForm()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [shareVisible, setShareVisible] = useState(false)
  const [surveyData, setSurveyData] = useState(null)

  useEffect(() => {
    if (isEdit) {
      fetchSurvey()
    }
  }, [id])

  const fetchSurvey = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/surveys/${id}/`)
      setSurveyData(data)
      form.setFieldsValue({
        title: data.title,
        description: data.description,
        allow_anonymous: data.allow_anonymous,
        require_login: data.require_login,
      })
      setQuestions(data.questions || [])
    } catch (error) {
      message.error('获取问卷失败')
    } finally {
      setLoading(false)
    }
  }

  const addQuestion = (type) => {
    const newQuestion = {
      id: `temp_${Date.now()}`,
      title: '',
      question_type: type,
      order: questions.length,
      required: true,
      options: type === 'single_choice' || type === 'multiple_choice'
        ? [{ id: `temp_${Date.now()}_1`, text: '选项1', order: 0 }, { id: `temp_${Date.now()}_2`, text: '选项2', order: 1 }]
        : [],
      max_rating: type === 'rating' ? 5 : null,
      logic_jumps: [],
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (index, updates) => {
    const newQuestions = [...questions]
    newQuestions[index] = { ...newQuestions[index], ...updates }
    setQuestions(newQuestions)
  }

  const deleteQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index)
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })))
  }

  const moveQuestion = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= questions.length) return
    const newQuestions = [...questions]
    ;[newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]]
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })))
  }

  const addOption = (questionIndex) => {
    const newQuestions = [...questions]
    const question = newQuestions[questionIndex]
    const newOption = {
      id: `temp_${Date.now()}`,
      text: '',
      order: question.options.length,
    }
    question.options.push(newOption)
    setQuestions(newQuestions)
  }

  const updateOption = (questionIndex, optionIndex, text) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options[optionIndex].text = text
    setQuestions(newQuestions)
  }

  const deleteOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options.splice(optionIndex, 1)
    setQuestions(newQuestions)
  }

  const addLogicJump = (questionIndex) => {
    const newQuestions = [...questions]
    const question = newQuestions[questionIndex]
    question.logic_jumps.push({
      id: `temp_${Date.now()}`,
      option_id: question.options[0]?.id,
      target_question_id: null,
      end_survey: false,
    })
    setQuestions(newQuestions)
  }

  const updateLogicJump = (questionIndex, jumpIndex, updates) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].logic_jumps[jumpIndex] = {
      ...newQuestions[questionIndex].logic_jumps[jumpIndex],
      ...updates,
    }
    setQuestions(newQuestions)
  }

  const deleteLogicJump = (questionIndex, jumpIndex) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].logic_jumps.splice(jumpIndex, 1)
    setQuestions(newQuestions)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      
      const validQuestions = questions.filter(q => q.title.trim())
      if (validQuestions.length === 0) {
        message.warning('请至少添加一个有效题目')
        return
      }

      const payload = {
        ...values,
        questions: validQuestions.map(q => ({
          ...q,
          options: q.options?.filter(o => o.text.trim()) || [],
          logic_jumps: q.logic_jumps?.filter(j => j.option_id) || [],
        })),
      }

      setLoading(true)
      if (isEdit) {
        await api.put(`/surveys/${id}/`, payload)
        message.success('保存成功')
      } else {
        const { data } = await api.post('/surveys/', payload)
        message.success('创建成功')
        navigate(`/surveys/${data.id}/edit`)
      }
      fetchSurvey()
    } catch (error) {
      message.error(error.response?.data?.detail || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    try {
      await handleSave()
      await api.post(`/surveys/${id}/publish/`)
      message.success('发布成功')
      setShareVisible(true)
      fetchSurvey()
    } catch (error) {
      message.error('发布失败')
    }
  }

  const renderQuestionTypeIcon = (type) => {
    const icons = {
      single_choice: '○',
      multiple_choice: '☐',
      text: 'T',
      rating: '★',
    }
    return icons[type] || '?'
  }

  return (
    <AppLayout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{isEdit ? '编辑问卷' : '创建问卷'}</h2>
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => setSettingsVisible(true)}>
            设置
          </Button>
          <Button icon={<SaveOutlined />} onClick={handleSave} loading={loading}>
            保存
          </Button>
          {isEdit && surveyData?.status !== 'published' && (
            <Button type="primary" onClick={handlePublish} loading={loading}>
              发布问卷
            </Button>
          )}
          {isEdit && surveyData?.status === 'published' && (
            <Button type="primary" icon={<LinkOutlined />} onClick={() => setShareVisible(true)}>
              分享问卷
            </Button>
          )}
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="问卷标题"
            rules={[{ required: true, message: '请输入问卷标题' }]}
          >
            <Input placeholder="请输入问卷标题" size="large" />
          </Form.Item>
          <Form.Item
            name="description"
            label="问卷描述"
          >
            <Input.TextArea rows={3} placeholder="请输入问卷描述（可选）" />
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          <Space>
            <span>题目列表</span>
            <span style={{ color: '#999', fontSize: 14 }}>(共 {questions.length} 题)</span>
          </Space>
        }
        extra={
          <Dropdown
            trigger={['click']}
            menu={{
              items: QUESTION_TYPES.map(type => ({
                key: type.value,
                label: type.label,
                onClick: () => addQuestion(type.value),
              })),
            }}
          >
            <Button type="primary" icon={<PlusOutlined />}>
              添加题目
            </Button>
          </Dropdown>
        }
      >
        {questions.length === 0 ? (
          <Empty description="暂无题目，点击右上角添加题目" />
        ) : (
          <List
            dataSource={questions}
            renderItem={(question, index) => (
              <List.Item
                key={question.id}
                style={{
                  padding: 16,
                  marginBottom: 12,
                  background: '#fafafa',
                  borderRadius: 8,
                  border: '1px solid #f0f0f0',
                }}
                actions={[
                  <Button type="text" icon={<ArrowUpOutlined />} onClick={() => moveQuestion(index, -1)} disabled={index === 0} />,
                  <Button type="text" icon={<ArrowDownOutlined />} onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1} />,
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => deleteQuestion(index)} />,
                ]}
              >
                <div style={{ width: '100%' }}>
                  <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                      <span style={{
                        display: 'inline-flex',
                        width: 32,
                        height: 32,
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#1890ff',
                        color: '#fff',
                        borderRadius: '50%',
                        fontWeight: 'bold',
                      }}>
                        {index + 1}
                      </span>
                      <Select
                        value={question.question_type}
                        onChange={(value) => updateQuestion(index, { question_type: value, options: ['single_choice', 'multiple_choice'].includes(value) ? question.options : [] })}
                        style={{ width: 120 }}
                      >
                        {QUESTION_TYPES.map(type => (
                          <Select.Option key={type.value} value={type.value}>
                            {type.label}
                          </Select.Option>
                        ))}
                      </Select>
                    </Space>
                    <Space>
                      <span>必填</span>
                      <Switch
                        checked={question.required}
                        onChange={(checked) => updateQuestion(index, { required: checked })}
                        size="small"
                      />
                    </Space>
                  </Space>

                  <Input
                    placeholder="请输入题目标题"
                    value={question.title}
                    onChange={(e) => updateQuestion(index, { title: e.target.value })}
                    style={{ marginBottom: 12 }}
                    size="large"
                  />

                  {['single_choice', 'multiple_choice'].includes(question.question_type) && (
                    <div style={{ marginBottom: 12 }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {question.options?.map((option, optIndex) => (
                          <Space key={option.id} style={{ width: '100%' }}>
                            <span>{renderQuestionTypeIcon(question.question_type)}</span>
                            <Input
                              placeholder={`选项${optIndex + 1}`}
                              value={option.text}
                              onChange={(e) => updateOption(index, optIndex, e.target.value)}
                              style={{ flex: 1 }}
                            />
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => deleteOption(index, optIndex)}
                              disabled={question.options.length <= 2}
                            />
                          </Space>
                        ))}
                      </Space>
                      <Button
                        type="dashed"
                        block
                        icon={<PlusOutlined />}
                        onClick={() => addOption(index)}
                        style={{ marginTop: 8 }}
                      >
                        添加选项
                      </Button>
                    </div>
                  )}

                  {question.question_type === 'rating' && (
                    <div style={{ marginBottom: 12 }}>
                      <Space>
                        <span>最大评分：</span>
                        <InputNumber
                          min={3}
                          max={10}
                          value={question.max_rating || 5}
                          onChange={(value) => updateQuestion(index, { max_rating: value })}
                        />
                        <span style={{ color: '#999' }}>分</span>
                      </Space>
                    </div>
                  )}

                  {question.question_type === 'single_choice' && question.options?.length > 0 && (
                    <div>
                      <Divider orientation="left" style={{ margin: '12px 0' }}>
                        逻辑跳转
                      </Divider>
                      {question.logic_jumps?.map((jump, jumpIndex) => (
                        <Space key={jump.id} style={{ marginBottom: 8, width: '100%' }} wrap>
                          <span>当选择</span>
                          <Select
                            value={jump.option_id}
                            onChange={(value) => updateLogicJump(index, jumpIndex, { option_id: value })}
                            style={{ width: 150 }}
                          >
                            {question.options?.map(opt => (
                              <Select.Option key={opt.id} value={opt.id}>
                                {opt.text || '未命名选项'}
                              </Select.Option>
                            ))}
                          </Select>
                          <span>时</span>
                          <Select
                            value={jump.end_survey ? 'end' : (jump.target_question_id || 'next')}
                            onChange={(value) => {
                              if (value === 'end') {
                                updateLogicJump(index, jumpIndex, { end_survey: true, target_question_id: null })
                              } else if (value === 'next') {
                                updateLogicJump(index, jumpIndex, { end_survey: false, target_question_id: null })
                              } else {
                                updateLogicJump(index, jumpIndex, { end_survey: false, target_question_id: value })
                              }
                            }}
                            style={{ width: 150 }}
                          >
                            <Select.Option value="next">继续下一题</Select.Option>
                            <Select.Option value="end">结束问卷</Select.Option>
                            {questions.filter((_, i) => i > index).map((q, i) => (
                              <Select.Option key={q.id} value={q.id}>
                                跳转到第 {index + 2 + i} 题
                              </Select.Option>
                            ))}
                          </Select>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => deleteLogicJump(index, jumpIndex)}
                          />
                        </Space>
                      ))}
                      <Button
                        type="dashed"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => addLogicJump(index)}
                      >
                        添加跳转规则
                      </Button>
                    </div>
                  )}
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title="问卷设置"
        open={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="allow_anonymous" label="允许匿名填写" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="require_login" label="需要登录才能填写" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" onClick={() => {
            form.validateFields()
            setSettingsVisible(false)
          }}>
            确定
          </Button>
        </Form>
      </Modal>

      <Modal
        title="分享问卷"
        open={shareVisible}
        onCancel={() => setShareVisible(false)}
        footer={null}
      >
        {surveyData && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              <p>问卷链接：</p>
              <Input
                value={`${window.location.origin}/survey/${surveyData.id}`}
                readOnly
                addonAfter={
                  <Button onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/survey/${surveyData.id}`)
                    message.success('已复制链接')
                  }}>
                    复制
                  </Button>
                }
              />
            </div>
            {surveyData.qr_code && (
              <div>
                <p>扫码填写：</p>
                <img
                  src={`http://localhost:8000${surveyData.qr_code}`}
                  alt="问卷二维码"
                  style={{ width: 200, height: 200 }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
