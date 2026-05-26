import os
import sys
import json
import unittest
import tempfile
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import (
    filter_sensitive,
    can_like,
    add_like,
    paginate_messages,
    validate_nickname,
    validate_content,
    get_today_count,
    load_config,
    load_messages,
    load_sensitive_words,
    EMOJIS,
    app as flask_app,
)


class TestFilterSensitive(unittest.TestCase):
    def setUp(self):
        self.original_path = os.path.join(os.path.dirname(__file__), 'sensitive_words.txt')
        self.temp_dir = tempfile.mkdtemp()
        self.temp_file = os.path.join(self.temp_dir, 'sensitive_words.txt')
        with open(self.temp_file, 'w', encoding='utf-8') as f:
            f.write("笨蛋\n讨厌鬼\n脏话\n垃圾\n")

        import app
        self._original_path = app.SENSITIVE_WORDS_PATH
        app.SENSITIVE_WORDS_PATH = self.temp_file

    def tearDown(self):
        import app
        app.SENSITIVE_WORDS_PATH = self._original_path
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_no_sensitive_words(self):
        self.assertEqual(filter_sensitive("你好世界"), "你好世界")

    def test_single_sensitive_word(self):
        result = filter_sensitive("你是个笨蛋")
        self.assertEqual(result, "你是个**")

    def test_multiple_sensitive_words(self):
        result = filter_sensitive("笨蛋和讨厌鬼")
        self.assertIn("**", result)
        self.assertIn("***", result)

    def test_sensitive_word_at_boundary(self):
        result = filter_sensitive("笨蛋")
        self.assertEqual(result, "**")

    def test_empty_string(self):
        self.assertEqual(filter_sensitive(""), "")

    def test_none_input(self):
        self.assertIsNone(filter_sensitive(None))

    def test_no_sensitive_file(self):
        import app
        old_path = app.SENSITIVE_WORDS_PATH
        app.SENSITIVE_WORDS_PATH = '/nonexistent/file.txt'
        self.assertEqual(filter_sensitive("测试"), "测试")
        app.SENSITIVE_WORDS_PATH = old_path


class TestCanLike(unittest.TestCase):
    def setUp(self):
        self.message = {
            'likes': [],
            'like_count': 0,
        }

    def test_no_previous_likes(self):
        self.assertTrue(can_like(self.message, '192.168.1.1'))

    def test_like_24_hours_ago(self):
        old_time = (datetime.now() - timedelta(hours=25)).isoformat()
        self.message['likes'] = [{'ip': '192.168.1.1', 'time': old_time}]
        self.assertTrue(can_like(self.message, '192.168.1.1'))

    def test_like_within_24_hours(self):
        recent_time = (datetime.now() - timedelta(hours=1)).isoformat()
        self.message['likes'] = [{'ip': '192.168.1.1', 'time': recent_time}]
        self.assertFalse(can_like(self.message, '192.168.1.1'))

    def test_different_ip(self):
        recent_time = (datetime.now() - timedelta(hours=1)).isoformat()
        self.message['likes'] = [{'ip': '192.168.1.1', 'time': recent_time}]
        self.assertTrue(can_like(self.message, '192.168.1.2'))

    def test_empty_likes_list(self):
        self.message['likes'] = []
        self.assertTrue(can_like(self.message, '192.168.1.1'))

    def test_multiple_ips_same_ip_recent(self):
        recent_time = (datetime.now() - timedelta(hours=1)).isoformat()
        self.message['likes'] = [
            {'ip': '192.168.1.2', 'time': recent_time},
            {'ip': '192.168.1.1', 'time': recent_time},
        ]
        self.assertFalse(can_like(self.message, '192.168.1.1'))

    def test_exactly_24_hours(self):
        exactly_24 = (datetime.now() - timedelta(hours=24)).isoformat()
        self.message['likes'] = [{'ip': '192.168.1.1', 'time': exactly_24}]
        self.assertTrue(can_like(self.message, '192.168.1.1'))


class TestAddLike(unittest.TestCase):
    def setUp(self):
        self.message = {
            'likes': [],
            'like_count': 0,
        }

    def test_first_like(self):
        add_like(self.message, '192.168.1.1')
        self.assertEqual(self.message['like_count'], 1)
        self.assertEqual(len(self.message['likes']), 1)
        self.assertEqual(self.message['likes'][0]['ip'], '192.168.1.1')

    def test_second_like_different_ip(self):
        add_like(self.message, '192.168.1.1')
        add_like(self.message, '192.168.1.2')
        self.assertEqual(self.message['like_count'], 2)
        self.assertEqual(len(self.message['likes']), 2)

    def test_duplicate_like_updates_time(self):
        old_time = (datetime.now() - timedelta(hours=25)).isoformat()
        self.message['likes'] = [{'ip': '192.168.1.1', 'time': old_time}]
        self.message['like_count'] = 1
        add_like(self.message, '192.168.1.1')
        self.assertEqual(self.message['like_count'], 1)
        self.assertEqual(len(self.message['likes']), 1)
        new_time = datetime.fromisoformat(self.message['likes'][0]['time'])
        self.assertTrue(new_time > datetime.fromisoformat(old_time))


class TestPaginateMessages(unittest.TestCase):
    def setUp(self):
        self.messages = [{'id': str(i)} for i in range(25)]

    def test_first_page(self):
        page_msgs, page, total_pages, page_nums = paginate_messages(
            self.messages, 1, 10)
        self.assertEqual(len(page_msgs), 10)
        self.assertEqual(page, 1)
        self.assertEqual(total_pages, 3)
        self.assertEqual(page_msgs[0]['id'], '0')

    def test_second_page(self):
        page_msgs, page, total_pages, page_nums = paginate_messages(
            self.messages, 2, 10)
        self.assertEqual(len(page_msgs), 10)
        self.assertEqual(page, 2)
        self.assertEqual(page_msgs[0]['id'], '10')

    def test_last_page(self):
        page_msgs, page, total_pages, page_nums = paginate_messages(
            self.messages, 3, 10)
        self.assertEqual(len(page_msgs), 5)
        self.assertEqual(page, 3)
        self.assertEqual(page_msgs[0]['id'], '20')

    def test_page_beyond_range(self):
        page_msgs, page, total_pages, page_nums = paginate_messages(
            self.messages, 10, 10)
        self.assertEqual(page, 3)

    def test_page_below_one(self):
        page_msgs, page, total_pages, page_nums = paginate_messages(
            self.messages, 0, 10)
        self.assertEqual(page, 1)

    def test_empty_messages(self):
        page_msgs, page, total_pages, page_nums = paginate_messages(
            [], 1, 10)
        self.assertEqual(len(page_msgs), 0)
        self.assertEqual(total_pages, 1)
        self.assertEqual(page, 1)

    def test_exact_page_size(self):
        msgs = [{'id': str(i)} for i in range(20)]
        page_msgs, page, total_pages, page_nums = paginate_messages(
            msgs, 1, 10)
        self.assertEqual(total_pages, 2)

    def test_large_page_range_ellipsis(self):
        msgs = [{'id': str(i)} for i in range(100)]
        page_msgs, page, total_pages, page_nums = paginate_messages(
            msgs, 5, 10)
        self.assertIn('...', page_nums)

    def test_small_page_range_no_ellipsis(self):
        msgs = [{'id': str(i)} for i in range(30)]
        page_msgs, page, total_pages, page_nums = paginate_messages(
            msgs, 1, 10)
        self.assertNotIn('...', page_nums)


class TestValidateNickname(unittest.TestCase):
    def test_valid_nickname(self):
        valid, msg = validate_nickname("测试用户")
        self.assertTrue(valid)
        self.assertEqual(msg, '')

    def test_empty_nickname(self):
        valid, msg = validate_nickname("")
        self.assertFalse(valid)

    def test_whitespace_nickname(self):
        valid, msg = validate_nickname("   ")
        self.assertFalse(valid)

    def test_too_long_nickname(self):
        valid, msg = validate_nickname("a" * 21)
        self.assertFalse(valid)

    def test_max_length_nickname(self):
        valid, msg = validate_nickname("a" * 20)
        self.assertTrue(valid)


class TestValidateContent(unittest.TestCase):
    def test_valid_content(self):
        valid, msg = validate_content("这是一条留言")
        self.assertTrue(valid)

    def test_empty_content(self):
        valid, msg = validate_content("")
        self.assertFalse(valid)

    def test_whitespace_content(self):
        valid, msg = validate_content("   ")
        self.assertFalse(valid)

    def test_too_long_content(self):
        valid, msg = validate_content("a" * 501)
        self.assertFalse(valid)

    def test_max_length_content(self):
        valid, msg = validate_content("a" * 500)
        self.assertTrue(valid)


class TestGetTodayCount(unittest.TestCase):
    def test_no_messages(self):
        self.assertEqual(get_today_count([]), 0)

    def test_today_messages(self):
        today = datetime.now().isoformat()
        msgs = [{'time': today}, {'time': today}]
        self.assertEqual(get_today_count(msgs), 2)

    def test_yesterday_messages(self):
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        msgs = [{'time': yesterday}]
        self.assertEqual(get_today_count(msgs), 0)

    def test_mixed_messages(self):
        today = datetime.now().isoformat()
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        msgs = [{'time': today}, {'time': yesterday}, {'time': today}]
        self.assertEqual(get_today_count(msgs), 2)

    def test_invalid_time_format(self):
        msgs = [{'time': 'invalid'}]
        self.assertEqual(get_today_count(msgs), 0)

    def test_missing_time_key(self):
        msgs = [{}]
        self.assertEqual(get_today_count(msgs), 0)


class TestLoadConfig(unittest.TestCase):
    def test_load_valid_config(self):
        config = load_config()
        self.assertIn('admin_password', config)
        self.assertIn('page_size', config)

    def test_config_has_expected_keys(self):
        config = load_config()
        self.assertEqual(config['page_size'], 10)
        self.assertEqual(config['admin_password'], 'admin123')


class TestLoadMessages(unittest.TestCase):
    def test_load_messages(self):
        msgs = load_messages()
        self.assertIsInstance(msgs, list)

    def test_load_nonexistent_file(self):
        import app
        old_path = app.MESSAGES_PATH
        app.MESSAGES_PATH = '/nonexistent/messages.json'
        self.assertEqual(load_messages(), [])
        app.MESSAGES_PATH = old_path

    def test_load_corrupted_json(self):
        import app
        temp_dir = tempfile.mkdtemp()
        temp_file = os.path.join(temp_dir, 'corrupted.json')
        with open(temp_file, 'w') as f:
            f.write('not valid json')
        old_path = app.MESSAGES_PATH
        app.MESSAGES_PATH = temp_file
        self.assertEqual(load_messages(), [])
        app.MESSAGES_PATH = old_path
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)


class TestLoadSensitiveWords(unittest.TestCase):
    def test_load_sensitive_words(self):
        words = load_sensitive_words()
        self.assertIsInstance(words, list)
        self.assertGreater(len(words), 0)


class TestEmojis(unittest.TestCase):
    def test_emojis_count(self):
        self.assertEqual(len(EMOJIS), 8)

    def test_emojis_have_keys(self):
        for emoji in EMOJIS:
            self.assertIn('key', emoji)
            self.assertIn('url', emoji)


class TestFlaskRoutes(unittest.TestCase):
    def setUp(self):
        flask_app.config['TESTING'] = True
        self.client = flask_app.test_client()

    def test_index_page(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_index_page_with_search(self):
        response = self.client.get('/?search=test')
        self.assertEqual(response.status_code, 200)

    def test_post_empty_message(self):
        response = self.client.post('/post', data={
            'nickname': '',
            'content': '',
            'captcha': '0',
        }, follow_redirects=False)
        self.assertEqual(response.status_code, 302)

    def test_post_valid_message(self):
        with self.client.session_transaction() as sess:
            sess['captcha_answer'] = 42
            sess['captcha_time'] = datetime.now().isoformat()
            sess['captcha_used'] = False
        response = self.client.post('/post', data={
            'nickname': '测试',
            'content': '测试内容',
            'captcha': '42',
        }, follow_redirects=False)
        self.assertEqual(response.status_code, 302)

    def test_post_wrong_captcha(self):
        with self.client.session_transaction() as sess:
            sess['captcha_answer'] = 42
            sess['captcha_time'] = datetime.now().isoformat()
            sess['captcha_used'] = False
        response = self.client.post('/post', data={
            'nickname': '测试',
            'content': '测试内容',
            'captcha': '999',
        }, follow_redirects=False)
        self.assertEqual(response.status_code, 302)

    def test_post_used_captcha(self):
        with self.client.session_transaction() as sess:
            sess['captcha_answer'] = 42
            sess['captcha_time'] = datetime.now().isoformat()
            sess['captcha_used'] = True
        response = self.client.post('/post', data={
            'nickname': '测试',
            'content': '测试内容',
            'captcha': '42',
        }, follow_redirects=False)
        self.assertEqual(response.status_code, 302)

    def test_admin_login_wrong_password(self):
        response = self.client.post('/login', data={
            'admin_password': 'wrong',
        }, follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        with self.client.session_transaction() as sess:
            self.assertFalse(sess.get('is_admin', False))

    def test_admin_login_correct_password(self):
        response = self.client.post('/login', data={
            'admin_password': 'admin123',
        }, follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        with self.client.session_transaction() as sess:
            self.assertTrue(sess.get('is_admin', False))

    def test_admin_logout(self):
        with self.client.session_transaction() as sess:
            sess['is_admin'] = True
        response = self.client.get('/logout')
        self.assertEqual(response.status_code, 302)
        with self.client.session_transaction() as sess:
            self.assertFalse(sess.get('is_admin', False))

    def test_export_txt(self):
        response = self.client.get('/export?format=txt')
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/plain', response.content_type)

    def test_export_csv(self):
        response = self.client.get('/export?format=csv')
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/csv', response.content_type)

    def test_captcha_refresh(self):
        response = self.client.get('/captcha_refresh')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('question', data)

    def test_like_ajax_no_messages(self):
        response = self.client.post('/like-ajax/nonexistent-id')
        self.assertEqual(response.status_code, 404)

    def test_reply_nonexistent_message(self):
        response = self.client.post('/reply/nonexistent-id', data={
            'reply_nickname': 'test',
            'reply_content': 'test',
        }, follow_redirects=False)
        self.assertEqual(response.status_code, 302)


class TestCaptchaSecurity(unittest.TestCase):
    def setUp(self):
        flask_app.config['TESTING'] = True
        self.client = flask_app.test_client()

    def test_captcha_not_reusable(self):
        with self.client.session_transaction() as sess:
            sess['captcha_answer'] = 10
            sess['captcha_time'] = datetime.now().isoformat()
            sess['captcha_used'] = False

        response1 = self.client.post('/post', data={
            'nickname': '测试1',
            'content': '内容1',
            'captcha': '10',
        }, follow_redirects=False)
        self.assertEqual(response1.status_code, 302)

        with self.client.session_transaction() as sess:
            sess['captcha_answer'] = 10
            sess['captcha_time'] = datetime.now().isoformat()
            sess['captcha_used'] = True

        response2 = self.client.post('/post', data={
            'nickname': '测试2',
            'content': '内容2',
            'captcha': '10',
        }, follow_redirects=False)
        self.assertEqual(response2.status_code, 302)
        self.assertIn('error=captcha', response2.headers.get('Location', ''))

    def test_captcha_expired(self):
        with self.client.session_transaction() as sess:
            sess['captcha_answer'] = 42
            sess['captcha_time'] = (datetime.now() - timedelta(minutes=10)).isoformat()
            sess['captcha_used'] = False

        response = self.client.post('/post', data={
            'nickname': '测试',
            'content': '测试内容',
            'captcha': '42',
        }, follow_redirects=False)
        self.assertEqual(response.status_code, 302)

    def test_captcha_with_missing_session(self):
        response = self.client.post('/post', data={
            'nickname': '测试',
            'content': '测试内容',
            'captcha': '42',
        }, follow_redirects=False)
        self.assertEqual(response.status_code, 302)


class TestPaginationWithEmptyData(unittest.TestCase):
    def test_no_messages_page_1(self):
        page_msgs, page, total_pages, page_nums = paginate_messages([], 1, 10)
        self.assertEqual(len(page_msgs), 0)
        self.assertEqual(page, 1)
        self.assertEqual(total_pages, 1)

    def test_single_message(self):
        page_msgs, page, total_pages, page_nums = paginate_messages(
            [{'id': '1'}], 1, 10)
        self.assertEqual(len(page_msgs), 1)
        self.assertEqual(total_pages, 1)

    def test_exactly_page_size(self):
        msgs = [{'id': str(i)} for i in range(10)]
        page_msgs, page, total_pages, page_nums = paginate_messages(msgs, 1, 10)
        self.assertEqual(total_pages, 1)
        self.assertEqual(len(page_msgs), 10)


if __name__ == '__main__':
    unittest.main()