from .models import MeetingType


class MeetingTypeConfig:
    STANDUP_PROMPT = """
    这是一个敏捷站会（Daily Standup）。
    重点关注：
    1. 每个人昨天完成了什么
    2. 每个人今天计划做什么
    3. 遇到的障碍和问题
    4. 快速决策和行动项
    提取时特别注意识别：
    - 快速识别每个团队成员的状态更新
    - 重点提取明确的行动项和负责人
    - 标记阻塞问题
    """

    REVIEW_PROMPT = """
    这是一个项目评审会（Project Review）。
    重点关注：
    1. 项目进度和里程碑达成情况
    2. 成果展示和成果评估
    3. 问题分析和经验教训
    4. 下一步计划和资源需求
    提取时特别注意识别：
    - 识别项目状态和关键指标
    - 重点提取决策和正式行动项
    - 识别风险和问题
    """

    BRAINSTORM_PROMPT = """
    这是一个头脑风暴会议（Brainstorming）。
    重点关注：
    1. 创意和想法收集
    2. 创意分类和筛选
    3. 可行性讨论
    4. 后续行动规划
    提取时特别注意识别：
    - 记录所有有价值的创意
    - 识别被选中的方案
    - 提取后续跟进的行动项
    """

    GENERAL_PROMPT = """
    这是一个普通会议。
    全面提取会议内容，包括：
    1. 会议主题
    2. 讨论要点
    3. 决策内容
    4. 行动项
    """

    @classmethod
    def get_prompt(cls, meeting_type: MeetingType) -> str:
        mapping = {
            MeetingType.STANDUP: cls.STANDUP_PROMPT,
            MeetingType.REVIEW: cls.REVIEW_PROMPT,
            MeetingType.BRAINSTORM: cls.BRAINSTORM_PROMPT,
            MeetingType.GENERAL: cls.GENERAL_PROMPT,
        }
        return mapping.get(meeting_type, cls.GENERAL_PROMPT)

    @classmethod
    def get_focus_areas(cls, meeting_type: MeetingType) -> list:
        mapping = {
            MeetingType.STANDUP: ["obstacles", "progress", "plans", "blockers"],
            MeetingType.REVIEW: ["milestones", "metrics", "risks", "decisions"],
            MeetingType.BRAINSTORM: ["ideas", "innovation", "creativity", "followups"],
            MeetingType.GENERAL: ["discussion", "decisions", "actions"],
        }
        return mapping.get(meeting_type, ["discussion", "decisions", "actions"])
