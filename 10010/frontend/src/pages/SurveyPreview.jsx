import React, { useState, useEffect } from 'react'
import { Card, Button, Radio, Checkbox, Input, Rate, Space, message, Steps, Empty } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import AppLayout from '../components/AppLayout.jsx'

export default function SurveyPreview() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [survey, setSurvey] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchSurvey()
  }, [id])

  const fetchSurvey = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/surveys/${id}/`)
      setSurvey(data)
    } catch (error) {
      message.error('获取问卷失败')
    } finally {
      setLoading(false)
    }
  }

  const questions = survey?.questions || []
  const currentQuestion = questions[currentQuestionIndex]

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
        message.success('预览结束')
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

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const renderQuestion = () => {
    if (!currentQuestion) return <Empty description="暂无题目" />

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
          />
        )

      default:
        return <div>未知题型</div>
    }
  }

  if (!survey) return <div style={{ padding: 24 }}>加载中...</div>

  return (
    <AppLayout>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <h2>预览问卷</h2>
      </div>

      <div className="survey-preview">
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ marginBottom: 8 }}>{survey.title}</h1>
            {survey.description && (
              <p style={{ color: '#666' }}>{survey.description}</p>
            )}
          </div>

          <Steps
            current={currentQuestionIndex}
            items={questions.map((_, index) => ({ title: `Q${index + 1}` }))}
            style={{ marginBottom: 32 }}
          />

          <div style={{ minHeight: 200, marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16 }}>
              {currentQuestionIndex + 1}. {currentQuestion?.title}
              {currentQuestion?.required && <span style={{ color: 'red', marginLeft: 4 }}>*</span>}
            </h3>
            {renderQuestion()}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handlePrev} disabled={currentQuestionIndex === 0}>
              上一题
            </Button>
            {currentQuestionIndex < questions.length - 1 ? (
              <Button type="primary" onClick={handleNext}>
                下一题 <ArrowRightOutlined />
              </Button>
            ) : (
              <Button type="primary" onClick={() => message.success('预览完成！')}>
                提交 <CheckOutlined />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
