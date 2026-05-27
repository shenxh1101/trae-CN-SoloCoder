#!/usr/bin/env python3
import random
import time
from datetime import datetime, timedelta


def generate_sample_log(filename='sample.log', entries=1000):
    ips = [
        '192.168.1.100', '192.168.1.101', '10.0.0.1', '172.16.0.1',
        '203.0.113.42', '198.51.100.23', '203.0.113.15', '198.51.100.88',
        '8.8.8.8', '1.1.1.1', '114.114.114.114', '223.5.5.5',
        '14.215.177.39', '180.101.49.12', '123.125.115.110',
        '157.240.1.35', '31.13.71.36', '104.244.42.1',
    ]

    paths = [
        '/', '/index.html', '/about', '/contact', '/api/users',
        '/api/products', '/css/style.css', '/js/app.js', '/images/logo.png',
        '/blog/post-1', '/blog/post-2', '/category/news', '/search',
        '/login', '/register', '/dashboard', '/admin', '/wp-admin',
        '/phpmyadmin', '/.env', '/config.php', '/.git/config',
    ]

    methods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD']
    statuses = [200] * 70 + [301, 302] * 5 + [404] * 12 + [500, 502, 503] * 3

    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Android 13; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0',
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'curl/7.88.1',
        'python-requests/2.31.0',
    ]

    base_time = datetime.now() - timedelta(hours=24)
    lines = []

    for i in range(entries):
        ip = random.choice(ips)
        path = random.choice(paths)
        method = random.choice(methods) if path not in ('/', '/index.html') else 'GET'
        status = random.choice(statuses)
        size = random.randint(200, 50000) if status == 200 else random.randint(100, 1000)
        ua = random.choice(user_agents)
        referer = '-' if random.random() > 0.3 else 'https://example.com'

        ts = base_time + timedelta(seconds=i * random.randint(1, 30))
        time_str = ts.strftime('%d/%b/%Y:%H:%M:%S +0000')

        line = f'{ip} - - [{time_str}] "{method} {path} HTTP/1.1" {status} {size} "{referer}" "{ua}"'
        lines.append(line)

    flood_ip = '203.0.113.99'
    flood_start = base_time + timedelta(hours=12)
    for i in range(150):
        ts = flood_start + timedelta(seconds=i * 0.3)
        time_str = ts.strftime('%d/%b/%Y:%H:%M:%S +0000')
        path = random.choice(['/', '/index.html', '/api/test'])
        line = f'{flood_ip} - - [{time_str}] "GET {path} HTTP/1.1" 200 1234 "-" "AttackBot/1.0"'
        lines.append(line)

    lines.sort(key=lambda x: x.split('[')[1].split(']')[0])

    with open(filename, 'w') as f:
        for line in lines:
            f.write(line + '\n')

    print(f'Generated {len(lines)} log entries in {filename}')
    return filename


if __name__ == '__main__':
    generate_sample_log()
