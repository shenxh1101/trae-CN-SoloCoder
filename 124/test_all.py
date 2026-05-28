import os
import sys
import json
import uuid
import shutil
import zipfile
import tempfile
import time
import re
from datetime import datetime
from io import BytesIO

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, NOTES_DIR, VERSIONS_DIR, TRASH_DIR, DRAFTS_DIR, \
    save_note, load_note, get_all_notes, filter_notes_by_tags, search_notes, \
    save_version, get_versions, load_version, get_summary

PASS_COUNT = 0
FAIL_COUNT = 0
TEST_LOG = []


def log_test(name, passed, detail=""):
    global PASS_COUNT, FAIL_COUNT
    status = "✅ PASS" if passed else "❌ FAIL"
    FAIL_COUNT += 1 if not passed else 0
    PASS_COUNT += 1 if passed else 0
    msg = f"{status} | {name}"
    if detail:
        msg += f"\n       {detail}"
    print(msg)
    TEST_LOG.append(msg)


def clean_data():
    for d in [NOTES_DIR, VERSIONS_DIR, TRASH_DIR, DRAFTS_DIR]:
        if os.path.exists(d):
            for f in os.listdir(d):
                fp = os.path.join(d, f)
                if os.path.isfile(fp):
                    os.remove(fp)
                elif os.path.isdir(fp):
                    shutil.rmtree(fp)


def test_1_note_creation():
    print("\n" + "=" * 60)
    print("测试1: 创建笔记 — UUID文件生成和JSON内容保存")
    print("=" * 60)

    with app.test_client() as client:
        resp = client.post('/create', data={
            'title': '测试笔记标题',
            'content': '这是测试笔记的内容，包含一些中文和English混合文本。',
            'tags': '测试, 重要, flask'
        }, follow_redirects=True)

        log_test("创建笔记HTTP状态码", resp.status_code == 200,
                 f"状态码: {resp.status_code}")

    json_files = [f for f in os.listdir(NOTES_DIR) if f.endswith('.json')]
    log_test("生成UUID命名的JSON文件", len(json_files) == 1,
             f"找到文件: {json_files}")

    if json_files:
        note_id = json_files[0][:-5]
        try:
            uuid.UUID(note_id)
            is_uuid = True
        except ValueError:
            is_uuid = False
        log_test("文件名是合法UUID", is_uuid, f"note_id: {note_id}")

        note_path = os.path.join(NOTES_DIR, json_files[0])
        with open(note_path, 'r', encoding='utf-8') as f:
            note = json.load(f)

        log_test("JSON包含title字段", note.get('title') == '测试笔记标题',
                 f"title: {note.get('title')}")
        log_test("JSON包含content字段", note.get('content') == '这是测试笔记的内容，包含一些中文和English混合文本。',
                 f"content长度: {len(note.get('content', ''))}")
        log_test("JSON包含tags字段", note.get('tags') == ['测试', '重要', 'flask'],
                 f"tags: {note.get('tags')}")
        log_test("JSON包含created_at字段", 'created_at' in note,
                 f"created_at: {note.get('created_at')}")
        log_test("JSON包含id字段", note.get('id') == note_id,
                 f"id: {note.get('id')}")
        log_test("JSON包含pinned字段", note.get('pinned') == False,
                 f"pinned: {note.get('pinned')}")

        print(f"\n       📄 完整JSON内容:")
        for line in json.dumps(note, ensure_ascii=False, indent=2).split('\n'):
            print(f"       {line}")

        return note_id
    return None


def test_2_tag_filtering():
    print("\n" + "=" * 60)
    print("测试2: 多标签筛选功能")
    print("=" * 60)

    test_notes = [
        {'title': 'Python笔记', 'content': 'Python学习', 'tags': ['编程', 'Python'], 'created_at': datetime.now().isoformat(), 'updated_at': datetime.now().isoformat(), 'pinned': False},
        {'title': 'Flask笔记', 'content': 'Flask框架', 'tags': ['编程', 'Flask', 'Web'], 'created_at': datetime.now().isoformat(), 'updated_at': datetime.now().isoformat(), 'pinned': False},
        {'title': '读书笔记', 'content': '读书心得', 'tags': ['阅读', '文学'], 'created_at': datetime.now().isoformat(), 'updated_at': datetime.now().isoformat(), 'pinned': False},
        {'title': '全栈笔记', 'content': '全栈开发', 'tags': ['编程', 'Python', 'Web'], 'created_at': datetime.now().isoformat(), 'updated_at': datetime.now().isoformat(), 'pinned': False},
    ]

    for n in test_notes:
        save_note(n)

    with app.test_client() as client:
        resp = client.get('/?tag=编程')
        log_test("单标签筛选(编程) — HTTP 200", resp.status_code == 200)
        html = resp.data.decode('utf-8')
        has_python = 'Python笔记' in html
        has_flask = 'Flask笔记' in html
        has_reading = '读书笔记' in html
        log_test("单标签筛选(编程) — 包含Python笔记", has_python)
        log_test("单标签筛选(编程) — 包含Flask笔记", has_flask)
        log_test("单标签筛选(编程) — 不含读书笔记", not has_reading)

        resp = client.get('/?tag=编程&tag=Python')
        html = resp.data.decode('utf-8')
        has_python = 'Python笔记' in html
        has_flask = 'Flask笔记' in html
        has_fullstack = '全栈笔记' in html
        has_reading = '读书笔记' in html
        log_test("组合标签筛选(编程+Python) — 包含Python笔记", has_python)
        log_test("组合标签筛选(编程+Python) — 不含Flask笔记", not has_flask,
                 "Flask笔记没有Python标签")
        log_test("组合标签筛选(编程+Python) — 包含全栈笔记", has_fullstack)
        log_test("组合标签筛选(编程+Python) — 不含读书笔记", not has_reading)

        resp = client.get('/?tag=编程&tag=Web')
        html = resp.data.decode('utf-8')
        has_flask = 'Flask笔记' in html
        has_fullstack = '全栈笔记' in html
        has_python_note = 'Python笔记' in html
        log_test("组合标签筛选(编程+Web) — 包含Flask笔记", has_flask)
        log_test("组合标签筛选(编程+Web) — 包含全栈笔记", has_fullstack)
        log_test("组合标签筛选(编程+Web) — 不含Python笔记", not has_python_note)

    all_notes = get_all_notes()
    filtered = filter_notes_by_tags(all_notes, ['编程', 'Python'])
    titles = sorted([n['title'] for n in filtered])
    log_test("直接调用filter_notes_by_tags(编程+Python)", titles == ['Python笔记', '全栈笔记'],
             f"结果(排序后): {titles}")


def test_3_fulltext_search():
    print("\n" + "=" * 60)
    print("测试3: 全文搜索功能（标题+内容+标签）")
    print("=" * 60)

    with app.test_client() as client:
        resp = client.get('/?q=Python')
        html = resp.data.decode('utf-8')
        has_python = 'Python笔记' in html
        has_fullstack = '全栈笔记' in html
        has_flask = 'Flask笔记' in html
        log_test("搜索'Python' — 包含Python笔记(标题匹配)", has_python)
        log_test("搜索'Python' — 包含全栈笔记(标签含Python)", has_fullstack)
        log_test("搜索'Python' — 不含Flask笔记", not has_flask)

        resp = client.get('/?q=学习')
        html = resp.data.decode('utf-8')
        has_python = 'Python笔记' in html
        log_test("搜索'学习'(内容搜索) — 包含Python笔记", has_python)

        resp = client.get('/?q=读书')
        html = resp.data.decode('utf-8')
        has_reading = '读书笔记' in html
        log_test("搜索'读书'(标题搜索) — 包含读书笔记", has_reading)

        resp = client.get('/?q=不存在的内容xyz')
        html = resp.data.decode('utf-8')
        log_test("搜索不存在关键词 — 返回200", resp.status_code == 200)
        log_test("搜索不存在关键词 — 显示空状态", '暂无笔记' in html or '没有找到' in html)

    all_notes = get_all_notes()
    results = search_notes(all_notes, 'Python')
    titles = [n['title'] for n in results]
    log_test("直接调用search_notes('Python')", 'Python笔记' in titles and '全栈笔记' in titles,
             f"结果: {titles}")

    results_case = search_notes(all_notes, 'python')
    log_test("搜索大小写不敏感('python' vs 'Python')", len(results_case) == len(results),
             f"大写: {len(results)}条, 小写: {len(results_case)}条")

    results_tag = search_notes(all_notes, 'Web')
    tag_titles = [n['title'] for n in results_tag]
    log_test("搜索标签'Web' — 包含Flask笔记和全栈笔记",
             'Flask笔记' in tag_titles and '全栈笔记' in tag_titles,
             f"结果: {tag_titles}")


def test_4_import_export():
    print("\n" + "=" * 60)
    print("测试4: 导入导出Markdown文件")
    print("=" * 60)

    with app.test_client() as client:
        resp = client.get('/export')
        log_test("导出 — HTTP 200", resp.status_code == 200)
        log_test("导出 — Content-Type为zip", 'zip' in resp.content_type,
                 f"Content-Type: {resp.content_type}")

        zip_bytes = resp.data
        zip_buffer = BytesIO(zip_bytes)
        log_test("导出 — 返回有效的ZIP文件", zipfile.is_zipfile(zip_buffer))

        if zipfile.is_zipfile(zip_buffer):
            zip_buffer.seek(0)
            with zipfile.ZipFile(zip_buffer, 'r') as zf:
                namelist = zf.namelist()
                log_test("导出 — ZIP包含md文件", all(n.endswith('.md') for n in namelist),
                         f"文件列表: {namelist}")

                md_content = None
                for name in namelist:
                    if 'Python' in name:
                        md_content = zf.read(name).decode('utf-8')
                        break

                if md_content:
                    log_test("导出 — Markdown包含标题", md_content.startswith('# '),)
                    log_test("导出 — Markdown包含标签行", '**标签**' in md_content)
                    log_test("导出 — Markdown包含创建时间", '**创建时间**' in md_content)
                    log_test("导出 — Markdown包含分隔线", '---' in md_content)
                    print(f"\n       📄 导出的Python笔记内容预览:")
                    for line in md_content[:300].split('\n'):
                        print(f"       {line}")

    clean_data()

    with app.test_client() as client:
        md_file_content = "# 导入测试笔记\n\n**标签**: 测试, 导入\n\n**创建时间**: 2024-01-01 12:00:00\n\n---\n\n这是导入的笔记内容。"
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as tmp:
            tmp.write(md_file_content)
            tmp_path = tmp.name

        with open(tmp_path, 'rb') as f:
            resp = client.post('/import', data={'file': (f, '导入测试笔记.md')}, follow_redirects=True)
        os.unlink(tmp_path)

        log_test("导入 — HTTP 200", resp.status_code == 200)

    notes = get_all_notes()
    imported = [n for n in notes if n.get('title') == '导入测试笔记']
    log_test("导入 — 笔记已创建", len(imported) > 0)

    if imported:
        note = imported[0]
        log_test("导入 — 标题正确解析", note['title'] == '导入测试笔记',
                 f"title: {note['title']}")
        log_test("导入 — 标签正确解析", note['tags'] == ['测试', '导入'],
                 f"tags: {note['tags']}")
        log_test("导入 — 内容正确解析(不含---分隔线)", 
                 '这是导入的笔记内容' in note['content'] and '---' not in note['content'],
                 f"content: {note['content'][:80]}")

    clean_data()

    with app.test_client() as client:
        md_no_title = "这是一个没有标题的Markdown文件内容"
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as tmp:
            tmp.write(md_no_title)
            tmp_path = tmp.name

        with open(tmp_path, 'rb') as f:
            resp = client.post('/import', data={'file': (f, '无标题文件.md')}, follow_redirects=True)
        os.unlink(tmp_path)

    notes = get_all_notes()
    no_title = [n for n in notes if n.get('title') == '无标题文件']
    log_test("导入(无标题) — 使用文件名作为标题", len(no_title) > 0)


def test_5_version_control():
    print("\n" + "=" * 60)
    print("测试5: 版本控制 — 历史版本保存和恢复")
    print("=" * 60)

    note_data = {
        'title': '版本测试笔记',
        'content': '这是第一版内容',
        'tags': ['版本'],
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'pinned': False
    }
    note_id = save_note(note_data)

    with app.test_client() as client:
        resp = client.post(f'/edit/{note_id}', data={
            'title': '版本测试笔记V2',
            'content': '这是第二版内容，已经修改过了',
            'tags': '版本, 更新'
        }, follow_redirects=True)
        log_test("编辑笔记V2 — HTTP 200", resp.status_code == 200)

    version_dir = os.path.join(VERSIONS_DIR, note_id)
    log_test("版本目录已创建", os.path.isdir(version_dir))

    versions = get_versions(note_id)
    log_test("编辑一次后存在1个历史版本", len(versions) == 1, f"版本数: {len(versions)}")

    if versions:
        v = versions[0]
        log_test("版本ID含微秒(避免时间戳冲突)", bool(re.match(r'^\d{8}_\d{6}_\d+$', v['id'])),
                 f"版本ID: {v['id']}")
        log_test("历史版本标题为第一版", v['title'] == '版本测试笔记',
                 f"标题: {v['title']}")

        version_note = load_version(note_id, v['id'])
        log_test("历史版本内容为第一版", version_note['content'] == '这是第一版内容',
                 f"内容: {version_note['content']}")

    time.sleep(0.01)

    with app.test_client() as client:
        resp = client.post(f'/edit/{note_id}', data={
            'title': '版本测试笔记V3',
            'content': '这是第三版内容',
            'tags': '版本, 更新, 最新'
        }, follow_redirects=True)

    versions = get_versions(note_id)
    log_test("第二次编辑后存在2个历史版本", len(versions) == 2,
             f"版本数: {len(versions)}")

    current_note = load_note(note_id)
    log_test("当前笔记是最新版本", current_note['title'] == '版本测试笔记V3',
             f"当前标题: {current_note['title']}")

    if versions and len(versions) >= 2:
        first_version_id = versions[-1]['id']
        with app.test_client() as client:
            resp = client.post(f'/restore-version/{note_id}/{first_version_id}',
                             follow_redirects=True)
            log_test("恢复历史版本 — HTTP 200", resp.status_code == 200)

        restored = load_note(note_id)
        log_test("恢复后标题为第一版", restored['title'] == '版本测试笔记',
                 f"标题: {restored['title']}")
        log_test("恢复后内容为第一版", restored['content'] == '这是第一版内容',
                 f"内容: {restored['content']}")

        all_versions = get_versions(note_id)
        log_test("恢复操作产生了新的历史版本", len(all_versions) >= 3,
                 f"版本数: {len(all_versions)}")

    with app.test_client() as client:
        resp = client.get(f'/version/{note_id}/{versions[0]["id"]}')
        log_test("查看历史版本页面 — HTTP 200", resp.status_code == 200)
        html = resp.data.decode('utf-8')
        log_test("历史版本页面含只读提示", '历史版本' in html)


def test_6_autosave():
    print("\n" + "=" * 60)
    print("测试6: 自动保存草稿功能")
    print("=" * 60)

    note_id = str(uuid.uuid4())

    with app.test_client() as client:
        resp = client.post(f'/autosave/{note_id}',
                          json={
                              'title': '草稿标题',
                              'content': '这是自动保存的草稿内容',
                              'tags': ['草稿', '测试']
                          },
                          content_type='application/json')
        log_test("自动保存API — HTTP 200", resp.status_code == 200)
        data = json.loads(resp.data)
        log_test("自动保存API — 返回ok状态", data.get('status') == 'ok',
                 f"返回: {data}")

    draft_path = os.path.join(DRAFTS_DIR, f'{note_id}.json')
    log_test("草稿文件已生成", os.path.exists(draft_path), f"路径: {draft_path}")

    if os.path.exists(draft_path):
        with open(draft_path, 'r', encoding='utf-8') as f:
            draft = json.load(f)
        log_test("草稿标题正确", draft.get('title') == '草稿标题',
                 f"title: {draft.get('title')}")
        log_test("草稿内容正确", draft.get('content') == '这是自动保存的草稿内容',
                 f"content: {draft.get('content')}")
        log_test("草稿标签正确", draft.get('tags') == ['草稿', '测试'],
                 f"tags: {draft.get('tags')}")
        log_test("草稿含saved_at时间戳", 'saved_at' in draft,
                 f"saved_at: {draft.get('saved_at')}")

    with app.test_client() as client:
        resp = client.get(f'/draft/{note_id}')
        log_test("获取草稿API — HTTP 200", resp.status_code == 200)
        data = json.loads(resp.data)
        log_test("获取草稿 — 内容匹配", data.get('title') == '草稿标题',
                 f"title: {data.get('title')}")

    with app.test_client() as client:
        resp = client.get(f'/draft/{str(uuid.uuid4())}')
        data = json.loads(resp.data)
        log_test("获取不存在的草稿 — 返回null", data is None,
                 f"返回: {data}")

    note_data = {
        'title': '正式笔记',
        'content': '正式内容',
        'tags': [],
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'pinned': False
    }
    real_id = save_note(note_data)

    draft_for_real = os.path.join(DRAFTS_DIR, f'{real_id}.json')
    with open(draft_for_real, 'w', encoding='utf-8') as f:
        json.dump({'title': '草稿', 'content': '草稿内容', 'tags': [], 'saved_at': datetime.now().isoformat()}, f)

    with app.test_client() as client:
        resp = client.post(f'/edit/{real_id}', data={
            'title': '更新后标题',
            'content': '更新后内容',
            'tags': ''
        }, follow_redirects=True)
        log_test("编辑保存后草稿被清除", not os.path.exists(draft_for_real),
                 f"草稿文件存在: {os.path.exists(draft_for_real)}")

    print(f"\n       ⏱️  自动保存定时器验证说明:")
    print(f"       - 前端JS: 输入时启动30秒 setTimeout(autosave, 30000)")
    print(f"       - 30秒内新输入重置倒计时 clearTimeout + 新setTimeout")
    print(f"       - autosave() 发 POST /autosave/<id> 保存到 data/drafts/")
    print(f"       - 再次编辑时 GET /draft/<id> 检测并提示恢复草稿")
    print(f"       - 正式保存后自动删除对应草稿文件")


def test_7_dark_theme():
    print("\n" + "=" * 60)
    print("测试7: 暗色主题切换")
    print("=" * 60)

    with app.test_client() as client:
        resp = client.get('/')
        html = resp.data.decode('utf-8')

    log_test("页面包含暗色主题CSS变量", '.dark {' in html)

    dark_vars = ['--bg-primary: #1a1a2e', '--bg-secondary: #16213e', '--bg-tertiary: #0f3460']
    for var in dark_vars:
        log_test(f"暗色CSS变量 {var.split(':')[0]}", var in html)

    log_test("页面包含主题切换按钮", 'theme-toggle' in html)
    log_test("主题切换按钮含toggleTheme函数", 'toggleTheme' in html)
    log_test("包含localStorage持久化", "localStorage.setItem('theme'" in html)
    log_test("包含加载主题函数", 'loadTheme' in html)
    log_test("包含系统暗色偏好检测", 'prefers-color-scheme' in html)
    log_test("body含dark类切换", "classList.toggle('dark')" in html)
    log_test("暗色热力图颜色定义", 'dark .calendar-cell.level' in html)

    log_test("亮色主题有过渡动画", 'transition: background-color 0.3s' in html or 'transition: background-color' in html)
    log_test("暗色有对比色文字", '--text-primary: #eaeaea' in html)
    log_test("暗色有对比边框", '--border-color: #2a2a4a' in html)

    print(f"\n       🎨 暗色主题切换机制:")
    print(f"       - CSS使用 :root 和 .dark 两套变量")
    print(f"       - 点击🌓按钮触发 toggleTheme()")
    print(f"       - 通过 body.classList.toggle('dark') 切换")
    print(f"       - 主题偏好保存在 localStorage")
    print(f"       - 页面加载时自动 loadTheme() 恢复设置")
    print(f"       - 首次访问检测系统 prefers-color-scheme")
    print(f"       - 所有组件通过CSS变量自动适配暗色模式")


def test_8_additional_features():
    print("\n" + "=" * 60)
    print("测试8: 其他功能验证（置顶/复制/删除/回收站/统计）")
    print("=" * 60)

    clean_data()

    note1 = {
        'title': '笔记A',
        'content': '笔记A的内容',
        'tags': ['测试'],
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'pinned': False
    }
    note2 = {
        'title': '笔记B',
        'content': '笔记B的内容',
        'tags': ['测试'],
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'pinned': False
    }
    id1 = save_note(note1)
    id2 = save_note(note2)

    with app.test_client() as client:
        resp = client.post(f'/pin/{id1}', follow_redirects=True)
        log_test("置顶笔记 — HTTP 200", resp.status_code == 200)

    pinned = load_note(id1)
    log_test("置顶 — pinned字段变为True", pinned.get('pinned') == True,
             f"pinned: {pinned.get('pinned')}")

    with app.test_client() as client:
        resp = client.get('/')
        html = resp.data.decode('utf-8')
        log_test("置顶笔记 — 列表页含📌标记", '📌' in html)

    with app.test_client() as client:
        resp = client.post(f'/pin/{id1}', follow_redirects=True)
    unpinned = load_note(id1)
    log_test("取消置顶 — pinned字段变为False", unpinned.get('pinned') == False)

    with app.test_client() as client:
        resp = client.post(f'/copy/{id1}', follow_redirects=True)
        log_test("复制笔记 — HTTP 200", resp.status_code == 200)

    all_notes = get_all_notes()
    copy_note = [n for n in all_notes if n['title'] == '笔记A (副本)']
    log_test("复制 — 新笔记标题含(副本)", len(copy_note) > 0)
    if copy_note:
        log_test("复制 — 内容与原笔记相同", copy_note[0]['content'] == '笔记A的内容')
        log_test("复制 — 新笔记有独立UUID", copy_note[0]['id'] != id1,
                 f"原ID: {id1[:8]}..., 副本ID: {copy_note[0]['id'][:8]}...")

    with app.test_client() as client:
        resp = client.post(f'/delete/{id2}', follow_redirects=True)
        log_test("删除笔记 — HTTP 200", resp.status_code == 200)

    log_test("删除 — 笔记从notes目录移除", not os.path.exists(os.path.join(NOTES_DIR, f'{id2}.json')))
    log_test("删除 — 笔记移到trash目录", os.path.exists(os.path.join(TRASH_DIR, f'{id2}.json')))

    trash_note = load_note(id2, from_trash=True)
    log_test("回收站 — 可读取已删除笔记", trash_note is not None)
    log_test("回收站 — 笔记内容完整", trash_note['content'] == '笔记B的内容')

    with app.test_client() as client:
        resp = client.post(f'/restore/{id2}', follow_redirects=True)
        log_test("恢复笔记 — HTTP 200", resp.status_code == 200)

    log_test("恢复 — 笔记回到notes目录", os.path.exists(os.path.join(NOTES_DIR, f'{id2}.json')))
    log_test("恢复 — 笔记从trash目录移除", not os.path.exists(os.path.join(TRASH_DIR, f'{id2}.json')))

    with app.test_client() as client:
        resp = client.post(f'/delete/{id2}', follow_redirects=True)
        resp = client.post(f'/permanent-delete/{id2}', follow_redirects=True)
        log_test("永久删除 — HTTP 200", resp.status_code == 200)

    log_test("永久删除 — 文件彻底不存在", not os.path.exists(os.path.join(TRASH_DIR, f'{id2}.json')))

    with app.test_client() as client:
        resp = client.get('/stats')
        log_test("统计页面 — HTTP 200", resp.status_code == 200)
        html = resp.data.decode('utf-8')
        log_test("统计页面 — 包含总笔记数", '总笔记数' in html)
        log_test("统计页面 — 包含日历热力图", 'calendarHeatmap' in html)
        log_test("统计页面 — 包含热门标签", '热门标签' in html)
        log_test("统计页面 — 包含标签数量", '标签数量' in html)

    with app.test_client() as client:
        resp = client.get('/trash')
        log_test("回收站页面 — HTTP 200", resp.status_code == 200)


if __name__ == '__main__':
    print("=" * 60)
    print(" 🧪 Flask笔记服务 — 综合功能测试")
    print(" 🕐 测试时间:", datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    print("=" * 60)

    app.config['TESTING'] = True
    clean_data()

    test_1_note_creation()
    test_2_tag_filtering()
    test_3_fulltext_search()
    test_4_import_export()
    test_5_version_control()
    test_6_autosave()
    test_7_dark_theme()
    test_8_additional_features()

    print("\n" + "=" * 60)
    print(f" 📊 测试结果汇总")
    print(f"    ✅ 通过: {PASS_COUNT}")
    print(f"    ❌ 失败: {FAIL_COUNT}")
    print(f"    📋 总计: {PASS_COUNT + FAIL_COUNT}")
    print(f"    📈 通过率: {PASS_COUNT / (PASS_COUNT + FAIL_COUNT) * 100:.1f}%")
    print("=" * 60)

    if FAIL_COUNT > 0:
        print("\n ❌ 失败的测试:")
        for log in TEST_LOG:
            if '❌ FAIL' in log:
                print(f"    {log.split('|')[1].strip()}")

    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_result.log')
    with open(log_path, 'w', encoding='utf-8') as f:
        f.write(f"Flask笔记服务 — 综合功能测试日志\n")
        f.write(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"通过: {PASS_COUNT}, 失败: {FAIL_COUNT}, 总计: {PASS_COUNT + FAIL_COUNT}\n")
        f.write(f"通过率: {PASS_COUNT / (PASS_COUNT + FAIL_COUNT) * 100:.1f}%\n\n")
        for log in TEST_LOG:
            f.write(log + '\n')
    print(f"\n 📄 测试日志已保存到: {log_path}")
