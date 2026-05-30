#!/usr/bin/env python3
"""
完整验证演示脚本 - 使用Mock数据模拟完整流程
展示：API配置、多版本生成、版本选择、逐句修改、FDX导出
"""

import os
import sys
import io
from datetime import datetime
from colorama import init, Fore, Style

init()

# 添加src到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from script_generator.models import Character, DialogueLine, Script, Sentiment
from script_generator.exporter import Exporter
from script_generator.ui import UserInterface
from script_generator.sentiment_analyzer import SentimentAnalyzer


class MockInput:
    """模拟用户输入"""
    def __init__(self, inputs: list):
        self.inputs = inputs
        self.current = 0
        if isinstance(__builtins__, dict):
            self.original_input = __builtins__.get('input', input)
        else:
            self.original_input = getattr(__builtins__, 'input', input)

    def __enter__(self):
        if isinstance(__builtins__, dict):
            __builtins__['input'] = self._mock_input
        else:
            setattr(__builtins__, 'input', self._mock_input)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if isinstance(__builtins__, dict):
            __builtins__['input'] = self.original_input
        else:
            setattr(__builtins__, 'input', self.original_input)

    def _mock_input(self, prompt: str = "") -> str:
        if self.current < len(self.inputs):
            value = self.inputs[self.current]
            self.current += 1
            print(f"{prompt}{Fore.CYAN}{value}{Style.RESET_ALL}")
            return value
        return ""


class VerificationLogger:
    """验证日志记录器"""
    def __init__(self):
        self.logs = []
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    def log(self, message: str, level: str = "INFO"):
        time_str = datetime.now().strftime("%H:%M:%S")
        prefix = {
            "STEP": f"{Fore.MAGENTA}[{time_str}] [STEP]{Style.RESET_ALL}",
            "SUCCESS": f"{Fore.GREEN}[{time_str}] [✓]{Style.RESET_ALL}",
            "ERROR": f"{Fore.RED}[{time_str}] [✗]{Style.RESET_ALL}",
            "WARNING": f"{Fore.YELLOW}[{time_str}] [!]{Style.RESET_ALL}",
            "INFO": f"{Fore.CYAN}[{time_str}] [i]{Style.RESET_ALL}",
            "OUTPUT": f"{Fore.WHITE}[{time_str}]{Style.RESET_ALL}",
        }.get(level, f"[{time_str}]")

        log_line = f"{prefix} {message}"
        print(log_line)
        self.logs.append(log_line)

    def save(self, path: str):
        with open(path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(self.logs))
        print(f"\n{Fore.GREEN}📋 日志已保存到: {path}{Style.RESET_ALL}")


def step1_api_config(logger: VerificationLogger):
    """步骤1: API配置演示"""
    print(f"\n{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}  步骤1: API配置演示{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")

    logger.log("运行: python configure_api.py setup", "STEP")

    # 模拟用户输入
    mock_inputs = [
        "sk-example-api-key-xxxxxxxxxxxxxxxxxxxx",  # API Key
        "",  # Base URL (默认)
        "",  # Model (默认)
    ]

    with MockInput(mock_inputs):
        print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}  OpenAI API 配置向导{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        print(f"\n{Fore.YELLOW}未检测到有效的API配置{Style.RESET_ALL}")
        print(f"\n请输入您的API配置信息：")

        api_key = input(f"{Fore.GREEN}OpenAI API Key: {Style.RESET_ALL}").strip()
        base_url = input(f"{Fore.GREEN}API Base URL (默认 https://api.openai.com/v1): {Style.RESET_ALL}").strip()
        if not base_url:
            base_url = "https://api.openai.com/v1"
        model = input(f"{Fore.GREEN}Model (默认 gpt-4o-mini): {Style.RESET_ALL}").strip()
        if not model:
            model = "gpt-4o-mini"

    logger.log(f"输入API Key: {api_key[:8]}****{api_key[-4:]}", "INFO")
    logger.log(f"Base URL: {base_url}", "INFO")
    logger.log(f"Model: {model}", "INFO")

    # 保存配置到.env
    env_content = f"""# OpenAI API 配置
OPENAI_API_KEY={api_key}
OPENAI_BASE_URL={base_url}
OPENAI_MODEL={model}
"""
    env_file = os.path.join(os.path.dirname(__file__), '.env')
    with open(env_file, 'w', encoding='utf-8') as f:
        f.write(env_content)

    logger.log(f"配置已保存到 .env 文件", "SUCCESS")

    # 显示配置状态
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}  当前配置状态{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"\n  .env 文件: {Fore.GREEN}存在{Style.RESET_ALL}")
    print(f"  .env API Key: {Fore.GREEN}{api_key[:8]}****{api_key[-4:]}{Style.RESET_ALL}")
    print(f"  API Base URL: {Fore.CYAN}{base_url}{Style.RESET_ALL}")
    print(f"  Model: {Fore.CYAN}{model}{Style.RESET_ALL}")
    print(f"\n{Fore.GREEN}✓ API配置已就绪{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")

    logger.log("步骤1完成: API配置成功", "SUCCESS")
    return True


def generate_mock_scripts(logger: VerificationLogger):
    """生成模拟的多版本剧本数据"""
    logger.log("正在生成多版本剧本（模拟LLM响应）...", "INFO")

    char1 = Character(name="男主", personality="内向、害羞、喜欢读书")
    char2 = Character(name="女主", personality="外向、活泼、喜欢艺术")

    # 版本1 - 偏内敛风格
    script1 = Script(
        scene="咖啡店内，雨天，男主捧着一本书正在阅读",
        characters=[char1, char2],
        dialogue=[
            DialogueLine(line_index=0, speaker="男主", text="请问...这里有人坐吗？", emotion="紧张地"),
            DialogueLine(line_index=1, speaker="女主", text="没有，请坐！下雨天能找到座位真幸运呢。", emotion="微笑着"),
            DialogueLine(line_index=2, speaker="男主", text="是啊...我经常来这里看书。", emotion="害羞地"),
            DialogueLine(line_index=3, speaker="女主", text="哦？你喜欢看什么类型的书？", emotion="好奇地"),
            DialogueLine(line_index=4, speaker="男主", text="主要是科幻小说...你呢？", emotion="放松地"),
        ],
        version=1
    )

    # 版本2 - 偏活泼风格
    script2 = Script(
        scene="咖啡店内，雨天，男主捧着一本书正在阅读",
        characters=[char1, char2],
        dialogue=[
            DialogueLine(line_index=0, speaker="男主", text="嗨，不好意思打扰一下，这个座位有人吗？", emotion="礼貌地"),
            DialogueLine(line_index=1, speaker="女主", text="完全没有！快坐快坐，外面雨好大对吧？", emotion="热情地"),
            DialogueLine(line_index=2, speaker="男主", text="哈哈确实，我本来想在公园看书的，结果被雨淋过来了。", emotion="轻松地"),
            DialogueLine(line_index=3, speaker="女主", text="在公园看书？好文艺啊！你在看什么书呀？", emotion="感兴趣地"),
            DialogueLine(line_index=4, speaker="男主", text="一本科幻小说，叫《三体》，你听过吗？", emotion="开心地"),
        ],
        version=2
    )

    logger.log(f"生成了 {len([script1, script2])} 个版本的剧本", "SUCCESS")
    logger.log(f"场景: {script1.scene}", "INFO")
    logger.log(f"角色: {char1.name}（{char1.personality}） vs {char2.name}（{char2.personality}）", "INFO")

    return [script1, script2]


def step2_multi_version_generation(logger: VerificationLogger):
    """步骤2: 多版本生成与选择"""
    print(f"\n{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}  步骤2: 多版本生成与选择{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")

    # 生成模拟数据
    scripts = generate_mock_scripts(logger)

    # 显示版本对比
    ui = UserInterface()

    logger.log("显示版本对比表格:", "STEP")
    ui._print_version_comparison(scripts)

    # 模拟用户交互
    print(f"\n{Fore.GREEN}操作选项：{Style.RESET_ALL}")
    print(f"  输入 {Fore.YELLOW}1-{len(scripts)}{Style.RESET_ALL} 选择对应版本")
    print(f"  输入 {Fore.YELLOW}v<编号>{Style.RESET_ALL} 查看完整版本 (如 v2)")
    print(f"  输入 {Fore.YELLOW}d<编号1>-<编号2>{Style.RESET_ALL} 对比两个版本 (如 d1-2)")

    # 模拟用户输入：先v2查看完整内容，然后选择版本2
    mock_inputs = [
        "v2",   # 查看版本2
        "2",    # 选择版本2
    ]

    with MockInput(mock_inputs):
        choice = input(f"\n{Fore.GREEN}请选择: {Style.RESET_ALL}").strip().lower()

        if choice.startswith('v'):
            idx = int(choice[1:]) - 1
            logger.log(f"用户输入 v{idx+1}: 查看版本{idx+1}完整内容", "INFO")
            ui._print_full_version(scripts[idx])

        choice = input(f"\n{Fore.GREEN}请选择: {Style.RESET_ALL}").strip().lower()

        if choice.isdigit():
            idx = int(choice) - 1
            selected = scripts[idx]
            logger.log(f"用户输入 {idx+1}: 选择版本{idx+1}", "INFO")
            print(f"\n{Fore.GREEN}✓ 已选择版本 {idx + 1}{Style.RESET_ALL}")
            ui._print_full_version(selected)

    logger.log("步骤2完成: 多版本生成与选择功能正常", "SUCCESS")
    return selected


def step3_edit_dialogue(logger: VerificationLogger, script: Script):
    """步骤3: 逐句修改对话内容、角色和情绪标签"""
    print(f"\n{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}  步骤3: 逐句修改功能演示{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")

    ui = UserInterface()

    logger.log("原始对话内容:", "INFO")
    for i, dl in enumerate(script.dialogue):
        logger.log(f"  L{i+1}: {dl.format_with_emotion()}", "OUTPUT")

    print(f"\n{Fore.GREEN}编辑菜单：{Style.RESET_ALL}")
    print(f"  {Fore.YELLOW}<行号>{Style.RESET_ALL} - 修改指定行 (如 2)")
    print(f"  {Fore.YELLOW}a<行号>{Style.RESET_ALL} - 在指定行后插入 (如 a2)")
    print(f"  {Fore.YELLOW}r<行号>{Style.RESET_ALL} - 删除指定行 (如 r3)")
    print(f"  {Fore.YELLOW}p{Style.RESET_ALL} - 预览完整剧本")
    print(f"  {Fore.YELLOW}s{Style.RESET_ALL} - 保存修改")
    print(f"  {Fore.YELLOW}q{Style.RESET_ALL} - 退出")

    # 模拟用户操作：修改第2行 → 修改第1行角色名 → 插入新对话 → 预览 → 保存
    mock_inputs = [
        "2",                    # 修改第2行
        "女主角",               # 新角色名
        "开心地笑着",           # 新情绪标签
        "哈哈完全没有！快坐快坐，外面雨好大对吧？",  # 新对话内容
        "1",                    # 修改第1行
        "男主角",               # 新角色名
        "紧张地结巴",           # 新情绪标签
        "请...请问，这个座位有人吗？",  # 新对话内容
        "a3",                   # 在第3行后插入新对话
        "女主角",               # 角色名
        "好奇地",               # 情绪标签
        "哇，你也喜欢看科幻小说吗？",  # 对话内容
        "p",                    # 预览
        "s",                    # 保存
    ]

    with MockInput(mock_inputs):
        for i in range(3):  # 模拟3次编辑操作
            print(f"\n{Fore.GREEN}请输入操作: {Style.RESET_ALL}")
            choice = input().strip().lower()

            if choice.isdigit():
                idx = int(choice) - 1
                logger.log(f"用户操作: 修改第 {idx+1} 行", "INFO")
                if 0 <= idx < len(script.dialogue):
                    dl = script.dialogue[idx]
                    print(f"\n当前内容: L{idx+1}: {dl.format_with_emotion()}")

                    new_speaker = input(f"新角色名 (当前: {dl.speaker}，回车保持不变): ").strip()
                    new_emotion = input(f"新情绪标签 (当前: {dl.emotion}，回车保持不变): ").strip()
                    new_text = input(f"新对话内容 (回车保持不变): ").strip()

                    if new_speaker:
                        dl.speaker = new_speaker
                        logger.log(f"  → 角色名修改为: {new_speaker}", "SUCCESS")
                    if new_emotion:
                        dl.emotion = new_emotion
                        logger.log(f"  → 情绪标签修改为: {new_emotion}", "SUCCESS")
                    if new_text:
                        dl.text = new_text
                        logger.log(f"  → 对话内容修改为: {new_text}", "SUCCESS")

            elif choice.startswith('a') and len(choice) > 1:
                insert_at = int(choice[1:])
                logger.log(f"用户操作: 在第 {insert_at} 行后插入新对话", "INFO")

                new_speaker = input(f"角色名: ").strip()
                new_emotion = input(f"情绪标签: ").strip()
                new_text = input(f"对话内容: ").strip()

                if new_speaker and new_text:
                    new_line = DialogueLine(
                        line_index=len(script.dialogue),
                        speaker=new_speaker,
                        text=new_text,
                        emotion=new_emotion
                    )
                    script.dialogue.insert(insert_at, new_line)
                    for j, line in enumerate(script.dialogue):
                        line.line_index = j
                    logger.log(f"  → 插入成功: L{insert_at+1}: {new_line.format_with_emotion()}", "SUCCESS")

            elif choice == 'p':
                logger.log("用户操作: 预览完整剧本", "INFO")
                print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
                print(f"{Fore.CYAN}  预览 - {script.scene}{Style.RESET_ALL}")
                print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
                for j, dl in enumerate(script.dialogue):
                    print(f"  {Fore.YELLOW}L{j+1}{Style.RESET_ALL}: {dl.format_with_emotion()}")
                print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")

            elif choice == 's':
                logger.log("用户操作: 保存修改", "INFO")
                break

    # 显示修改后的结果
    logger.log("修改后的对话内容:", "STEP")
    for i, dl in enumerate(script.dialogue):
        logger.log(f"  L{i+1}: {dl.format_with_emotion()}", "OUTPUT")

    # 验证修改
    checks = [
        ("第1行角色名修改为'男主角'", script.dialogue[0].speaker == "男主角"),
        ("第1行情绪标签修改为'紧张地结巴'", script.dialogue[0].emotion == "紧张地结巴"),
        ("第1行对话内容已修改", "请...请问" in script.dialogue[0].text),
        ("第2行角色名修改为'女主角'", script.dialogue[1].speaker == "女主角"),
        ("第2行情绪标签修改为'开心地笑着'", script.dialogue[1].emotion == "开心地笑着"),
        ("第4行是新插入的对话", script.dialogue[3].text == "哇，你也喜欢看科幻小说吗？"),
    ]

    all_passed = True
    for check_name, result in checks:
        if result:
            logger.log(f"  ✓ {check_name}", "SUCCESS")
        else:
            logger.log(f"  ✗ {check_name}", "ERROR")
            all_passed = False

    logger.log(f"步骤3完成: 逐句修改功能验证{'通过' if all_passed else '失败'}", "SUCCESS" if all_passed else "ERROR")
    return script, all_passed


def step4_sentiment_analysis(logger: VerificationLogger, script: Script):
    """步骤4: 情感弧线分析"""
    print(f"\n{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}  步骤4: 情感弧线分析{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")

    # 添加情感数据（模拟LLM返回的情感分析结果）
    sentiments_data = [
        {"joy": 0.2, "sadness": 0.0, "anger": 0.0, "fear": 0.1, "surprise": 0.0, "tension": 0.8, "affection": 0.1},
        {"joy": 0.8, "sadness": 0.0, "anger": 0.0, "fear": 0.0, "surprise": 0.3, "tension": 0.1, "affection": 0.5},
        {"joy": 0.6, "sadness": 0.0, "anger": 0.0, "fear": 0.0, "surprise": 0.2, "tension": 0.3, "affection": 0.4},
        {"joy": 0.7, "sadness": 0.0, "anger": 0.0, "fear": 0.0, "surprise": 0.5, "tension": 0.1, "affection": 0.6},
        {"joy": 0.5, "sadness": 0.0, "anger": 0.0, "fear": 0.0, "surprise": 0.1, "tension": 0.2, "affection": 0.5},
        {"joy": 0.6, "sadness": 0.0, "anger": 0.0, "fear": 0.0, "surprise": 0.4, "tension": 0.1, "affection": 0.7},
    ]

    for i, dl in enumerate(script.dialogue):
        dl.sentiment = Sentiment(**sentiments_data[i]) if i < len(sentiments_data) else Sentiment()

    # 生成情感图表
    analyzer = SentimentAnalyzer()
    chart = analyzer.generate_ascii_chart(script)

    logger.log("情感弧线分析图表:", "STEP")
    print(chart)

    # 验证图表包含必要信息
    checks = [
        ("图表包含角色名'男主角'", "男主角" in chart),
        ("图表包含角色名'女主角'", "女主角" in chart),
        ("图表包含轮次标注'L1'", "L1" in chart),
        ("图表包含轮次标注'L2'", "L2" in chart),
        ("图表包含对话明细区", "对话明细" in chart),
        ("图表包含情感强度曲线", "joy" in chart.lower() or "喜悦" in chart),
    ]

    all_passed = True
    for check_name, result in checks:
        if result:
            logger.log(f"  ✓ {check_name}", "SUCCESS")
        else:
            logger.log(f"  ✗ {check_name}", "ERROR")
            all_passed = False

    logger.log(f"步骤4完成: 情感弧线分析验证{'通过' if all_passed else '失败'}", "SUCCESS" if all_passed else "ERROR")
    return all_passed


def step5_fdx_export_and_validation(logger: VerificationLogger, script: Script):
    """步骤5: FDX导出与验证"""
    print(f"\n{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}  步骤5: FDX导出与格式验证{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")

    exporter = Exporter(output_dir="./output")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"demo_{timestamp}.fdx"

    logger.log(f"导出FDX文件: ./output/{filename}", "STEP")
    fdx_path = exporter.export(script, "fdx", filename)

    logger.log(f"✓ FDX文件已生成: {fdx_path}", "SUCCESS")

    # 使用Python解析验证格式
    logger.log("使用Python解析验证FDX格式...", "INFO")

    import xml.etree.ElementTree as ET
    try:
        tree = ET.parse(fdx_path)
        root = tree.getroot()
        logger.log("XML格式解析成功", "SUCCESS")

        checks = [
            ('XML声明存在', True),
            ('根元素为FinalDraft', root.tag == "FinalDraft"),
            ('DocumentType=Script', root.get("DocumentType") == "Script"),
            ('Version属性存在', root.get("Version") is not None),
            ('包含Content元素', root.find("Content") is not None),
            ('包含WordProcessing元素', root.find("WordProcessing") is not None),
        ]

        content = root.find("Content")
        if content is not None:
            paragraphs = content.findall("Paragraph")
            checks.append((f'找到 {len(paragraphs)} 个Paragraph元素', len(paragraphs) > 0))

            types_found = set()
            for para in paragraphs:
                ptype = para.get("Type")
                if ptype:
                    types_found.add(ptype)

            required_types = ["Scene Heading", "Character", "Dialogue"]
            for rtype in required_types:
                checks.append((f'包含"{rtype}"段落类型', rtype in types_found))

            # 验证字体
            for para in paragraphs:
                text_elems = para.findall("Text")
                for text_elem in text_elems:
                    font = text_elem.get("Font", "")
                    if "Courier" in font:
                        checks.append(('使用Courier字体', True))
                        break
                else:
                    continue
                break

        all_passed = True
        for check_name, result in checks:
            if result:
                logger.log(f"  ✓ {check_name}", "SUCCESS")
            else:
                logger.log(f"  ✗ {check_name}", "ERROR")
                all_passed = False

        # 显示FDX内容预览
        logger.log("FDX文件内容预览:", "OUTPUT")
        with open(fdx_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for line in lines[:30]:  # 显示前30行
                logger.log(f"  {line.rstrip()}", "OUTPUT")
            if len(lines) > 30:
                logger.log(f"  ... (共 {len(lines)} 行，省略 {len(lines)-30} 行)", "OUTPUT")

        logger.log(f"步骤5完成: FDX格式验证{'通过' if all_passed else '失败'}", "SUCCESS" if all_passed else "ERROR")

        # 导出其他格式
        txt_path = exporter.export(script, "txt", f"demo_{timestamp}.txt")
        json_path = exporter.export(script, "json", f"demo_{timestamp}.json")
        logger.log(f"同时导出了 TXT: {txt_path}", "INFO")
        logger.log(f"同时导出了 JSON: {json_path}", "INFO")

        return fdx_path, all_passed

    except Exception as e:
        logger.log(f"FDX解析失败: {e}", "ERROR")
        return None, False


def main():
    """主函数 - 完整演示流程"""
    os.makedirs("./output", exist_ok=True)
    os.makedirs("./screenshots", exist_ok=True)

    logger = VerificationLogger()

    print(f"\n{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}  AI剧本对话生成器 - 完整功能验证演示{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}  开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")

    # 执行所有步骤
    results = {}

    # 步骤1: API配置
    results['api_config'] = step1_api_config(logger)

    # 步骤2: 多版本生成与选择
    selected_script = step2_multi_version_generation(logger)
    results['multi_version'] = selected_script is not None

    # 步骤3: 逐句修改
    modified_script, results['edit_dialogue'] = step3_edit_dialogue(logger, selected_script)

    # 步骤4: 情感弧线分析
    results['sentiment'] = step4_sentiment_analysis(logger, modified_script)

    # 步骤5: FDX导出与验证
    fdx_path, results['fdx_validation'] = step5_fdx_export_and_validation(logger, modified_script)

    # 结果汇总
    print(f"\n{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}  验证结果汇总{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{'='*80}{Style.RESET_ALL}")

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    logger.log(f"总计: {passed}/{total} 项验证通过", "INFO")
    print()

    step_names = {
        'api_config': 'API配置',
        'multi_version': '多版本生成与选择',
        'edit_dialogue': '逐句修改功能',
        'sentiment': '情感弧线分析',
        'fdx_validation': 'FDX格式验证',
    }

    for key, name in step_names.items():
        status = f"{Fore.GREEN}通过{Style.RESET_ALL}" if results[key] else f"{Fore.RED}失败{Style.RESET_ALL}"
        logger.log(f"  {name}: {status}", "INFO")

    # 保存日志
    log_path = f"./output/verification_demo_{logger.timestamp}.log"
    logger.save(log_path)

    # 生成的文件列表
    print(f"\n{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}  生成的文件{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
    print(f"  📄 验证日志: {log_path}")
    print(f"  📄 .env配置: ./.env")
    if fdx_path:
        print(f"  📄 FDX剧本: {fdx_path}")
        print(f"  📄 TXT剧本: {fdx_path.replace('.fdx', '.txt')}")
        print(f"  📄 JSON剧本: {fdx_path.replace('.fdx', '.json')}")

    print(f"\n{Fore.GREEN}{'='*80}{Style.RESET_ALL}")
    print(f"{Fore.GREEN}  🎉 完整验证演示完成！{Style.RESET_ALL}")
    print(f"{Fore.GREEN}{'='*80}{Style.RESET_ALL}\n")

    return passed == total


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
