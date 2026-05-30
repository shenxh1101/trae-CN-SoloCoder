#!/usr/bin/env python3
"""
API配置引导脚本 - 帮助用户配置OpenAI API密钥并验证连接
"""

import os
import sys
from colorama import init, Fore, Style

init()


def check_api_config():
    """检查当前API配置状态"""
    env_file = os.path.join(os.path.dirname(__file__), '.env')
    api_key = os.getenv("OPENAI_API_KEY", "")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    has_env_file = os.path.exists(env_file)
    env_key = ""
    if has_env_file:
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith("OPENAI_API_KEY="):
                    env_key = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
                    break

    return {
        "has_env_file": has_env_file,
        "env_api_key": env_key,
        "env_api_key_set": bool(env_key) and env_key != "your_api_key_here",
        "system_api_key": api_key,
        "system_api_key_set": bool(api_key) and api_key != "your_api_key_here",
        "base_url": base_url,
        "model": model
    }


def test_api_connection():
    """测试API连接是否正常"""
    print(f"\n{Fore.CYAN}正在测试API连接...{Style.RESET_ALL}")

    try:
        from openai import OpenAI
    except ImportError:
        print(f"{Fore.RED}❌ 未安装 openai 库，请运行: pip install openai{Style.RESET_ALL}")
        return False

    api_key = os.getenv("OPENAI_API_KEY", "")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    if not api_key or api_key == "your_api_key_here":
        print(f"{Fore.RED}❌ 未配置有效的 API 密钥{Style.RESET_ALL}")
        return False

    try:
        client = OpenAI(api_key=api_key, base_url=base_url)
        print(f"  测试模型: {model}")
        print(f"  API端点: {base_url}")

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "请回复'连接成功'"}],
            max_tokens=10,
            temperature=0
        )

        result = response.choices[0].message.content.strip()
        print(f"\n{Fore.GREEN}✅ API连接成功！{Style.RESET_ALL}")
        print(f"  响应: {result}")
        return True

    except Exception as e:
        print(f"\n{Fore.RED}❌ API连接失败: {e}{Style.RESET_ALL}")
        error_msg = str(e).lower()
        if "api key" in error_msg or "unauthorized" in error_msg:
            print(f"  提示: 请检查API密钥是否正确")
        elif "connection" in error_msg or "timeout" in error_msg:
            print(f"  提示: 请检查网络连接或代理设置")
        elif "model" in error_msg:
            print(f"  提示: 请检查模型名称是否正确，或该模型是否可用")
        return False


def setup_api_config():
    """引导用户配置API"""
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}  OpenAI API 配置向导{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")

    config = check_api_config()

    if config["system_api_key_set"]:
        print(f"\n{Fore.GREEN}✓ 检测到系统环境变量中已配置API密钥{Style.RESET_ALL}")
        print(f"  模型: {config['model']}")
        if test_api_connection():
            return True
    else:
        print(f"\n{Fore.YELLOW}未检测到有效的API配置{Style.RESET_ALL}")

    print(f"\n请输入您的API配置信息：")

    api_key = input(f"{Fore.GREEN}OpenAI API Key: {Style.RESET_ALL}").strip()
    if not api_key:
        print(f"{Fore.RED}API密钥不能为空{Style.RESET_ALL}")
        return False

    base_url = input(f"{Fore.GREEN}API Base URL (默认 https://api.openai.com/v1): {Style.RESET_ALL}").strip()
    if not base_url:
        base_url = "https://api.openai.com/v1"

    model = input(f"{Fore.GREEN}Model (默认 gpt-4o-mini): {Style.RESET_ALL}").strip()
    if not model:
        model = "gpt-4o-mini"

    env_content = f"""# OpenAI API 配置
OPENAI_API_KEY={api_key}
OPENAI_BASE_URL={base_url}
OPENAI_MODEL={model}
"""

    env_file = os.path.join(os.path.dirname(__file__), '.env')
    with open(env_file, 'w', encoding='utf-8') as f:
        f.write(env_content)

    print(f"\n{Fore.GREEN}✓ 配置已保存到 .env 文件{Style.RESET_ALL}")

    os.environ["OPENAI_API_KEY"] = api_key
    os.environ["OPENAI_BASE_URL"] = base_url
    os.environ["OPENAI_MODEL"] = model

    from dotenv import load_dotenv
    load_dotenv(override=True)

    return test_api_connection()


def show_config_status():
    """显示当前配置状态"""
    config = check_api_config()

    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}  当前配置状态{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")

    print(f"\n  .env 文件: {Fore.GREEN}存在{Style.RESET_ALL}" if config["has_env_file"] else f"\n  .env 文件: {Fore.RED}不存在{Style.RESET_ALL}")

    if config["env_api_key_set"]:
        masked = config["env_api_key"][:8] + "****" + config["env_api_key"][-4:]
        print(f"  .env API Key: {Fore.GREEN}{masked}{Style.RESET_ALL}")
    else:
        print(f"  .env API Key: {Fore.RED}未设置{Style.RESET_ALL}")

    if config["system_api_key_set"]:
        masked = config["system_api_key"][:8] + "****" + config["system_api_key"][-4:]
        print(f"  系统环境 API Key: {Fore.GREEN}{masked}{Style.RESET_ALL}")
    else:
        print(f"  系统环境 API Key: {Fore.RED}未设置{Style.RESET_ALL}")

    print(f"  API Base URL: {Fore.CYAN}{config['base_url']}{Style.RESET_ALL}")
    print(f"  Model: {Fore.CYAN}{config['model']}{Style.RESET_ALL}")

    is_configured = config["env_api_key_set"] or config["system_api_key_set"]
    if is_configured:
        print(f"\n{Fore.GREEN}✓ API配置已就绪{Style.RESET_ALL}")
    else:
        print(f"\n{Fore.YELLOW}⚠ API尚未配置，请先配置API密钥{Style.RESET_ALL}")

    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")

    return is_configured


def main():
    print(f"\n{Fore.MAGENTA}AI剧本对话生成器 - API配置工具{Style.RESET_ALL}")

    if len(sys.argv) > 1:
        if sys.argv[1] == 'status':
            show_config_status()
            return
        elif sys.argv[1] == 'test':
            from dotenv import load_dotenv
            load_dotenv()
            test_api_connection()
            return
        elif sys.argv[1] == 'setup':
            setup_api_config()
            return

    while True:
        print(f"\n{Fore.GREEN}请选择操作：{Style.RESET_ALL}")
        print(f"  1. 查看配置状态")
        print(f"  2. 配置/修改API")
        print(f"  3. 测试API连接")
        print(f"  4. 退出")

        choice = input(f"\n{Fore.GREEN}请输入选项 (1-4): {Style.RESET_ALL}").strip()

        if choice == '1':
            show_config_status()
        elif choice == '2':
            if setup_api_config():
                print(f"\n{Fore.GREEN}🎉 API配置完成，可以开始使用了！{Style.RESET_ALL}")
        elif choice == '3':
            from dotenv import load_dotenv
            load_dotenv()
            test_api_connection()
        elif choice == '4':
            print(f"\n{Fore.YELLOW}再见！{Style.RESET_ALL}")
            break
        else:
            print(f"{Fore.RED}无效选项{Style.RESET_ALL}")


if __name__ == '__main__':
    main()
