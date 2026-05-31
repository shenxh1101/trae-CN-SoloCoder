from typing import Dict, Tuple

class UrgencyService:
    def __init__(self):
        self.high_urgency_keywords = [
            "工伤", "受伤", "事故", "死亡", "职业病", "暴力", "威胁",
            "拖欠工资", "克扣工资", "拒不支付", "诈骗", "非法拘禁",
            "人身攻击", "性骚扰", "歧视", "报复", "辞退威胁",
            "紧急", "马上", "立刻", "急需", "求助", "救命",
            "仲裁", "起诉", "开庭", "法院", "强制执行", "查封"
        ]
        
        self.medium_urgency_keywords = [
            "辞退", "解雇", "开除", "离职", "辞职", "劳动争议",
            "赔偿", "补偿", "违约金", "罚款", "克扣",
            "加班", "加班费", "超时", "休息", "休假", "年假",
            "社保", "保险", "公积金", "医保", "养老",
            "合同", "协议", "违约", "违法", "违规",
            "歧视", "不公平", "不合理", "投诉", "举报"
        ]
        
        self.low_urgency_keywords = [
            "咨询", "了解", "询问", "想知道", "请问", "如何",
            "规定", "流程", "条件", "要求", "标准", "政策"
        ]

    def assess_urgency(self, question: str) -> Tuple[str, str, bool]:
        question_lower = question.lower()
        
        high_matches = [kw for kw in self.high_urgency_keywords if kw in question_lower]
        medium_matches = [kw for kw in self.medium_urgency_keywords if kw in question_lower]
        low_matches = [kw for kw in self.low_urgency_keywords if kw in question_lower]
        
        if high_matches:
            level = "high"
            reason = f"检测到紧急关键词：{', '.join(high_matches)}"
            recommend_lawyer = True
        elif len(medium_matches) >= 2:
            level = "medium"
            reason = f"涉及劳动权益争议关键词：{', '.join(medium_matches[:3])}"
            recommend_lawyer = False
        elif medium_matches:
            level = "medium"
            reason = f"涉及关键词：{', '.join(medium_matches)}"
            recommend_lawyer = False
        else:
            level = "low"
            reason = "一般法律咨询问题"
            recommend_lawyer = False
        
        return level, reason, recommend_lawyer
