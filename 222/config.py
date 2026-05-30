import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "")
    
    FILLER_WORDS = ["嗯", "啊", "哦", "呃", "那个", "这个", "就是", "然后", "对吧", "嗯哼", "哦对", "哎呀"]
    
    TIME_KEYWORDS = [
        "今天", "明天", "后天", "大后天",
        "周一", "周二", "周三", "周四", "周五", "周六", "周日",
        "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日",
        "下周一", "下周二", "下周三", "下周四", "下周五", "下周六", "下周日",
        "这周一", "这周二", "这周三", "这周四", "这周五", "这周六", "这周日",
        "上午", "下午", "晚上", "早上", "中午", "凌晨",
        "点", "分", "时",
        "月", "日", "号"
    ]
    
    TODO_KEYWORDS = [
        "负责", "需要", "应该", "必须", "得", "要",
        "完成", "提交", "准备", "整理", "发送", "跟进",
        "截止", "之前", "以前"
    ]
    
    FEEDBACK_DIR = "feedback"
    OUTPUT_DIR = "output"
    BATCH_DIR = "batch_input"
    
    ESTIMATED_WORDS_PER_MINUTE = 150
