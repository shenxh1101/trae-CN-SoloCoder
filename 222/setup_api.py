#!/usr/bin/env python3
"""
快速配置 API Key 并测试 AI 总结功能
运行: python3 setup_api.py
"""
import os
import sys


def main():
    print("=" * 60)
    print("  AI 会议总结工具 - API Key 快速配置")
    print("=" * 60)
    print()
    print("支持的 API 服务:")
    print("  1. DeepSeek (推荐, 国内直连, 性价比高)")
    print("  2. OpenAI (官方)")
    print("  3. 智谱AI (GLM)")
    print("  4. 通义千问")
    print("  5. 豆包API")
    print()
    
    choice = input("请选择 API 服务 [1-5] (默认: 1): ").strip() or "1"
    
    configs = {
        "1": {
            "name": "DeepSeek",
            "model": "deepseek-chat",
            "base_url": "https://api.deepseek.com/v1",
            "key_prefix": "sk-",
            "guide": "注册 https://platform.deepseek.com 获取 API Key"
        },
        "2": {
            "name": "OpenAI",
            "model": "gpt-3.5-turbo",
            "base_url": "",
            "key_prefix": "sk-",
            "guide": "注册 https://platform.openai.com 获取 API Key"
        },
        "3": {
            "name": "智谱AI",
            "model": "glm-4",
            "base_url": "https://open.bigmodel.cn/api/paas/v4",
            "key_prefix": "",
            "guide": "注册 https://open.bigmodel.cn 获取 API Key"
        },
        "4": {
            "name": "通义千问",
            "model": "qwen-plus",
            "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "key_prefix": "sk-",
            "guide": "注册 https://dashscope.console.aliyun.com 获取 API Key"
        },
        "5": {
            "name": "豆包API",
            "model": "doubao-pro-32k",
            "base_url": "https://ark.cn-beijing.volces.com/api/v3",
            "key_prefix": "",
            "guide": "注册 https://console.volcengine.com/ark 获取 API Key"
        }
    }
    
    if choice not in configs:
        print(f"✗ 无效选择: {choice}")
        return
    
    config = configs[choice]
    print(f"\n已选择: {config['name']}")
    print(f"获取 API Key: {config['guide']}")
    print()
    
    api_key = input(f"请输入 API Key: ").strip()
    if not api_key:
        print("✗ API Key 不能为空")
        return
    
    custom_model = input(f"模型名称 (默认: {config['model']}): ").strip() or config['model']
    
    env_content = f"""OPENAI_API_KEY={api_key}
OPENAI_MODEL={custom_model}
OPENAI_BASE_URL={config['base_url']}
"""
    
    env_path = ".env"
    with open(env_path, 'w', encoding='utf-8') as f:
        f.write(env_content)
    
    print(f"\n✓ 配置已保存到 {env_path}")
    print(f"  API Key: {api_key[:8]}...{api_key[-4:]}")
    print(f"  模型: {custom_model}")
    print(f"  API 地址: {config['base_url'] or '(OpenAI默认)'}")
    
    print("\n" + "=" * 60)
    print("  配置完成! 运行以下命令测试:")
    print("=" * 60)
    print()
    print(f"  # 测试 AI 总结")
    print(f"  python main.py -i example_meeting.txt -o output/ai_summary.md")
    print()
    print(f"  # 端到端测试")
    print(f"  python test_llm_e2e.py")
    print()
    print(f"  # 批量处理 + AI总结")
    print(f"  python main.py -b batch_input/ -O output/ai_batch --comparison")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n已取消")
        sys.exit(0)
