import os
import json
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()


class LLMClient:
    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4")
    
    def generate_roadmap(self, skill: str, time_budget: Optional[Dict[str, Any]] = None,
                        mastered_skills: Optional[List[str]] = None) -> Dict[str, Any]:
        if self.use_mock or not self.api_key:
            return self._generate_mock_roadmap(skill, time_budget, mastered_skills)
        
        return self._call_llm_api(skill, time_budget, mastered_skills)
    
    def _generate_mock_roadmap(self, skill: str, time_budget: Optional[Dict[str, Any]],
                              mastered_skills: Optional[List[str]]) -> Dict[str, Any]:
        mock_data = self._get_mock_roadmap_data(skill)
        
        if mastered_skills:
            mock_data = self._filter_mastered_content(mock_data, mastered_skills)
        
        if time_budget:
            mock_data = self._adjust_for_time_budget(mock_data, time_budget)
        
        mock_data["time_budget"] = time_budget
        mock_data["skill_tree"] = {"mastered_skills": mastered_skills or []}
        
        return mock_data
    
    def _get_mock_roadmap_data(self, skill: str) -> Dict[str, Any]:
        skill_lower = skill.lower()
        
        if ("python" in skill_lower and "data" in skill_lower) or \
           ("python" in skill_lower and "数据" in skill) or \
           ("数据分析" in skill):
            return self._python_data_analysis_roadmap()
        elif "前端" in skill or "frontend" in skill_lower or "web" in skill_lower:
            return self._frontend_roadmap()
        elif "机器学习" in skill or "machine learning" in skill_lower or "ml" in skill_lower:
            return self._machine_learning_roadmap()
        elif "后端" in skill or "backend" in skill_lower:
            return self._backend_roadmap()
        else:
            return self._generic_skill_roadmap(skill)
    
    def _python_data_analysis_roadmap(self) -> Dict[str, Any]:
        return {
            "skill": "Python数据分析",
            "difficulty": 4,
            "phases": [
                {
                    "id": "phase-1",
                    "name": "Python基础",
                    "description": "掌握Python编程语言的核心概念和语法",
                    "objectives": [
                        "掌握Python基础语法和数据类型",
                        "理解函数、模块和包的概念",
                        "学会使用面向对象编程",
                        "掌握异常处理和文件操作"
                    ],
                    "resources": [
                        {"name": "《Python编程：从入门到实践》", "type": "book", "description": "经典Python入门书籍", "url": "https://example.com/python-book"},
                        {"name": "Codecademy Python课程", "type": "course", "description": "交互式Python学习平台", "url": "https://codecademy.com"},
                        {"name": "Python官方教程", "type": "documentation", "description": "最权威的Python学习资源", "url": "https://docs.python.org"},
                        {"name": "LeetCode Python练习题", "type": "project", "description": "通过刷题巩固Python基础", "url": "https://leetcode.com"}
                    ],
                    "estimated_hours": 40,
                    "difficulty": 2,
                    "dependencies": []
                },
                {
                    "id": "phase-2",
                    "name": "数据处理库",
                    "description": "学习使用NumPy和Pandas进行数据处理",
                    "objectives": [
                        "掌握NumPy数组操作",
                        "精通Pandas数据处理",
                        "学会数据清洗和转换",
                        "掌握时间序列处理"
                    ],
                    "resources": [
                        {"name": "《利用Python进行数据分析》", "type": "book", "description": "Wes McKinney经典著作", "url": "https://example.com/pydata-book"},
                        {"name": "Kaggle Pandas教程", "type": "course", "description": "实战导向的Pandas学习", "url": "https://kaggle.com/learn"},
                        {"name": "NumPy官方文档", "type": "documentation", "description": "NumPy权威参考", "url": "https://numpy.org/doc"},
                        {"name": "泰坦尼克号数据分析项目", "type": "project", "description": "经典数据分析入门项目", "url": "https://kaggle.com/c/titanic"}
                    ],
                    "estimated_hours": 50,
                    "difficulty": 3,
                    "dependencies": ["phase-1"]
                },
                {
                    "id": "phase-3",
                    "name": "数据可视化",
                    "description": "使用Matplotlib和Seaborn创建专业图表",
                    "objectives": [
                        "掌握Matplotlib基础绘图",
                        "学会使用Seaborn高级图表",
                        "理解数据可视化原则",
                        "创建交互式可视化"
                    ],
                    "resources": [
                        {"name": "《Python数据可视化手册》", "type": "book", "description": "全面的数据可视化指南", "url": "https://example.com/viz-book"},
                        {"name": "DataCamp可视化课程", "type": "course", "description": "系统学习数据可视化", "url": "https://datacamp.com"},
                        {"name": "Matplotlib画廊", "type": "documentation", "description": "丰富的图表示例", "url": "https://matplotlib.org/gallery"},
                        {"name": "全球疫情数据可视化", "type": "project", "description": "综合可视化项目", "url": "https://example.com/covid-project"}
                    ],
                    "estimated_hours": 35,
                    "difficulty": 3,
                    "dependencies": ["phase-2"]
                },
                {
                    "id": "phase-4",
                    "name": "统计分析",
                    "description": "掌握统计学基础和假设检验",
                    "objectives": [
                        "理解描述性统计和推断性统计",
                        "掌握假设检验方法",
                        "学会相关性和回归分析",
                        "掌握A/B测试方法"
                    ],
                    "resources": [
                        {"name": "《统计学》", "type": "book", "description": "经典统计学教材", "url": "https://example.com/stats-book"},
                        {"name": "Coursera统计学专项", "type": "course", "description": "系统学习统计学", "url": "https://coursera.org"},
                        {"name": "SciPy统计文档", "type": "documentation", "description": "Python统计函数参考", "url": "https://docs.scipy.org/doc/scipy/reference/stats.html"},
                        {"name": "用户行为A/B测试分析", "type": "project", "description": "应用统计方法的实战项目", "url": "https://example.com/ab-test-project"}
                    ],
                    "estimated_hours": 45,
                    "difficulty": 4,
                    "dependencies": ["phase-2"]
                },
                {
                    "id": "phase-5",
                    "name": "机器学习基础",
                    "description": "使用Scikit-learn进行机器学习建模",
                    "objectives": [
                        "理解监督学习和无监督学习",
                        "掌握常用分类和回归算法",
                        "学会模型评估和调优",
                        "掌握特征工程方法"
                    ],
                    "resources": [
                        {"name": "《机器学习实战》", "type": "book", "description": "Python机器学习入门", "url": "https://example.com/ml-book"},
                        {"name": "Andrew Ng机器学习课程", "type": "course", "description": "经典机器学习课程", "url": "https://coursera.org"},
                        {"name": "Scikit-learn文档", "type": "documentation", "description": "机器学习库权威参考", "url": "https://scikit-learn.org"},
                        {"name": "房价预测机器学习项目", "type": "project", "description": "综合机器学习实战", "url": "https://kaggle.com/c/house-prices-advanced-regression-techniques"}
                    ],
                    "estimated_hours": 60,
                    "difficulty": 5,
                    "dependencies": ["phase-3", "phase-4"]
                }
            ]
        }
    
    def _frontend_roadmap(self) -> Dict[str, Any]:
        return {
            "skill": "前端开发",
            "difficulty": 4,
            "phases": [
                {
                    "id": "phase-1",
                    "name": "HTML/CSS基础",
                    "description": "掌握网页结构和样式设计",
                    "objectives": [
                        "掌握HTML标签和语义化",
                        "精通CSS布局和定位",
                        "理解响应式设计",
                        "学会使用CSS动画"
                    ],
                    "resources": [
                        {"name": "《HTML与CSS设计与构建网站》", "type": "book", "description": "前端入门经典", "url": "https://example.com/html-css-book"},
                        {"name": "freeCodeCamp响应式网页设计", "type": "course", "description": "免费系统的前端课程", "url": "https://freecodecamp.org"},
                        {"name": "MDN Web文档", "type": "documentation", "description": "Web开发权威文档", "url": "https://developer.mozilla.org"},
                        {"name": "个人作品集网站", "type": "project", "description": "创建个人展示网站", "url": "https://example.com/portfolio-project"}
                    ],
                    "estimated_hours": 50,
                    "difficulty": 2,
                    "dependencies": []
                },
                {
                    "id": "phase-2",
                    "name": "JavaScript核心",
                    "description": "掌握JavaScript编程语言",
                    "objectives": [
                        "掌握ES6+新特性",
                        "理解异步编程",
                        "学会DOM操作",
                        "掌握事件处理"
                    ],
                    "resources": [
                        {"name": "《JavaScript高级程序设计》", "type": "book", "description": "JavaScript红宝书", "url": "https://example.com/js-book"},
                        {"name": "JavaScript.info教程", "type": "course", "description": "现代JavaScript教程", "url": "https://javascript.info"},
                        {"name": "ES6标准入门", "type": "documentation", "description": "ES6特性详解", "url": "https://es6.ruanyifeng.com"},
                        {"name": "TodoList应用", "type": "project", "description": "原生JS实现待办事项", "url": "https://example.com/todo-project"}
                    ],
                    "estimated_hours": 60,
                    "difficulty": 3,
                    "dependencies": ["phase-1"]
                },
                {
                    "id": "phase-3",
                    "name": "前端框架",
                    "description": "学习React/Vue现代前端框架",
                    "objectives": [
                        "掌握组件化开发",
                        "理解状态管理",
                        "学会路由配置",
                        "掌握框架生态"
                    ],
                    "resources": [
                        {"name": "《React设计模式与最佳实践》", "type": "book", "description": "React进阶书籍", "url": "https://example.com/react-book"},
                        {"name": "React官方教程", "type": "course", "description": "React官方学习路径", "url": "https://react.dev"},
                        {"name": "Vue.js文档", "type": "documentation", "description": "Vue官方文档", "url": "https://vuejs.org"},
                        {"name": "电商平台前端", "type": "project", "description": "完整前端项目实战", "url": "https://example.com/ecommerce-project"}
                    ],
                    "estimated_hours": 70,
                    "difficulty": 4,
                    "dependencies": ["phase-2"]
                },
                {
                    "id": "phase-4",
                    "name": "工程化与性能优化",
                    "description": "掌握前端工程化和性能优化",
                    "objectives": [
                        "掌握Webpack/Vite构建工具",
                        "理解代码分割和懒加载",
                        "学会性能监测和优化",
                        "掌握测试方法"
                    ],
                    "resources": [
                        {"name": "《Web性能权威指南》", "type": "book", "description": "性能优化圣经", "url": "https://example.com/performance-book"},
                        {"name": "Vite官方文档", "type": "documentation", "description": "下一代前端构建工具", "url": "https://vitejs.dev"},
                        {"name": "前端性能优化实战", "type": "course", "description": "性能优化技巧课程", "url": "https://example.com/perf-course"},
                        {"name": "构建工具配置项目", "type": "project", "description": "从0配置构建工具", "url": "https://example.com/build-project"}
                    ],
                    "estimated_hours": 45,
                    "difficulty": 4,
                    "dependencies": ["phase-3"]
                }
            ]
        }
    
    def _machine_learning_roadmap(self) -> Dict[str, Any]:
        return {
            "skill": "机器学习",
            "difficulty": 5,
            "phases": [
                {
                    "id": "phase-1",
                    "name": "数学基础",
                    "description": "掌握机器学习必备的数学知识",
                    "objectives": [
                        "掌握线性代数基础",
                        "理解概率论与数理统计",
                        "学会微积分优化方法",
                        "掌握矩阵运算"
                    ],
                    "resources": [
                        {"name": "《线性代数及其应用》", "type": "book", "description": "线性代数经典教材", "url": "https://example.com/linalg-book"},
                        {"name": "Khan Academy数学课程", "type": "course", "description": "免费数学学习资源", "url": "https://khanacademy.org"},
                        {"name": "《深度学习》数学部分", "type": "book", "description": "Ian Goodfellow著作", "url": "https://example.com/deeplearning-book"},
                        {"name": "数学公式实现项目", "type": "project", "description": "用Python实现核心数学算法", "url": "https://example.com/math-project"}
                    ],
                    "estimated_hours": 60,
                    "difficulty": 4,
                    "dependencies": []
                },
                {
                    "id": "phase-2",
                    "name": "传统机器学习算法",
                    "description": "掌握经典机器学习算法",
                    "objectives": [
                        "掌握监督学习算法",
                        "理解无监督学习方法",
                        "学会集成学习",
                        "掌握模型评估"
                    ],
                    "resources": [
                        {"name": "《统计学习方法》", "type": "book", "description": "李航经典著作", "url": "https://example.com/statlearning-book"},
                        {"name": "Coursera机器学习", "type": "course", "description": "Andrew Ng经典课程", "url": "https://coursera.org"},
                        {"name": "Scikit-learn文档", "type": "documentation", "description": "机器学习库参考", "url": "https://scikit-learn.org"},
                        {"name": "Kaggle竞赛项目", "type": "project", "description": "参与机器学习竞赛", "url": "https://kaggle.com"}
                    ],
                    "estimated_hours": 80,
                    "difficulty": 5,
                    "dependencies": ["phase-1"]
                },
                {
                    "id": "phase-3",
                    "name": "深度学习基础",
                    "description": "掌握神经网络和深度学习",
                    "objectives": [
                        "理解神经网络原理",
                        "掌握CNN和RNN",
                        "学会PyTorch/TensorFlow",
                        "掌握训练技巧"
                    ],
                    "resources": [
                        {"name": "《动手学深度学习》", "type": "book", "description": "实战导向深度学习", "url": "https://zh.d2l.ai"},
                        {"name": "fast.ai课程", "type": "course", "description": "实用深度学习课程", "url": "https://course.fast.ai"},
                        {"name": "PyTorch文档", "type": "documentation", "description": "PyTorch官方参考", "url": "https://pytorch.org/docs"},
                        {"name": "图像分类项目", "type": "project", "description": "使用CNN实现图像分类", "url": "https://example.com/cv-project"}
                    ],
                    "estimated_hours": 70,
                    "difficulty": 5,
                    "dependencies": ["phase-2"]
                },
                {
                    "id": "phase-4",
                    "name": "深度学习进阶",
                    "description": "学习高级深度学习技术",
                    "objectives": [
                        "掌握Transformer架构",
                        "理解生成模型",
                        "学会强化学习基础",
                        "掌握模型部署"
                    ],
                    "resources": [
                        {"name": "《Transformer架构详解》", "type": "book", "description": "Transformer深入解析", "url": "https://example.com/transformer-book"},
                        {"name": "Hugging Face课程", "type": "course", "description": "NLP实战课程", "url": "https://huggingface.co/learn"},
                        {"name": "TensorFlow文档", "type": "documentation", "description": "TensorFlow官方参考", "url": "https://www.tensorflow.org"},
                        {"name": "文本生成项目", "type": "project", "description": "基于Transformer的文本生成", "url": "https://example.com/nlp-project"}
                    ],
                    "estimated_hours": 60,
                    "difficulty": 5,
                    "dependencies": ["phase-3"]
                }
            ]
        }
    
    def _backend_roadmap(self) -> Dict[str, Any]:
        return {
            "skill": "后端开发",
            "difficulty": 4,
            "phases": [
                {
                    "id": "phase-1",
                    "name": "编程语言基础",
                    "description": "掌握后端开发语言",
                    "objectives": [
                        "掌握一门后端语言(Java/Go/Python)",
                        "理解面向对象设计",
                        "学会并发编程",
                        "掌握网络编程基础"
                    ],
                    "resources": [
                        {"name": "《Go语言实战》", "type": "book", "description": "Go语言入门书籍", "url": "https://example.com/go-book"},
                        {"name": "Go官方教程", "type": "course", "description": "Go语言学习之旅", "url": "https://go.dev/tour"},
                        {"name": "Java核心技术", "type": "book", "description": "Java经典教材", "url": "https://example.com/java-book"},
                        {"name": "命令行工具开发", "type": "project", "description": "开发实用命令行工具", "url": "https://example.com/cli-project"}
                    ],
                    "estimated_hours": 60,
                    "difficulty": 3,
                    "dependencies": []
                },
                {
                    "id": "phase-2",
                    "name": "数据库与缓存",
                    "description": "掌握数据库设计和使用",
                    "objectives": [
                        "掌握SQL数据库设计",
                        "理解NoSQL数据库",
                        "学会缓存策略",
                        "掌握数据库优化"
                    ],
                    "resources": [
                        {"name": "《高性能MySQL》", "type": "book", "description": "MySQL优化圣经", "url": "https://example.com/mysql-book"},
                        {"name": "Redis实战", "type": "course", "description": "Redis应用实战", "url": "https://example.com/redis-course"},
                        {"name": "MongoDB文档", "type": "documentation", "description": "MongoDB官方参考", "url": "https://docs.mongodb.com"},
                        {"name": "博客系统数据库设计", "type": "project", "description": "设计完整数据库架构", "url": "https://example.com/db-project"}
                    ],
                    "estimated_hours": 50,
                    "difficulty": 4,
                    "dependencies": ["phase-1"]
                },
                {
                    "id": "phase-3",
                    "name": "Web框架与API设计",
                    "description": "掌握后端框架和API设计",
                    "objectives": [
                        "掌握主流Web框架",
                        "理解RESTful API设计",
                        "学会GraphQL",
                        "掌握中间件开发"
                    ],
                    "resources": [
                        {"name": "《RESTful Web APIs》", "type": "book", "description": "API设计经典", "url": "https://example.com/rest-book"},
                        {"name": "Gin框架教程", "type": "course", "description": "Go Web框架学习", "url": "https://gin-gonic.com/docs"},
                        {"name": "Spring Boot文档", "type": "documentation", "description": "Spring Boot参考", "url": "https://spring.io/projects/spring-boot"},
                        {"name": "电商API开发", "type": "project", "description": "完整后端API开发", "url": "https://example.com/api-project"}
                    ],
                    "estimated_hours": 70,
                    "difficulty": 4,
                    "dependencies": ["phase-2"]
                },
                {
                    "id": "phase-4",
                    "name": "分布式系统",
                    "description": "掌握分布式系统架构",
                    "objectives": [
                        "理解分布式系统原理",
                        "掌握消息队列",
                        "学会微服务架构",
                        "掌握服务治理"
                    ],
                    "resources": [
                        {"name": "《设计数据密集型应用》", "type": "book", "description": "分布式系统圣经", "url": "https://example.com/ddia-book"},
                        {"name": "RabbitMQ实战", "type": "course", "description": "消息队列实战", "url": "https://example.com/mq-course"},
                        {"name": "Kubernetes文档", "type": "documentation", "description": "容器编排参考", "url": "https://kubernetes.io/docs"},
                        {"name": "微服务改造项目", "type": "project", "description": "单体应用微服务化", "url": "https://example.com/microservices-project"}
                    ],
                    "estimated_hours": 80,
                    "difficulty": 5,
                    "dependencies": ["phase-3"]
                }
            ]
        }
    
    def _generic_skill_roadmap(self, skill: str) -> Dict[str, Any]:
        return {
            "skill": skill,
            "difficulty": 3,
            "phases": [
                {
                    "id": "phase-1",
                    "name": f"{skill}入门基础",
                    "description": f"学习{skill}的基本概念和核心知识",
                    "objectives": [
                        f"理解{skill}的核心概念",
                        f"掌握{skill}的基础操作",
                        f"了解{skill}的应用场景",
                        f"搭建{skill}的学习环境"
                    ],
                    "resources": [
                        {"name": f"《{skill}入门经典》", "type": "book", "description": f"{skill}入门必备书籍", "url": "https://example.com/book1"},
                        {"name": f"{skill}官方教程", "type": "course", "description": "官方出品的入门课程", "url": "https://example.com/course1"},
                        {"name": f"{skill}官方文档", "type": "documentation", "description": "最权威的参考资料", "url": "https://example.com/docs"},
                        {"name": f"{skill}Hello World项目", "type": "project", "description": "第一个实战项目", "url": "https://example.com/project1"}
                    ],
                    "estimated_hours": 30,
                    "difficulty": 2,
                    "dependencies": []
                },
                {
                    "id": "phase-2",
                    "name": f"{skill}核心技能",
                    "description": f"深入学习{skill}的核心技术",
                    "objectives": [
                        f"掌握{skill}的核心技术点",
                        f"理解{skill}的工作原理",
                        f"学会解决常见问题",
                        f"完成中等难度项目"
                    ],
                    "resources": [
                        {"name": f"《{skill}实战》", "type": "book", "description": "实战导向的进阶书籍", "url": "https://example.com/book2"},
                        {"name": f"{skill}进阶课程", "type": "course", "description": "深入学习核心技术", "url": "https://example.com/course2"},
                        {"name": f"{skill}最佳实践指南", "type": "documentation", "description": "行业最佳实践", "url": "https://example.com/best-practices"},
                        {"name": f"{skill}综合应用项目", "type": "project", "description": "综合应用所学技能", "url": "https://example.com/project2"}
                    ],
                    "estimated_hours": 50,
                    "difficulty": 3,
                    "dependencies": ["phase-1"]
                },
                {
                    "id": "phase-3",
                    "name": f"{skill}高级应用",
                    "description": f"掌握{skill}的高级技术和最佳实践",
                    "objectives": [
                        f"精通{skill}的高级特性",
                        f"理解性能优化方法",
                        f"掌握架构设计原则",
                        f"完成复杂项目"
                    ],
                    "resources": [
                        {"name": f"《{skill}高级编程》", "type": "book", "description": "高级技术详解", "url": "https://example.com/book3"},
                        {"name": f"{skill}架构师课程", "type": "course", "description": "系统学习架构设计", "url": "https://example.com/course3"},
                        {"name": f"{skill}源码分析", "type": "documentation", "description": "深入理解底层原理", "url": "https://example.com/source-analysis"},
                        {"name": f"{skill}企业级项目", "type": "project", "description": "企业级应用开发", "url": "https://example.com/project3"}
                    ],
                    "estimated_hours": 60,
                    "difficulty": 4,
                    "dependencies": ["phase-2"]
                },
                {
                    "id": "phase-4",
                    "name": f"{skill}实战与认证",
                    "description": f"通过实战项目巩固技能并获取认证",
                    "objectives": [
                        f"完成{skill}综合实战项目",
                        f"准备并获取专业认证",
                        f"参与开源项目贡献",
                        f"建立个人技术品牌"
                    ],
                    "resources": [
                        {"name": f"{skill}认证指南", "type": "book", "description": "认证考试备考书籍", "url": "https://example.com/book4"},
                        {"name": f"{skill}认证培训课程", "type": "course", "description": "认证考试培训", "url": "https://example.com/course4"},
                        {"name": f"{skill}社区论坛", "type": "documentation", "description": "技术交流社区", "url": "https://example.com/community"},
                        {"name": f"{skill}开源项目贡献", "type": "project", "description": "为开源项目做贡献", "url": "https://example.com/opensource-project"}
                    ],
                    "estimated_hours": 40,
                    "difficulty": 5,
                    "dependencies": ["phase-3"]
                }
            ]
        }
    
    def _filter_mastered_content(self, roadmap_data: Dict[str, Any], mastered_skills: List[str]) -> Dict[str, Any]:
        mastered_lower = [s.lower() for s in mastered_skills]
        filtered_phases = []
        
        for phase in roadmap_data["phases"]:
            phase_name = phase["name"].lower()
            is_mastered = any(ms in phase_name or phase_name in ms for ms in mastered_lower)
            
            if is_mastered:
                phase["completed"] = True
                phase["notes"] = "根据技能树标记为已掌握"
            
            filtered_objectives = []
            for obj in phase["objectives"]:
                obj_lower = obj.lower()
                if not any(ms in obj_lower or obj_lower in ms for ms in mastered_lower):
                    filtered_objectives.append(obj)
            phase["objectives"] = filtered_objectives or phase["objectives"]
            
            filtered_phases.append(phase)
        
        roadmap_data["phases"] = filtered_phases
        return roadmap_data
    
    def _adjust_for_time_budget(self, roadmap_data: Dict[str, Any], time_budget: Dict[str, Any]) -> Dict[str, Any]:
        daily_hours = time_budget.get("daily_hours", 2)
        total_days = time_budget.get("total_days", 90)
        total_available_hours = daily_hours * total_days
        
        current_total = sum(phase["estimated_hours"] for phase in roadmap_data["phases"])
        
        if current_total > 0:
            ratio = total_available_hours / current_total
            
            for phase in roadmap_data["phases"]:
                adjusted_hours = round(phase["estimated_hours"] * ratio, 1)
                phase["estimated_hours"] = max(adjusted_hours, 1.0)
                phase["notes"] = f"根据时间预算（每天{daily_hours}小时，共{total_days}天）调整"
        
        return roadmap_data
    
    def _call_llm_api(self, skill: str, time_budget: Optional[Dict[str, Any]],
                     mastered_skills: Optional[List[str]]) -> Dict[str, Any]:
        try:
            import openai
            client = openai.OpenAI(api_key=self.api_key)
            
            prompt = self._build_prompt(skill, time_budget, mastered_skills)
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的学习路线图规划师。请以JSON格式输出学习路线图。"},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except ImportError:
            print("OpenAI SDK not installed, using mock data")
            return self._generate_mock_roadmap(skill, time_budget, mastered_skills)
        except Exception as e:
            print(f"LLM API call failed: {e}, using mock data")
            return self._generate_mock_roadmap(skill, time_budget, mastered_skills)
    
    def _build_prompt(self, skill: str, time_budget: Optional[Dict[str, Any]],
                     mastered_skills: Optional[List[str]]) -> str:
        prompt = f"""请为技能"{skill}"生成一个详细的学习路线图。

要求：
1. 分为4-6个学习阶段
2. 每个阶段包含：
   - 阶段名称
   - 阶段描述
   - 3-5个学习目标
   - 4个推荐资源（书籍、课程、文档、项目各1个）
   - 预估学习小时数
   - 难度等级（1-5）
   - 依赖的前置阶段ID

3. 资源格式：
   - name: 资源名称
   - type: book/course/documentation/project
   - description: 简短描述
   - url: 资源链接（可以是占位符）

请输出严格的JSON格式，结构如下：
{{
    "skill": "技能名称",
    "difficulty": 3,
    "phases": [...]
}}
"""
        
        if time_budget:
            prompt += f"\n\n时间预算：每天{time_budget.get('daily_hours', 2)}小时，共{time_budget.get('total_days', 90)}天。请根据这个预算调整各阶段的学习时间。"
        
        if mastered_skills:
            prompt += f"\n\n已掌握技能：{', '.join(mastered_skills)}。请跳过或简化这些内容。"
        
        return prompt
