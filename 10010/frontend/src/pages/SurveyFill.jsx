import React, { useState, useEffect } from 'react'
import { Card, Button, Radio, Checkbox, Input, Rate, Space, message, Result, Spin, Form } from 'antd'
import { ArrowRightOutlined, CheckOutlined, UserOutlined, MailOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import api from '../api'

export default function SurveyFill() {
  const { id } = useParams()
  const [survey, setSurvey] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [respondentInfo, setRespondentInfo] = useState({ name: '', email: '' })

  useEffect(() => {
    fetchSurvey()
  }, [id])

  const fetchSurvey = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/surveys/${id}/public/`)
      setSurvey(data)
    } catch (error) {
      message.error(error.response?.data?.detail || '问卷不存在或未发布')
    } finally {
      setLoading(false)
    }
  }

  const questions = survey?.questions || []
  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleNext = () => {
    if (!currentQuestion) return
    
    if (currentQuestion.required && !answers[currentQuestion.id]) {
      message.warning('请先回答当前问题')
      return
    }

    const selectedAnswer = answers[currentQuestion.id]
    const logicJump = currentQuestion.logic_jumps?.find(j => {
      if (currentQuestion.question_type === 'single_choice') {
        return j.option_id === selectedAnswer
      }
      return false
    })

    if (logicJump) {
      if (logicJump.end_survey) {
        handleSubmit()
        return
      }
      if (logicJump.target_question_id) {
        const targetIndex = questions.findIndex(q => q.id === logicJump.target_question_id)
        if (targetIndex !== -1) {
          setCurrentQuestionIndex(targetIndex)
          return
        }
      }
    }

    if (!isLastQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const formattedAnswers = questions
        .filter(q => answers[q.id])
        .map(q => {
          const answer = { question_id: q.id }
          if (q.question_type === 'single_choice') {
            answer.selected_option_ids = [answers[q.id]]
          } else if (q.question_type === 'multiple_choice') {
            answer.selected_option_ids = answers[q.id]
          } else if (q.question_type === 'text') {
            answer.text_answer = answers[q.id]
          } else if (q.question_type === 'rating') {
            answer.rating_value = answers[q.id]
          }
          return answer
        })

      const payload = {
        ...respondentInfo,
        answers: formattedAnswers,
      }

      await api.post(`/surveys/${id}/submit/`, payload)
      setSubmitted(true)
    } catch (error) {
      message.error('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const renderQuestion = () => {
    if (!currentQuestion) return null

    switch (currentQuestion.question_type) {
      case 'single_choice':
        return (
          <Radio.Group
            value={answers[currentQuestion.id]}
            onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {currentQuestion.options?.map(option => (
                <Radio key={option.id} value={option.id}>
                  {option.text}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )

      case 'multiple_choice':
        return (
          <Checkbox.Group
            value={answers[currentQuestion.id] || []}
            onChange={(value) => handleAnswer(currentQuestion.id, value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {currentQuestion.options?.map(option => (
                <Checkbox key={option.id} value={option.id}>
                  {option.text}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        )

      case 'text':
        return (
          <Input.TextArea
            rows={4}
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
            placeholder="请输入您的回答"
          />
        )

      case 'rating':
        return (
          <Rate
            count={currentQuestion.max_rating || 5}
            value={answers[currentQuestion.id] || 0}
            onChange={(value) => handleAnswer(currentQuestion.id, value)}
            size="large"
          />
        )

      default:
        return <div>未知题型</div>
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!survey) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Result status="404" title="问卷不存在" subTitle="该问卷可能已被删除或未发布" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="survey-page">
        <div className="survey-container">
          <Result
            status="success"
            title="提交成功！"
            subTitle="感谢您的参与，您的回答已成功提交。"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="survey-page">
      <div className="survey-container">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ marginBottom: 8, color: '#1890ff' }}>{survey.title}</h1>
          {survey.description && (
            <p style={{ color: '#666', fontSize: 16 }}>{survey.description}</p>
          )}
        </div>

        {currentQuestionIndex === 0 && survey.allow_anonymous && (
          <Card style={{ marginBottom: 24, background: '#f5f5f5' }}>
            <h4 style={{ marginBottom: 16 }}>您的信息（选填）</h4>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                prefix={<UserOutlined />}
                placeholder="姓名"
                value={respondentInfo.name}
                onChange={(e) => setRespondentInfo({ ...respondentInfo, name: e.target.value })}
              />
              <Input
                prefix={<MailOutlined />}
                placeholder="邮箱"
                value={respondentInfo.email}
                onChange={(e) => setRespondentInfo({ ...respondentInfo, email: e.target.value })}
              />
            </Space>
          </Card>
        )}

        <div style={{ marginBottom: 16, color: '#999', textAlign: 'center' }}>
          第 {currentQuestionIndex + 1} / {questions.length} 题
        </div>

        <div style={{ minHeight: 200, marginBottom: 32 }}>
          <h3 style={{ marginBottom: 20, fontSize: 18 }}>
            {currentQuestion?.title}
            {currentQuestion?.required && <span style={{ color: 'red', marginLeft: 4 }}>*</span>}
          </h3>
          {renderQuestion()}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {!isLastQuestion ? (
            <Button type="primary" size="large" onClick={handleNext}>
              下一题 <ArrowRightOutlined />
            </Button>
          ) : (
            <Button type="primary" size="large" onClick={handleSubmit} loading={submitting}>
              提交 <CheckOutlined />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
