import re
import json
import os
from typing import List, Dict, Any


class RiskRule:
    def __init__(self, rule_data: Dict):
        self.id = rule_data.get('id')
        self.name = rule_data.get('name')
        self.description = rule_data.get('description')
        self.keywords = rule_data.get('keywords', [])
        self.pattern = rule_data.get('pattern', '')
        self.severity = rule_data.get('severity', 'medium')
        self.category = rule_data.get('category')
        self.suggestion = rule_data.get('suggestion')
        self.weight = rule_data.get('weight', 1.0)
        self.supported_types = rule_data.get('supported_types', ['all'])

    def match(self, text: str, contract_type: str) -> bool:
        if 'all' not in self.supported_types and contract_type not in self.supported_types:
            return False

        if self.pattern:
            if re.search(self.pattern, text, re.IGNORECASE):
                return True

        for keyword in self.keywords:
            if keyword.lower() in text.lower():
                return True

        return False


class RiskEngine:
    def __init__(self, rules_dir: str = 'rules', feedback_file: str = 'data/feedback.json'):
        self.rules_dir = rules_dir
        self.feedback_file = feedback_file
        self.rules: List[RiskRule] = []
        self.feedback_data = self._load_feedback()
        self._load_rules()

    def _load_feedback(self) -> Dict:
        if os.path.exists(self.feedback_file):
            with open(self.feedback_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def _save_feedback(self):
        os.makedirs(os.path.dirname(self.feedback_file), exist_ok=True)
        with open(self.feedback_file, 'w', encoding='utf-8') as f:
            json.dump(self.feedback_data, f, ensure_ascii=False, indent=2)

    def _load_rules(self):
        if not os.path.exists(self.rules_dir):
            os.makedirs(self.rules_dir, exist_ok=True)
            self._create_default_rules()

        for filename in os.listdir(self.rules_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(self.rules_dir, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    rules_data = json.load(f)
                    for rule_data in rules_data:
                        rule = RiskRule(rule_data)
                        if rule.id in self.feedback_data:
                            rule.weight = self.feedback_data[rule.id].get('weight', 1.0)
                        self.rules.append(rule)

    def _create_default_rules(self):
        default_rules = [
            {
                "id": "R001",
                "name": "单方终止条款",
                "description": "合同包含一方有权随时终止合同的条款，可能对另一方不利",
                "keywords": ["甲方有权随时终止", "单方终止", "随时解除", "任意终止"],
                "severity": "high",
                "category": "终止条款",
                "suggestion": "建议修改为：双方协商一致可终止合同，或一方需提前30天书面通知对方",
                "supported_types": ["all"]
            },
            {
                "id": "R002",
                "name": "无限责任条款",
                "description": "合同包含无限责任或责任范围不明确的条款",
                "keywords": ["无限责任", "全部责任", "任何损失", "所有损失", "概不负责"],
                "pattern": r"承担.*(全部|无限).*责任",
                "severity": "high",
                "category": "责任条款",
                "suggestion": "建议明确责任上限，或添加责任排除条款，如：赔偿总额不超过合同金额",
                "supported_types": ["all"]
            },
            {
                "id": "R003",
                "name": "保密期限缺失",
                "description": "保密条款未明确保密期限",
                "keywords": ["保密"],
                "pattern": r"保密(?!.*(期限|年|月|日))",
                "severity": "medium",
                "category": "保密条款",
                "suggestion": "建议添加保密期限，如：保密期限为合同终止后2年",
                "supported_types": ["nda", "employment", "service"]
            },
            {
                "id": "R004",
                "name": "竞业限制条款",
                "description": "合同包含竞业限制条款，需检查补偿是否合理",
                "keywords": ["竞业限制", "竞业禁止", "不竞争"],
                "severity": "medium",
                "category": "限制条款",
                "suggestion": "建议确认竞业限制期限不超过2年，并包含合理的经济补偿",
                "supported_types": ["employment", "nda"]
            },
            {
                "id": "R005",
                "name": "违约金过高",
                "description": "违约金比例可能过高",
                "keywords": ["违约金", "赔偿金"],
                "pattern": r"违约金.*(30%|40%|50%|双倍|两倍)",
                "severity": "medium",
                "category": "违约条款",
                "suggestion": "建议违约金不超过合同金额的20%，或与实际损失相当",
                "supported_types": ["all"]
            },
            {
                "id": "R006",
                "name": "自动续期条款",
                "description": "合同包含自动续期条款，可能导致意外续约",
                "keywords": ["自动续期", "自动顺延", "自动续约"],
                "severity": "medium",
                "category": "期限条款",
                "suggestion": "建议添加提前终止通知条款，如：任何一方可在到期前30天书面通知不续期",
                "supported_types": ["lease", "service"]
            },
            {
                "id": "R007",
                "name": "试用期过长",
                "description": "劳动合同试用期超过法定上限",
                "keywords": ["试用期"],
                "pattern": r"试用期.*(6个月|7个月|8个月|9个月|10个月|11个月|12个月)",
                "severity": "high",
                "category": "雇佣条款",
                "suggestion": "根据劳动合同法，试用期最长不超过6个月（3年以上合同）",
                "supported_types": ["employment"]
            },
            {
                "id": "R008",
                "name": "押金条款",
                "description": "租赁合同押金超过法定标准",
                "keywords": ["押金", "保证金"],
                "pattern": r"(押金|保证金).*(3个月|4个月|5个月)",
                "severity": "medium",
                "category": "租赁条款",
                "suggestion": "建议押金不超过2个月租金，并明确退还条件和时间",
                "supported_types": ["lease"]
            },
            {
                "id": "R009",
                "name": "争议解决地点",
                "description": "争议解决地点对一方明显不利",
                "keywords": ["甲方所在地", "原告所在地", "被告所在地"],
                "severity": "low",
                "category": "争议解决",
                "suggestion": "建议选择中立地点或约定仲裁，如：由合同签订地法院管辖",
                "supported_types": ["all"]
            },
            {
                "id": "R010",
                "name": "知识产权归属",
                "description": "知识产权归属条款不明确或过于宽泛",
                "keywords": ["知识产权", "著作权", "专利", "归属"],
                "severity": "medium",
                "category": "知识产权",
                "suggestion": "建议明确知识产权归属范围和使用许可权限",
                "supported_types": ["service", "nda", "employment"]
            },
            {
                "id": "R011",
                "name": "不可抗力条款",
                "description": "不可抗力条款缺失或范围不明确",
                "keywords": [],
                "pattern": r"^(?!.*不可抗力)",
                "severity": "low",
                "category": "免责条款",
                "suggestion": "建议添加不可抗力条款，明确范围和责任免除",
                "supported_types": ["all"]
            },
            {
                "id": "R012",
                "name": "通知方式条款",
                "description": "未明确通知方式和送达地址",
                "keywords": [],
                "pattern": r"^(?!.*(通知|送达|地址))",
                "severity": "low",
                "category": "通用条款",
                "suggestion": "建议明确双方联系地址和通知方式（书面、邮件等）",
                "supported_types": ["all"]
            }
        ]

        with open(os.path.join(self.rules_dir, 'default_rules.json'), 'w', encoding='utf-8') as f:
            json.dump(default_rules, f, ensure_ascii=False, indent=2)

    def add_custom_rule(self, rule_data: Dict):
        rule = RiskRule(rule_data)
        self.rules.append(rule)

    def analyze(self, text: str, contract_type: str = 'general') -> List[Dict]:
        risks = []
        paragraphs = self._split_paragraphs(text)

        for rule in self.rules:
            for i, paragraph in enumerate(paragraphs):
                if rule.match(paragraph, contract_type):
                    risks.append({
                        'rule_id': rule.id,
                        'name': rule.name,
                        'description': rule.description,
                        'severity': rule.severity,
                        'category': rule.category,
                        'suggestion': rule.suggestion,
                        'weight': rule.weight,
                        'paragraph_index': i,
                        'paragraph_text': paragraph[:200] + '...' if len(paragraph) > 200 else paragraph
                    })
                    break

        return sorted(risks, key=lambda x: self._severity_score(x['severity']) * x['weight'], reverse=True)

    def _severity_score(self, severity: str) -> int:
        scores = {'high': 3, 'medium': 2, 'low': 1}
        return scores.get(severity, 1)

    def _split_paragraphs(self, text: str) -> List[str]:
        paragraphs = re.split(r'\n\s*\n', text)
        return [p.strip() for p in paragraphs if p.strip()]

    def calculate_risk_level(self, risks: List[Dict]) -> str:
        if not risks:
            return 'low'

        total_score = sum(self._severity_score(r['severity']) * r['weight'] for r in risks)
        avg_score = total_score / len(risks)

        if avg_score >= 2.5:
            return 'high'
        elif avg_score >= 1.5:
            return 'medium'
        else:
            return 'low'

    def generate_summary(self, text: str, risks: List[Dict]) -> str:
        sentences = re.split(r'[。！？.!?]', text)
        key_sentences = []

        keywords = ['合同双方', '甲方', '乙方', '期限', '金额', '价款', '违约责任', '终止']
        for sentence in sentences:
            sentence = sentence.strip()
            if any(k in sentence for k in keywords) and len(sentence) > 5:
                key_sentences.append(sentence)
                if len(key_sentences) >= 5:
                    break

        summary = '合同摘要：\n'
        for i, s in enumerate(key_sentences, 1):
            summary += f'{i}. {s}。\n'

        if risks:
            summary += f'\n检测到 {len(risks)} 个风险点。'

        return summary

    def get_heatmap_data(self, text: str, risks: List[Dict]) -> List[Dict]:
        paragraphs = self._split_paragraphs(text)
        heatmap = []

        for i, paragraph in enumerate(paragraphs):
            paragraph_risks = [r for r in risks if r['paragraph_index'] == i]
            risk_score = sum(self._severity_score(r['severity']) for r in paragraph_risks)

            if risk_score >= 4:
                level = 'critical'
            elif risk_score >= 2:
                level = 'warning'
            elif risk_score >= 1:
                level = 'notice'
            else:
                level = 'safe'

            heatmap.append({
                'index': i,
                'text': paragraph,
                'risk_count': len(paragraph_risks),
                'risk_score': risk_score,
                'level': level
            })

        return heatmap

    def record_feedback(self, rule_id: str, feedback: str):
        if rule_id not in self.feedback_data:
            self.feedback_data[rule_id] = {'important': 0, 'ignore': 0, 'weight': 1.0}

        if feedback == 'important':
            self.feedback_data[rule_id]['important'] += 1
            self.feedback_data[rule_id]['weight'] = min(2.0, self.feedback_data[rule_id]['weight'] + 0.1)
        elif feedback == 'ignore':
            self.feedback_data[rule_id]['ignore'] += 1
            self.feedback_data[rule_id]['weight'] = max(0.1, self.feedback_data[rule_id]['weight'] - 0.1)

        for rule in self.rules:
            if rule.id == rule_id:
                rule.weight = self.feedback_data[rule_id]['weight']
                break

        self._save_feedback()

    def get_contract_types(self) -> List[Dict]:
        return [
            {'id': 'general', 'name': '通用合同', 'description': '适用于各类合同的通用检查'},
            {'id': 'employment', 'name': '劳动合同', 'description': '劳动合同专项检查'},
            {'id': 'lease', 'name': '租赁合同', 'description': '房屋/设备租赁合同检查'},
            {'id': 'nda', 'name': '保密协议(NDA)', 'description': '保密协议专项检查'},
            {'id': 'service', 'name': '服务合同', 'description': '服务类合同检查'}
        ]

    def get_template(self, contract_type: str) -> str:
        templates = {
            'employment': '''劳动合同模板

甲方（用人单位）：____________________
法定代表人：____________________
地址：____________________

乙方（劳动者）：____________________
身份证号：____________________
地址：____________________

根据《中华人民共和国劳动法》、《中华人民共和国劳动合同法》等法律法规，甲乙双方本着平等自愿、协商一致的原则，签订本合同。

一、合同期限
本合同为固定期限劳动合同，期限为__年，自____年__月__日起至____年__月__日止。
试用期为__个月，自____年__月__日起至____年__月__日止。

二、工作内容和工作地点
乙方同意根据甲方工作需要，担任____岗位工作。
工作地点为：____________________

三、工作时间和休息休假
甲方实行标准工时制度，乙方每日工作不超过8小时，每周工作不超过40小时。
乙方依法享有法定节假日、年休假、婚假、产假等假期。

四、劳动报酬
乙方月工资为______元，试用期工资为______元。
甲方每月__日以货币形式支付乙方工资。

五、社会保险
甲乙双方依法参加社会保险，缴纳社会保险费。

六、劳动保护和劳动条件
甲方为乙方提供符合国家规定的劳动安全卫生条件和必要的劳动防护用品。

七、劳动合同的解除和终止
1. 双方协商一致，可以解除劳动合同。
2. 乙方提前30日以书面形式通知甲方，可以解除劳动合同。试用期内提前3日通知。
3. 甲方有下列情形之一的，乙方可以解除劳动合同：
   （1）未按照劳动合同约定提供劳动保护或者劳动条件的；
   （2）未及时足额支付劳动报酬的；
   （3）未依法为乙方缴纳社会保险费的。

八、保密和竞业限制
乙方对甲方的商业秘密负有保密义务。
[ ] 竞业限制：乙方离职后__年内不得到与甲方有竞争关系的单位工作，甲方支付经济补偿______元/月。

九、违约责任
任何一方违反本合同约定，应承担相应的违约责任。

十、争议解决
因履行本合同发生的争议，双方协商解决；协商不成的，可以向劳动争议仲裁委员会申请仲裁。

十一、其他
本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。

甲方（盖章）：____________________
法定代表人（签字）：____________________
____年__月__日

乙方（签字）：____________________
____年__月__日
''',
            'lease': '''房屋租赁合同模板

甲方（出租方）：____________________
身份证号：____________________
地址：____________________

乙方（承租方）：____________________
身份证号：____________________
地址：____________________

根据《中华人民共和国民法典》及相关法律法规，甲乙双方在平等、自愿、公平的基础上，就房屋租赁事宜达成如下协议：

一、租赁房屋
甲方将位于____________________的房屋出租给乙方使用。
房屋建筑面积______平方米，房屋用途为______。

二、租赁期限
租赁期限为__个月，自____年__月__日起至____年__月__日止。
租赁期满，乙方如要求续租，应在期满前30日书面通知甲方，甲方同意后重新签订合同。

三、租金及支付方式
月租金为______元，租金按[月/季/年]支付。
乙方应在每[月/季/年]初__日内支付当期租金。

四、押金
乙方应向甲方支付押金______元，租赁期满或合同解除后，押金除抵扣应由乙方承担的费用外，剩余部分应如数返还乙方。

五、相关费用
租赁期间，水费、电费、燃气费、物业费、供暖费等由[甲方/乙方]承担。

六、房屋修缮
甲方应保证房屋的使用安全。房屋及附属设施的维修由[甲方/乙方]负责。

七、合同的解除
1. 经双方协商一致，可以解除合同。
2. 乙方有下列情形之一的，甲方有权解除合同：
   （1）未经甲方同意，擅自改变房屋用途的；
   （2）擅自拆改变动或损坏房屋主体结构的；
   （3）拖欠租金达__日以上的。

八、违约责任
1. 甲方未按约定交付房屋的，应按日租金的__%支付违约金。
2. 乙方逾期支付租金的，应按逾期金额的__%支付违约金。

九、争议解决
因履行本合同发生的争议，双方协商解决；协商不成的，依法向人民法院起诉。

十、其他
本合同一式两份，甲乙双方各执一份，自双方签字之日起生效。

甲方（签字）：____________________
____年__月__日

乙方（签字）：____________________
____年__月__日
''',
            'nda': '''保密协议(NDA)模板

甲方：____________________
法定代表人：____________________
地址：____________________

乙方：____________________
法定代表人/身份证号：____________________
地址：____________________

鉴于甲乙双方正在进行______项目合作，为保护双方的商业秘密，根据《中华人民共和国民法典》等法律法规，达成如下保密协议：

一、保密信息
保密信息指双方在合作过程中知悉的对方所有非公开的技术信息、经营信息及其他商业秘密，包括但不限于：
1. 技术方案、设计文档、源代码等；
2. 客户名单、价格策略、财务数据等；
3. 双方合作的内容、进度等。

二、保密义务
1. 接收方应对披露方的保密信息承担保密义务；
2. 接收方不得向任何第三方披露保密信息；
3. 接收方应采取必要的保密措施妥善保管保密信息。

三、保密期限
保密期限为自本协议生效之日起__年，或至保密信息公开之日止。

四、保密信息的使用
接收方仅能为合作目的使用保密信息，不得用于其他目的。

五、例外
下列信息不适用本协议：
1. 非因接收方过错而公开的信息；
2. 接收方在披露前已合法掌握的信息；
3. 从合法第三方获得的信息；
4. 法律法规要求披露的信息。

六、违约责任
如接收方违反本协议约定，应承担违约责任，赔偿披露方因此遭受的全部损失。

七、争议解决
因履行本协议发生的争议，双方协商解决；协商不成的，依法向人民法院起诉。

八、其他
本协议一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。

甲方（盖章）：____________________
法定代表人（签字）：____________________
____年__月__日

乙方（盖章/签字）：____________________
法定代表人（签字）：____________________
____年__月__日
''',
            'service': '''服务合同模板

甲方（委托方）：____________________
法定代表人：____________________
地址：____________________

乙方（服务方）：____________________
法定代表人：____________________
地址：____________________

根据《中华人民共和国民法典》及相关法律法规，甲乙双方本着平等互利、诚实信用的原则，就乙方为甲方提供服务事宜，达成如下协议：

一、服务内容
乙方为甲方提供____________________服务。
具体服务标准和要求详见附件。

二、服务期限
服务期限自____年__月__日起至____年__月__日止。

三、服务费用及支付方式
1. 服务费用总额为______元；
2. 支付方式：
   （1）合同签订后__日内，甲方支付__%即______元；
   （2）服务完成并验收合格后__日内，甲方支付剩余款项。

四、双方权利义务
甲方权利义务：
1. 按约定支付服务费用；
2. 提供必要的资料和协助；
3. 及时验收服务成果。

乙方权利义务：
1. 按约定提供服务，确保服务质量；
2. 对甲方提供的资料承担保密义务；
3. 定期向甲方汇报服务进度。

五、验收标准和方式
1. 验收标准：____________________；
2. 验收方式：甲方收到服务成果后__日内组织验收。

六、知识产权
服务成果的知识产权归[甲方/乙方/双方共有]所有。

七、合同的解除和终止
1. 双方协商一致，可以解除合同；
2. 一方严重违约致使合同目的不能实现的，另一方有权解除合同。

八、违约责任
1. 乙方未按约定提供服务的，应承担继续履行、采取补救措施或赔偿损失等责任；
2. 甲方逾期付款的，应按日支付逾期金额__%的违约金。

九、争议解决
因履行本合同发生的争议，双方协商解决；协商不成的，依法向人民法院起诉。

十、其他
本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。

甲方（盖章）：____________________
法定代表人（签字）：____________________
____年__月__日

乙方（盖章）：____________________
法定代表人（签字）：____________________
____年__月__日
'''
        }
        return templates.get(contract_type, '')
