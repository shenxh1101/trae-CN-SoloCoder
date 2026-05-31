import os
import re
import json
import random
from typing import Dict, Optional
from datetime import datetime
from dotenv import load_dotenv


class MockLLMGenerator:
    DETAILED_TEMPLATES = {
        "bug": {
            "verbs": ["成功修复了", "已修复", "解决了", "定位并修复了", "排查并解决了"],
            "details": [
                "，涉及3个相关接口，测试验证通过15个用例，用户投诉量下降80%",
                "，修复了导致5%用户登录失败的问题，经回归测试确认无副作用",
                "，从发现到上线耗时2天，用户体验评分提升15%",
                "，修复了2个相关子问题，代码覆盖率从85%提升至92%",
                "，问题根因为竞态条件，修复后压测QPS提升20%"
            ],
            "problems": [
                "问题定位耗时超过预期，主要是日志信息不完整，已补充完善监控日志",
                "回归测试中发现2个边缘场景问题，需要在后续版本中优化",
                "修复方案与原有设计存在轻微冲突，需要重构相关模块"
            ],
            "next_week": [
                "持续监控修复效果，收集用户反馈",
                "完善相关自动化测试用例，防止问题复现",
                "总结问题根因，分享到技术团队"
            ],
            "in_progress": [
                "相关模块的代码重构工作，预计完成60%",
                "性能优化的后续迭代，目标是将响应时间降低30%"
            ]
        },
        "功能": {
            "verbs": ["完成了", "实现了", "开发了", "顺利完成了", "成功交付了"],
            "details": [
                "，包含8个核心功能点，代码量约2000行，单元测试覆盖率88%",
                "，经过3轮评审，5次迭代优化，用户验收通过率100%",
                "，从需求评审到上线耗时3周，提前2天完成交付",
                "，设计了完善的异常处理机制，支持降级和熔断",
                "，引入了新的技术方案，性能相比老版本提升50%"
            ],
            "problems": [
                "第三方接口响应不稳定，需要增加重试和降级机制",
                "部分边缘场景的交互逻辑需要产品进一步确认",
                "性能压测时发现数据库查询瓶颈，需要优化索引"
            ],
            "next_week": [
                "收集用户使用反馈，迭代优化功能体验",
                "完善相关技术文档和使用手册",
                "进行功能的性能优化专项"
            ],
            "in_progress": [
                "功能的AB测试方案设计和实施，预计下周出结果",
                "数据埋点和用户行为分析系统对接，完成70%"
            ]
        },
        "推荐": {
            "verbs": ["成功上线了", "完成了", "发布了", "顺利上线了", "成功推出了"],
            "details": [
                "，采用协同过滤+深度学习混合模型，点击率提升25%，转化率提高18%",
                "，支持冷启动场景，解决了新用户无数据的问题，覆盖率达到95%",
                "，AB测试显示人均浏览时长增加12%，跳出率降低8%",
                "，引入实时计算框架，推荐结果更新延迟从2小时降至5分钟",
                "，优化了特征工程，模型训练时间缩短40%，效果指标提升5%"
            ],
            "problems": [
                "部分长尾内容的推荐效果不佳，需要优化召回策略",
                "线上推理P99延迟略高于预期，需要进行性能优化",
                "冷启动场景的推荐多样性不足，需要增加探索机制"
            ],
            "next_week": [
                "优化长尾内容的召回策略，提升覆盖率",
                "进行推荐算法的AB测试，探索更优模型",
                "完善推荐效果的监控和告警机制"
            ],
            "in_progress": [
                "多目标排序模型的开发，预计完成50%",
                "用户画像系统的优化迭代，已完成数据清洗工作"
            ]
        },
        "测试": {
            "verbs": ["完成了", "执行了", "验证了", "完成了", "通过了"],
            "details": [
                "，覆盖120个测试用例，其中自动化用例80个，通过率100%",
                "，发现并协助修复了15个bug，其中P0级别3个，P1级别5个",
                "，进行了3轮回归测试，累计执行用例360个，遗留问题已清零",
                "，性能测试显示接口响应时间<200ms，并发支持500QPS",
                "，兼容性测试覆盖5个主流浏览器，3个操作系统版本"
            ],
            "problems": [
                "部分测试数据需要依赖其他团队，沟通协调成本较高",
                "自动化测试的维护成本较高，需要优化测试框架",
                "性能测试环境与生产环境存在差异，需要扩容"
            ],
            "next_week": [
                "优化自动化测试用例，提升执行效率",
                "准备下一版本的测试计划和用例设计",
                "完善测试数据的自动化生成工具"
            ],
            "in_progress": [
                "接口自动化测试框架的重构工作，预计完成60%",
                "性能测试脚本的录制和调试，已完成核心场景"
            ]
        },
        "会议": {
            "verbs": ["参加了", "出席了", "参与了", "主持了", "组织了"],
            "details": [
                "，与产品、设计、前端共5个角色讨论，输出会议纪要和12项待办",
                "，梳理了3个核心需求，明确了技术方案和排期，达成共识",
                "，评审了5个需求点，提出8条改进建议，其中6条已采纳",
                "，进行了2轮方案讨论，最终确定了技术选型和架构设计",
                "，对齐了下季度的工作目标和关键里程碑，输出行动项15项"
            ],
            "problems": [
                "部分需求边界不清晰，需要产品进一步明确",
                "参会人员时间难协调，会议效率有待提升",
                "技术方案涉及多方依赖，需要跨团队协调确认"
            ],
            "next_week": [
                "跟进会议待办事项的落地执行",
                "整理会议输出的技术方案文档",
                "协调相关方确认需求细节"
            ],
            "in_progress": [
                "技术方案的细化设计和评审工作，完成40%",
                "需求文档的整理和确认，已完成初稿"
            ]
        },
        "设计": {
            "verbs": ["完成了", "设计了", "输出了", "制定了", "规划了"],
            "details": [
                "，包含架构图、时序图共8张，接口定义20个，已通过评审",
                "，考虑了高可用、容灾降级等非功能性需求，支持99.9%可用性",
                "，对比了3种技术方案，从成本、性能、可维护性多维度评估选型",
                "，设计了完善的监控告警方案，覆盖指标50+",
                "，输出详细的技术方案文档，共45页，已归档"
            ],
            "problems": [
                "部分技术选型需要与运维团队确认可行性",
                "方案中涉及的新技术存在学习成本，需要培训",
                "与现有系统的兼容方案需要进一步细化"
            ],
            "next_week": [
                "完善技术方案的细节，补充相关文档",
                "进行技术方案的分享和培训",
                "跟进方案评审的反馈意见，迭代优化"
            ],
            "in_progress": [
                "技术方案的POC验证工作，预计完成50%",
                "相关技术选型的调研和对比测试，已完成首轮"
            ]
        },
        "优化": {
            "verbs": ["优化了", "改进了", "提升了", "完成了", "实现了"],
            "details": [
                "，页面加载速度从3s降至1.2s，提升60%，用户体验明显改善",
                "，接口响应时间降低40%，数据库QPS提升30%，CPU使用率下降25%",
                "，重构了核心模块代码，可读性和可维护性大幅提升，bug率降低30%",
                "，优化了用户操作流程，减少2个步骤，转化率提升15%",
                "，内存使用优化200MB，服务启动时间缩短30%"
            ],
            "problems": [
                "优化引入的新技术方案存在学习曲线",
                "部分优化需要数据验证效果，周期较长",
                "与历史数据的兼容需要额外的迁移工作"
            ],
            "next_week": [
                "持续监控优化效果，收集关键指标",
                "总结优化经验，形成最佳实践分享",
                "识别更多可优化的点，规划下一轮优化"
            ],
            "in_progress": [
                "第二轮性能优化工作，目标是再提升20%，预计完成30%",
                "用户体验优化的AB测试，已上线运行"
            ]
        },
        "文档": {
            "verbs": ["编写了", "完成了", "整理了", "输出了", "更新了"],
            "details": [
                "，共30页，包含接口文档、部署文档、运维手册，已同步到知识库",
                "，更新了15个接口的字段说明，补充了示例代码，可读性评分90分",
                "，整理了常见问题FAQ共50条，减少80%的重复咨询",
                "，编写了新员工入职培训材料，包含3个实操练习",
                "，输出技术方案评审纪要和决策记录，共12份文档"
            ],
            "problems": [
                "部分历史文档需要同步更新，工作量较大",
                "文档的版本管理需要完善，存在不同步的问题",
                "缺少统一的文档模板和规范，质量参差不齐"
            ],
            "next_week": [
                "完善文档的版本管理机制",
                "制定文档编写规范和模板",
                "同步更新历史文档，确保信息准确"
            ],
            "in_progress": [
                "API文档的自动化生成工具开发，预计完成60%",
                "知识库的分类和标签体系重构，已完成梳理"
            ]
        },
        "其他": {
            "verbs": ["完成了", "推进了", "进行了", "执行了", "落实了"],
            "details": [
                "，按计划顺利完成，达到预期目标",
                "，获得了相关方的认可和好评",
                "，过程中积累了宝贵的经验",
                "，为后续工作奠定了良好基础",
                "，整体进展符合预期"
            ],
            "problems": [
                "工作的优先级需要进一步明确",
                "跨部门协作的效率有待提升",
                "时间预估不够准确，需要优化排期方法"
            ],
            "next_week": [
                "总结经验，优化工作流程",
                "梳理后续工作的优先级",
                "加强与相关方的沟通同步"
            ],
            "in_progress": [
                "相关工作的后续推进，按计划进行中",
                "流程优化的方案制定，已完成初稿"
            ]
        }
    }

    BRIEF_TEMPLATES = {
        "bug": {
            "verbs": ["修复了", "解决了", "已修复"],
            "problems": ["bug修复过程中定位耗时较长"],
            "next_week": ["监控修复效果", "补充测试用例"],
            "in_progress": ["相关模块优化"]
        },
        "功能": {
            "verbs": ["完成了", "实现了", "开发了"],
            "problems": ["部分细节待确认"],
            "next_week": ["收集用户反馈", "完善文档"],
            "in_progress": ["功能迭代优化"]
        },
        "推荐": {
            "verbs": ["上线了", "发布了", "完成了"],
            "problems": ["长尾推荐效果待优化"],
            "next_week": ["优化召回策略", "效果监控"],
            "in_progress": ["算法迭代"]
        },
        "测试": {
            "verbs": ["完成了", "执行了", "验证了"],
            "problems": ["测试环境待优化"],
            "next_week": ["自动化用例优化", "下个版本测试准备"],
            "in_progress": ["测试框架重构"]
        },
        "会议": {
            "verbs": ["参加了", "出席了", "参与了"],
            "problems": ["部分需求待澄清"],
            "next_week": ["跟进会议待办", "整理输出文档"],
            "in_progress": ["方案细化"]
        },
        "设计": {
            "verbs": ["完成了", "设计了", "输出了"],
            "problems": ["技术选型待确认"],
            "next_week": ["方案分享", "跟进评审反馈"],
            "in_progress": ["POC验证"]
        },
        "优化": {
            "verbs": ["优化了", "改进了", "提升了"],
            "problems": ["效果验证周期较长"],
            "next_week": ["效果监控", "下一轮优化规划"],
            "in_progress": ["第二轮优化"]
        },
        "文档": {
            "verbs": ["编写了", "完成了", "整理了"],
            "problems": ["历史文档待同步"],
            "next_week": ["文档规范制定", "版本管理完善"],
            "in_progress": ["文档自动化"]
        },
        "其他": {
            "verbs": ["完成了", "推进了", "进行了"],
            "problems": ["优先级需明确"],
            "next_week": ["流程优化", "优先级梳理"],
            "in_progress": ["后续推进"]
        }
    }

    @staticmethod
    def _match_template(item):
        priority_keywords = [
            ("bug", ["bug", "缺陷", "故障", "异常"]),
            ("推荐", ["推荐", "算法", "模型", "召回", "排序"]),
            ("测试", ["测试", "用例", "回归", "验证", "联调", "验收"]),
            ("会议", ["会议", "评审", "讨论", "对齐", "同步", "需求评审"]),
            ("优化", ["优化", "性能", "重构", "改进", "提升", "加速"]),
            ("设计", ["设计", "方案", "架构", "技术方案"]),
            ("文档", ["文档", "wiki", "手册", "faq", "知识库"]),
            ("功能", ["功能", "模块", "系统", "平台", "开发", "实现", "需求"]),
        ]
        
        item_lower = item.lower()
        for template_key, kws in priority_keywords:
            for kw in kws:
                if kw.lower() in item_lower:
                    return template_key
        
        return "其他"

    @staticmethod
    def _clean_item(item):
        action_only_words = ["修复", "上线", "参加", "开发", "设计", "优化", "编写", 
                            "对接", "沟通", "实现", "完成", "进行",
                            "整理", "输出", "制定", "规划", "执行",
                            "出席", "参与", "主持", "组织", "发布", "推出",
                            "改进", "提升", "加速", "重构"]
        
        clean = item
        for aw in action_only_words:
            if aw + " " in clean or clean.startswith(aw):
                clean = clean.replace(aw, "", 1)
        
        clean = clean.strip("，。、；,.; ")
        return clean if clean else item

    @staticmethod
    def generate_mock_report(work_items, style="detailed"):
        from datetime import datetime
        
        is_detailed = style == "detailed"
        templates = MockLLMGenerator.DETAILED_TEMPLATES if is_detailed else MockLLMGenerator.BRIEF_TEMPLATES
        
        completed_items = []
        in_progress_items = []
        problems = []
        next_week = []
        
        item_matches = []
        for item in work_items:
            template_key = MockLLMGenerator._match_template(item)
            item_matches.append((item, template_key))
        
        for idx, (item, template_key) in enumerate(item_matches):
            template = templates.get(template_key, templates["其他"])
            verb = random.choice(template["verbs"])
            clean_item = MockLLMGenerator._clean_item(item)
            
            item_core = item
            for aw in ["修复", "上线", "参加", "开发", "设计", "优化", "编写", 
                       "对接", "沟通", "实现", "完成", "进行", "整理", "输出",
                       "制定", "规划", "执行", "验证", "出席", "参与", "主持",
                       "组织", "发布", "推出", "改进", "提升", "加速", "重构"]:
                if item_core.startswith(aw):
                    item_core = item_core[len(aw):].lstrip("，。、；,.; ")
                    break
            
            if is_detailed:
                detail = random.choice(template["details"])
                completed_items.append(f"{verb}{item_core}{detail}")
            else:
                completed_items.append(f"{verb}{item_core}")
            
            if idx < len(item_matches) - 1 and is_detailed and len(in_progress_items) < 2:
                if template["in_progress"]:
                    ip_text = random.choice(template["in_progress"])
                    if not any(clean_item in ip for ip in in_progress_items):
                        in_progress_items.append(ip_text)
            elif idx < len(item_matches) - 1 and not is_detailed and len(in_progress_items) < 1:
                if template["in_progress"]:
                    ip_text = random.choice(template["in_progress"])
                    in_progress_items.append(ip_text)
            
            if is_detailed and len(problems) < 3:
                if template["problems"]:
                    prob = random.choice(template["problems"])
                    if prob not in problems:
                        problems.append(prob)
            elif not is_detailed and len(problems) < 2:
                if template["problems"]:
                    prob = random.choice(template["problems"])
                    if prob not in problems:
                        problems.append(prob)
            
            if is_detailed and len(next_week) < 4:
                if template["next_week"]:
                    for nw in template["next_week"]:
                        if len(next_week) < 4 and nw not in next_week:
                            next_week.append(nw)
            elif not is_detailed and len(next_week) < 3:
                if template["next_week"]:
                    for nw in template["next_week"]:
                        if len(next_week) < 3 and nw not in next_week:
                            next_week.append(nw)
        
        if not in_progress_items:
            if is_detailed:
                in_progress_items.append("跨团队协作项目的推进工作，预计下周完成主要里程碑")
            else:
                in_progress_items.append("跨团队协作推进")
        
        if not problems:
            if is_detailed:
                problems.append("部分工作的时间预估不够准确，后续需要优化排期方法")
                problems.append("跨部门协作的沟通效率有待提升，已制定改进方案")
            else:
                problems.append("时间预估待优化")
                problems.append("沟通效率待提升")
        
        if is_detailed and len(next_week) < 4:
            next_week.append("进行代码review和技术分享，提升团队整体技术水平")
            next_week.append("参与团队周会，同步项目进展和风险")
        elif not is_detailed and len(next_week) < 3:
            next_week.append("代码review和技术分享")
            next_week.append("团队周会")
        
        time_analysis = MockLLMGenerator._analyze_time(work_items)
        
        todo_list = []
        for task in next_week[:4]:
            priority_words = ["紧急", "重要", "必须", "优化", "推进", "监控", "完善"]
            has_high = any(pw in task for pw in priority_words)
            priority = "high" if has_high else "medium"
            todo_list.append({
                "task": task,
                "priority": priority
            })
        
        title_suffix = ""
        if len(work_items) == 1:
            title_suffix = f"-{MockLLMGenerator._clean_item(work_items[0])}"
        elif len(work_items) == 2:
            title_suffix = f"-{MockLLMGenerator._clean_item(work_items[0])}等"
        
        result = {
            "title": f"{datetime.now().strftime('%Y年%m月第%d周')}工作周报{title_suffix}",
            "date": datetime.now().strftime("%Y年%m月%d日"),
            "author": "",
            "sections": {
                "本周完成": completed_items,
                "进行中工作": in_progress_items,
                "遇到的问题": problems,
                "下周计划": next_week
            },
            "time_analysis": time_analysis,
            "todo_list": todo_list,
            "summary": MockLLMGenerator._generate_summary(completed_items, work_items, is_detailed)
        }
        
        return result

    @staticmethod
    def _generate_summary(completed_items, work_items, is_detailed):
        clean_items = [MockLLMGenerator._clean_item(item) for item in work_items[:2]]
        items_text = "、".join(clean_items)
        
        if is_detailed:
            return (f"本周主要聚焦于{items_text}等{len(work_items)}项重点工作，"
                   f"各项任务均按计划推进，整体进展顺利。"
                   f"完成了{len(completed_items)}项具体成果，达到了预期目标。"
                   f"下周将继续推进后续工作，确保项目按期交付。")
        else:
            return (f"本周完成{items_text}等{len(work_items)}项工作，"
                   f"进展顺利。下周继续推进各项任务。")

    @staticmethod
    def _analyze_time(work_items):
        from collections import defaultdict
        
        category_priority = [
            ("会议", ["会议", "评审", "讨论", "对齐", "同步", "周会", "站会", "需求评审"]),
            ("测试", ["测试", "联调", "验收", "验证", "回归", "用例", "测试用例"]),
            ("设计", ["设计", "方案", "架构", "UI", "原型", "技术方案"]),
            ("文档", ["文档", "wiki", "手册", "faq", "知识库", "编写", "整理"]),
            ("开发", ["开发", "编码", "实现", "修复", "bug", "功能", "模块", "重构", "优化",
                     "上线", "发布", "推荐", "算法", "模型", "系统", "平台", "接口"]),
            ("沟通", ["沟通", "对接", "协调", "答疑"]),
            ("学习", ["学习", "研究", "调研", "分享", "培训"]),
        ]
        
        scores = defaultdict(int)
        for item in work_items:
            item_lower = item.lower()
            matched = False
            for category, keywords in category_priority:
                for kw in keywords:
                    if kw.lower() in item_lower:
                        scores[category] += 1
                        matched = True
                        break
                if matched:
                    break
            if not matched:
                scores["其他"] += 1
        
        total = sum(scores.values()) if scores else 1
        result = {}
        for cat, score in scores.items():
            result[cat] = round((score / total) * 100)
        
        if sum(result.values()) != 100:
            diff = 100 - sum(result.values())
            max_cat = max(result.items(), key=lambda x: x[1])[0]
            result[max_cat] += diff
        
        return dict(sorted(result.items(), key=lambda x: -x[1]))


class LLMClient:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, 
                 model: Optional[str] = None, use_mock: Optional[bool] = None):
        load_dotenv()
        
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        
        mock_env = os.getenv("USE_MOCK_LLM", "").lower() in ["true", "1", "yes"]
        self.use_mock = use_mock if use_mock is not None else (mock_env or not self.api_key)
        
        if not self.use_mock and not self.api_key:
            raise ValueError("OpenAI API key not found. Please set OPENAI_API_KEY environment variable or set USE_MOCK_LLM=true for demo mode.")
        
        if not self.use_mock:
            try:
                from openai import OpenAI
                self.client = OpenAI(
                    api_key=self.api_key,
                    base_url=self.base_url
                )
            except ImportError:
                print("Warning: openai package not available, falling back to mock mode")
                self.use_mock = True
        
        if self.use_mock:
            print("ℹ️  运行在Mock模式下（演示用途）")

    def generate(self, prompt: str, system_prompt: Optional[str] = None, 
                 temperature: float = 0.7, max_tokens: int = 2000) -> str:
        if self.use_mock:
            return self._mock_generate(prompt, system_prompt)
        
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            raise Exception(f"LLM generation failed: {str(e)}")

    def generate_structured(self, prompt: str, system_prompt: Optional[str] = None,
                            temperature: float = 0.7) -> Dict:
        import json
        
        if self.use_mock:
            return self._mock_generate_structured(prompt, system_prompt)
        
        json_system_prompt = "你是一个专业的助手，必须以有效的JSON格式返回结果。"
        if system_prompt:
            json_system_prompt = f"{system_prompt}\n\n{json_system_prompt}"
        
        result = self.generate(prompt, json_system_prompt, temperature, max_tokens=3000)
        
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            try:
                start = result.find('{')
                end = result.rfind('}') + 1
                if start != -1 and end != -1:
                    return json.loads(result[start:end])
            except:
                pass
            
            return {"raw_text": result}

    def _mock_generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        work_items = self._extract_work_items(prompt)
        
        full_text = prompt + (system_prompt or "")
        style = "detailed" if "详细" in full_text or "detailed" in full_text.lower() else "brief"
        
        if "git" in full_text.lower() or "commit" in full_text.lower():
            result = MockLLMGenerator.generate_mock_report(
                ["代码提交分析", "功能开发", "bug修复"],
                style
            )
        else:
            result = MockLLMGenerator.generate_mock_report(work_items, style)
        
        return json.dumps(result, ensure_ascii=False)

    def _mock_generate_structured(self, prompt: str, system_prompt: Optional[str] = None) -> Dict:
        work_items = self._extract_work_items(prompt)
        
        full_text = prompt + (system_prompt or "")
        style = "detailed" if "详细" in full_text or "detailed" in full_text.lower() else "brief"
        
        if "git" in full_text.lower() or "commit" in full_text.lower():
            return MockLLMGenerator.generate_mock_report(
                ["代码提交分析", "功能开发", "bug修复"],
                style
            )
        
        return MockLLMGenerator.generate_mock_report(work_items, style)

    def _extract_work_items(self, prompt: str) -> list:
        import re
        
        items = []
        
        bullet_pattern = r'[-*]\s*([^\n]+)'
        matches = re.findall(bullet_pattern, prompt)
        if matches:
            items.extend([m.strip() for m in matches if m.strip()])
        
        if not items:
            lines = prompt.split('\n')
            for line in lines:
                line = line.strip()
                if line and not line.startswith('```') and not line.startswith('#') and not line.startswith('请'):
                    if '、' in line:
                        items.extend([x.strip() for x in line.split('、') if x.strip() and len(x.strip()) < 50])
        
        if not items:
            items = ["完成了本周工作", "推进了项目进度", "参加了团队会议"]
        
        return items[:10]
