#!/usr/bin/env python3
"""
电商模拟数据生成模块
"""
import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

PRODUCT_CATEGORIES = {
    '电子产品': {
        'subcategories': ['手机', '笔记本电脑', '平板电脑', '智能手表', '耳机', '相机', '游戏机', '智能家电'],
        'brands': ['苹果', '华为', '小米', '三星', 'OPPO', 'vivo', '索尼', '联想', '戴尔', '惠普', '任天堂', '微软', '佳能', '尼康', '富士', '戴森', '美的', '海尔', '博世', 'Garmin', 'Bose', '森海塞尔', '松下', 'Meta', 'Steam'],
        'price_range': (100, 20000)
    },
    '服装': {
        'subcategories': ['T恤', '衬衫', '外套', '裤子', '连衣裙', '运动鞋', '箱包', '配饰'],
        'brands': ['耐克', '阿迪达斯', '优衣库', 'ZARA', 'H&M', '李宁', '安踏', '太平鸟', '波司登', '七匹狼', '百丽', '新秀丽', "Levi's"],
        'price_range': (50, 3000)
    },
    '家居': {
        'subcategories': ['床上用品', '厨房用具', '家具', '灯饰', '收纳整理', '卫浴用品', '地毯', '装饰画'],
        'brands': ['宜家', '无印良品', '网易严选', '京东京造', '小米', '飞利浦', '苏泊尔', '美的', '全友', '顾家家居', '海尔', '松下', '双立人', '九阳', '欧普照明', '恒洁', '科勒'],
        'price_range': (30, 8000)
    },
    '食品': {
        'subcategories': ['休闲零食', '粮油调味', '饮料冲调', '生鲜水果', '酒水', '方便速食', '保健品', '进口食品'],
        'brands': ['三只松鼠', '良品铺子', '百草味', '统一', '康师傅', '农夫山泉', '蒙牛', '伊利', '海天', '金龙鱼', '茅台', '五粮液', '鲁花', '雀巢', '佳沃', '丹东', '拉菲', '螺霸王', '汤臣倍健', 'Swisse'],
        'price_range': (10, 3000)
    },
    '美妆': {
        'subcategories': ['护肤', '彩妆', '香水', '美发', '个人护理', '美容仪器', '男士护肤', '母婴护理'],
        'brands': ['兰蔻', '雅诗兰黛', '欧莱雅', '资生堂', 'SK-II', '完美日记', '花西子', '百雀羚', '自然堂', '妮维雅', '戴森', '飞利浦', '迪奥', '香奈儿', '施华蔻', '雅萌', '舒肤佳', '吉列', '贝亲', '帮宝适'],
        'price_range': (20, 5000)
    }
}

PRODUCT_CATALOG = [
    {'category': '电子产品', 'subcategory': '手机', 'brand': '苹果', 'name': 'iPhone 15 Pro Max', 'base_price': 9999},
    {'category': '电子产品', 'subcategory': '手机', 'brand': '华为', 'name': 'Mate 60 Pro', 'base_price': 6999},
    {'category': '电子产品', 'subcategory': '手机', 'brand': '小米', 'name': '14 Ultra', 'base_price': 5999},
    {'category': '电子产品', 'subcategory': '手机', 'brand': '三星', 'name': 'Galaxy S24 Ultra', 'base_price': 9699},
    {'category': '电子产品', 'subcategory': '手机', 'brand': 'OPPO', 'name': 'Find X7 Ultra', 'base_price': 6499},
    {'category': '电子产品', 'subcategory': '手机', 'brand': 'vivo', 'name': 'X100 Pro', 'base_price': 4999},
    {'category': '电子产品', 'subcategory': '笔记本电脑', 'brand': '苹果', 'name': 'MacBook Pro 14寸', 'base_price': 14999},
    {'category': '电子产品', 'subcategory': '笔记本电脑', 'brand': '联想', 'name': 'ThinkPad X1 Carbon', 'base_price': 11999},
    {'category': '电子产品', 'subcategory': '笔记本电脑', 'brand': '华为', 'name': 'MateBook X Pro', 'base_price': 8999},
    {'category': '电子产品', 'subcategory': '笔记本电脑', 'brand': '小米', 'name': 'RedmiBook Pro 15', 'base_price': 5499},
    {'category': '电子产品', 'subcategory': '笔记本电脑', 'brand': '戴尔', 'name': 'XPS 15', 'base_price': 12999},
    {'category': '电子产品', 'subcategory': '笔记本电脑', 'brand': '惠普', 'name': '战66 六代', 'base_price': 5299},
    {'category': '电子产品', 'subcategory': '平板电脑', 'brand': '苹果', 'name': 'iPad Pro 12.9寸', 'base_price': 9299},
    {'category': '电子产品', 'subcategory': '平板电脑', 'brand': '华为', 'name': 'MatePad Pro 13.2', 'base_price': 5499},
    {'category': '电子产品', 'subcategory': '平板电脑', 'brand': '小米', 'name': '平板6 Max', 'base_price': 3599},
    {'category': '电子产品', 'subcategory': '平板电脑', 'brand': '三星', 'name': 'Galaxy Tab S9', 'base_price': 6499},
    {'category': '电子产品', 'subcategory': '智能手表', 'brand': '苹果', 'name': 'Apple Watch Ultra 2', 'base_price': 6499},
    {'category': '电子产品', 'subcategory': '智能手表', 'brand': '华为', 'name': 'Watch GT 4', 'base_price': 1488},
    {'category': '电子产品', 'subcategory': '智能手表', 'brand': '小米', 'name': 'Watch S3', 'base_price': 999},
    {'category': '电子产品', 'subcategory': '智能手表', 'brand': '三星', 'name': 'Galaxy Watch 6', 'base_price': 2199},
    {'category': '电子产品', 'subcategory': '耳机', 'brand': '苹果', 'name': 'AirPods Pro 2', 'base_price': 1899},
    {'category': '电子产品', 'subcategory': '耳机', 'brand': '索尼', 'name': 'WF-1000XM5', 'base_price': 2699},
    {'category': '电子产品', 'subcategory': '耳机', 'brand': '华为', 'name': 'FreeBuds Pro 3', 'base_price': 1299},
    {'category': '电子产品', 'subcategory': '耳机', 'brand': '小米', 'name': 'Buds 4 Pro', 'base_price': 1099},
    {'category': '电子产品', 'subcategory': '相机', 'brand': '索尼', 'name': 'A7M4 全画幅微单', 'base_price': 15999},
    {'category': '电子产品', 'subcategory': '相机', 'brand': '佳能', 'name': 'R6 Mark II', 'base_price': 16499},
    {'category': '电子产品', 'subcategory': '相机', 'brand': '尼康', 'name': 'Z7 II', 'base_price': 19799},
    {'category': '电子产品', 'subcategory': '相机', 'brand': '富士', 'name': 'X-T5', 'base_price': 11690},
    {'category': '电子产品', 'subcategory': '游戏机', 'brand': '索尼', 'name': 'PlayStation 5', 'base_price': 3899},
    {'category': '电子产品', 'subcategory': '游戏机', 'brand': '任天堂', 'name': 'Switch OLED', 'base_price': 2599},
    {'category': '电子产品', 'subcategory': '游戏机', 'brand': '微软', 'name': 'Xbox Series X', 'base_price': 3599},
    {'category': '电子产品', 'subcategory': '智能家电', 'brand': '小米', 'name': '扫地机器人 2S', 'base_price': 2499},
    {'category': '电子产品', 'subcategory': '智能家电', 'brand': '戴森', 'name': 'V15 Detect吸尘器', 'base_price': 5990},
    {'category': '电子产品', 'subcategory': '智能家电', 'brand': '美的', 'name': '1.5匹空调', 'base_price': 3299},
    {'category': '电子产品', 'subcategory': '智能家电', 'brand': '海尔', 'name': '500L冰箱', 'base_price': 4999},
    {'category': '服装', 'subcategory': 'T恤', 'brand': '优衣库', 'name': '纯棉圆领T恤', 'base_price': 99},
    {'category': '服装', 'subcategory': 'T恤', 'brand': '耐克', 'name': '速干运动T恤', 'base_price': 299},
    {'category': '服装', 'subcategory': 'T恤', 'brand': '李宁', 'name': '印花短袖T恤', 'base_price': 199},
    {'category': '服装', 'subcategory': '衬衫', 'brand': '优衣库', 'name': '商务正装衬衫', 'base_price': 199},
    {'category': '服装', 'subcategory': '衬衫', 'brand': '七匹狼', 'name': '休闲牛津纺衬衫', 'base_price': 299},
    {'category': '服装', 'subcategory': '外套', 'brand': '波司登', 'name': '长款羽绒服', 'base_price': 1299},
    {'category': '服装', 'subcategory': '外套', 'brand': '太平鸟', 'name': '毛呢大衣', 'base_price': 899},
    {'category': '服装', 'subcategory': '外套', 'brand': '阿迪达斯', 'name': '运动风衣', 'base_price': 699},
    {'category': '服装', 'subcategory': '裤子', 'brand': 'Levi\'s', 'name': '经典牛仔裤', 'base_price': 599},
    {'category': '服装', 'subcategory': '裤子', 'brand': '优衣库', 'name': '休闲西裤', 'base_price': 249},
    {'category': '服装', 'subcategory': '裤子', 'brand': '耐克', 'name': '运动裤', 'base_price': 349},
    {'category': '服装', 'subcategory': '连衣裙', 'brand': 'ZARA', 'name': '法式碎花裙', 'base_price': 399},
    {'category': '服装', 'subcategory': '连衣裙', 'brand': 'H&M', 'name': '针织连衣裙', 'base_price': 299},
    {'category': '服装', 'subcategory': '运动鞋', 'brand': '耐克', 'name': 'Air Max跑步鞋', 'base_price': 899},
    {'category': '服装', 'subcategory': '运动鞋', 'brand': '阿迪达斯', 'name': 'Ultraboost', 'base_price': 1099},
    {'category': '服装', 'subcategory': '运动鞋', 'brand': '李宁', 'name': '驭帅篮球鞋', 'base_price': 799},
    {'category': '服装', 'subcategory': '运动鞋', 'brand': '安踏', 'name': '老爹鞋', 'base_price': 499},
    {'category': '服装', 'subcategory': '箱包', 'brand': '新秀丽', 'name': '20寸行李箱', 'base_price': 799},
    {'category': '服装', 'subcategory': '箱包', 'brand': '百丽', 'name': '双肩背包', 'base_price': 599},
    {'category': '服装', 'subcategory': '配饰', 'brand': '优衣库', 'name': '棒球帽', 'base_price': 99},
    {'category': '服装', 'subcategory': '配饰', 'brand': '七匹狼', 'name': '真皮皮带', 'base_price': 399},
    {'category': '家居', 'subcategory': '床上用品', 'brand': '无印良品', 'name': '纯棉四件套', 'base_price': 499},
    {'category': '家居', 'subcategory': '床上用品', 'brand': '网易严选', 'name': '记忆棉枕头', 'base_price': 299},
    {'category': '家居', 'subcategory': '床上用品', 'brand': '宜家', 'name': '羽绒被', 'base_price': 799},
    {'category': '家居', 'subcategory': '厨房用具', 'brand': '苏泊尔', 'name': '不粘锅套装', 'base_price': 399},
    {'category': '家居', 'subcategory': '厨房用具', 'brand': '双立人', 'name': '刀具套装', 'base_price': 1299},
    {'category': '家居', 'subcategory': '厨房用具', 'brand': '美的', 'name': '电饭煲 4L', 'base_price': 349},
    {'category': '家居', 'subcategory': '厨房用具', 'brand': '九阳', 'name': '破壁料理机', 'base_price': 599},
    {'category': '家居', 'subcategory': '厨房用具', 'brand': '飞利浦', 'name': '空气炸锅', 'base_price': 499},
    {'category': '家居', 'subcategory': '家具', 'brand': '宜家', 'name': '实木餐桌椅', 'base_price': 2999},
    {'category': '家居', 'subcategory': '家具', 'brand': '顾家家居', 'name': '布艺沙发', 'base_price': 4999},
    {'category': '家居', 'subcategory': '家具', 'brand': '全友', 'name': '真皮床架', 'base_price': 3599},
    {'category': '家居', 'subcategory': '灯饰', 'brand': '欧普照明', 'name': 'LED吸顶灯', 'base_price': 299},
    {'category': '家居', 'subcategory': '灯饰', 'brand': '飞利浦', 'name': '护眼台灯', 'base_price': 399},
    {'category': '家居', 'subcategory': '收纳整理', 'brand': '宜家', 'name': '收纳箱套装', 'base_price': 129},
    {'category': '家居', 'subcategory': '收纳整理', 'brand': '无印良品', 'name': '衣柜收纳盒', 'base_price': 79},
    {'category': '家居', 'subcategory': '卫浴用品', 'brand': '恒洁', 'name': '智能马桶盖', 'base_price': 1999},
    {'category': '家居', 'subcategory': '卫浴用品', 'brand': '科勒', 'name': '淋浴花洒套装', 'base_price': 899},
    {'category': '食品', 'subcategory': '休闲零食', 'brand': '三只松鼠', 'name': '坚果礼盒', 'base_price': 128},
    {'category': '食品', 'subcategory': '休闲零食', 'brand': '良品铺子', 'name': '猪肉脯', 'base_price': 49},
    {'category': '食品', 'subcategory': '休闲零食', 'brand': '百草味', 'name': '牛肉干', 'base_price': 68},
    {'category': '食品', 'subcategory': '粮油调味', 'brand': '金龙鱼', 'name': '五常大米 5kg', 'base_price': 89},
    {'category': '食品', 'subcategory': '粮油调味', 'brand': '鲁花', 'name': '花生油 5L', 'base_price': 159},
    {'category': '食品', 'subcategory': '粮油调味', 'brand': '海天', 'name': '生抽酱油', 'base_price': 19},
    {'category': '食品', 'subcategory': '饮料冲调', 'brand': '伊利', 'name': '纯牛奶 250ml*24', 'base_price': 69},
    {'category': '食品', 'subcategory': '饮料冲调', 'brand': '蒙牛', 'name': '酸奶 100g*20', 'base_price': 49},
    {'category': '食品', 'subcategory': '饮料冲调', 'brand': '农夫山泉', 'name': 'NFC果汁', 'base_price': 12},
    {'category': '食品', 'subcategory': '饮料冲调', 'brand': '雀巢', 'name': '咖啡豆 500g', 'base_price': 128},
    {'category': '食品', 'subcategory': '生鲜水果', 'brand': '佳沃', 'name': '进口车厘子 2斤', 'base_price': 198},
    {'category': '食品', 'subcategory': '生鲜水果', 'brand': '丹东', 'name': '99草莓 3斤', 'base_price': 88},
    {'category': '食品', 'subcategory': '酒水', 'brand': '茅台', 'name': '飞天茅台 53度', 'base_price': 2899},
    {'category': '食品', 'subcategory': '酒水', 'brand': '五粮液', 'name': '普五 52度', 'base_price': 1199},
    {'category': '食品', 'subcategory': '酒水', 'brand': '拉菲', 'name': '进口红酒', 'base_price': 399},
    {'category': '食品', 'subcategory': '方便速食', 'brand': '康师傅', 'name': '方便面 5连包', 'base_price': 19},
    {'category': '食品', 'subcategory': '方便速食', 'brand': '统一', 'name': '汤达人方便面', 'base_price': 24},
    {'category': '食品', 'subcategory': '方便速食', 'brand': '螺霸王', 'name': '螺蛳粉 3袋装', 'base_price': 39},
    {'category': '食品', 'subcategory': '保健品', 'brand': '汤臣倍健', 'name': '维生素C片', 'base_price': 89},
    {'category': '食品', 'subcategory': '保健品', 'brand': 'Swisse', 'name': '蛋白粉', 'base_price': 299},
    {'category': '美妆', 'subcategory': '护肤', 'brand': '兰蔻', 'name': '小黑瓶精华液', 'base_price': 1080},
    {'category': '美妆', 'subcategory': '护肤', 'brand': '雅诗兰黛', 'name': '小棕瓶眼霜', 'base_price': 590},
    {'category': '美妆', 'subcategory': '护肤', 'brand': 'SK-II', 'name': '神仙水 230ml', 'base_price': 1590},
    {'category': '美妆', 'subcategory': '护肤', 'brand': '百雀羚', 'name': '保湿面霜', 'base_price': 198},
    {'category': '美妆', 'subcategory': '护肤', 'brand': '自然堂', 'name': '冰肌水', 'base_price': 158},
    {'category': '美妆', 'subcategory': '彩妆', 'brand': '迪奥', 'name': '烈艳蓝金口红', 'base_price': 380},
    {'category': '美妆', 'subcategory': '彩妆', 'brand': '花西子', 'name': '同心锁口红', 'base_price': 219},
    {'category': '美妆', 'subcategory': '彩妆', 'brand': '完美日记', 'name': '羽毛粉底液', 'base_price': 129},
    {'category': '美妆', 'subcategory': '彩妆', 'brand': '兰蔻', 'name': '菁纯粉底液', 'base_price': 980},
    {'category': '美妆', 'subcategory': '香水', 'brand': '香奈儿', 'name': '5号香水', 'base_price': 1280},
    {'category': '美妆', 'subcategory': '香水', 'brand': '迪奥', 'name': '真我香水', 'base_price': 980},
    {'category': '美妆', 'subcategory': '美发', 'brand': '施华蔻', 'name': '多效修护洗发水', 'base_price': 89},
    {'category': '美妆', 'subcategory': '美发', 'brand': '欧莱雅', 'name': '精油护发素', 'base_price': 79},
    {'category': '美妆', 'subcategory': '美容仪器', 'brand': '戴森', 'name': '吹风机 HD08', 'base_price': 2990},
    {'category': '美妆', 'subcategory': '美容仪器', 'brand': '雅萌', 'name': '射频美容仪', 'base_price': 3599},
    {'category': '美妆', 'subcategory': '美容仪器', 'brand': '飞利浦', 'name': '电动牙刷', 'base_price': 599},
    {'category': '美妆', 'subcategory': '个人护理', 'brand': '舒肤佳', 'name': '沐浴露 720ml', 'base_price': 39},
    {'category': '美妆', 'subcategory': '个人护理', 'brand': '妮维雅', 'name': '身体乳 400ml', 'base_price': 49},
    {'category': '美妆', 'subcategory': '男士护肤', 'brand': '欧莱雅', 'name': '男士洗面奶', 'base_price': 49},
    {'category': '美妆', 'subcategory': '男士护肤', 'brand': '吉列', 'name': '锋隐致顺剃须刀', 'base_price': 199},
    {'category': '美妆', 'subcategory': '母婴护理', 'brand': '贝亲', 'name': '婴儿洗发水 500ml', 'base_price': 69},
    {'category': '美妆', 'subcategory': '母婴护理', 'brand': '帮宝适', 'name': '婴儿纸尿裤 M号', 'base_price': 129}
]

REGIONS = ['北京', '上海', '广东', '浙江', '江苏', '四川', '湖北', '山东', '河南', '福建', '湖南', '河北', '安徽', '辽宁', '陕西', '重庆', '天津']

FIRST_NAMES = ['张', '李', '王', '刘', '陈', '杨', '黄', '赵', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧']

GIVEN_NAMES_MALE = ['伟', '强', '磊', '军', '洋', '勇', '彬', '杰', '杰', '涛', '明', '超', '辉', '鹏', '华', '飞', '林', '宇', '浩', '凯', '健', '俊', '帆', '晨', '瑞', '峰', '志', '德', '龙', '虎']

GIVEN_NAMES_FEMALE = ['芳', '娜', '敏', '静', '丽', '艳', '娟', '莉', '玲', '琴', '燕', '霞', '红', '梅', '英', '慧', '华', '秀', '珍', '青', '婷', '雪', '琳', '颖', '佳', '悦', '蕾', '梦', '怡', '馨']

PAYMENT_METHODS = ['微信支付', '支付宝', '银行卡', '信用卡', '京东白条', '花呗']

ORDER_STATUS = ['已完成', '已完成', '已完成', '已完成', '已完成', '待发货', '配送中', '已取消', '退款中']


def generate_products(n=50):
    np.random.seed(42)
    random.seed(42)
    
    products = []
    n = min(n, len(PRODUCT_CATALOG))
    selected_products = random.sample(PRODUCT_CATALOG, n)
    
    for i, item in enumerate(selected_products):
        base_price = item['base_price']
        price_variation = np.random.uniform(0.9, 1.1)
        original_price = round(base_price * price_variation, 2)
        
        discount_factor = np.random.uniform(0.7, 1.0)
        current_price = round(original_price * discount_factor, 2)
        
        products.append({
            'product_id': f'P{i+1:04d}',
            'product_name': f"{item['brand']} {item['name']}",
            'category': item['category'],
            'subcategory': item['subcategory'],
            'brand': item['brand'],
            'original_price': original_price,
            'current_price': current_price
        })
    
    return pd.DataFrame(products)


def generate_users(n=200):
    np.random.seed(42)
    random.seed(42)
    
    users = []
    
    for i in range(n):
        gender = random.choice(['男', '女'])
        
        first_name = random.choice(FIRST_NAMES)
        if gender == '男':
            given_name = ''.join(random.sample(GIVEN_NAMES_MALE, random.choice([1, 2])))
        else:
            given_name = ''.join(random.sample(GIVEN_NAMES_FEMALE, random.choice([1, 2])))
        user_name = first_name + given_name
        
        start_date = datetime(2024, 1, 1)
        end_date = datetime(2024, 6, 1)
        days_diff = (end_date - start_date).days
        random_days = random.randint(0, days_diff)
        register_date = (start_date + timedelta(days=random_days)).strftime('%Y-%m-%d')
        
        region = random.choices(
            REGIONS,
            weights=[0.15, 0.15, 0.15, 0.1, 0.1, 0.08, 0.06, 0.06, 0.05, 0.04, 0.03, 0.03, 0.02, 0.02, 0.02, 0.02, 0.02],
            k=1
        )[0]
        
        age = int(np.random.normal(35, 12))
        age = max(18, min(70, age))
        
        users.append({
            'user_id': f'U{i+1:04d}',
            'user_name': user_name,
            'register_date': register_date,
            'region': region,
            'age': age,
            'gender': gender
        })
    
    return pd.DataFrame(users)


def generate_orders(users_df, products_df, n_orders=2000, start_date='2024-01-01', end_date='2024-12-31'):
    np.random.seed(42)
    random.seed(42)
    
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    days_diff = (end - start).days
    
    product_ids = products_df['product_id'].values
    product_prices = products_df.set_index('product_id')['current_price'].to_dict()
    
    orders = []
    order_items = []
    order_item_id = 1
    
    for i in range(n_orders):
        random_days = int(np.random.triangular(0, days_diff * 0.6, days_diff))
        order_date = (start + timedelta(days=random_days)).strftime('%Y-%m-%d')
        
        user_id = random.choice(users_df['user_id'].values)
        user_region = users_df[users_df['user_id'] == user_id]['region'].values[0]
        
        n_items = random.choices([1, 2, 3, 4, 5], weights=[0.4, 0.3, 0.15, 0.1, 0.05], k=1)[0]
        
        selected_products = random.sample(list(product_ids), min(n_items, len(product_ids)))
        
        total_amount = 0.0
        status = random.choice(ORDER_STATUS)
        payment_method = random.choices(
            PAYMENT_METHODS,
            weights=[0.35, 0.3, 0.15, 0.1, 0.05, 0.05],
            k=1
        )[0]
        
        order_id = f'O{i+1:05d}'
        
        for product_id in selected_products:
            quantity = random.choices([1, 2, 3], weights=[0.7, 0.2, 0.1], k=1)[0]
            unit_price = product_prices[product_id]
            discount = round(np.random.uniform(0.0, 0.5), 2)
            subtotal = round(quantity * unit_price * (1 - discount), 2)
            total_amount += subtotal
            
            order_items.append({
                'order_item_id': f'OI{order_item_id:06d}',
                'order_id': order_id,
                'product_id': product_id,
                'quantity': quantity,
                'unit_price': unit_price,
                'discount': discount,
                'subtotal': subtotal
            })
            order_item_id += 1
        
        total_amount = round(total_amount, 2)
        
        orders.append({
            'order_id': order_id,
            'user_id': user_id,
            'order_date': order_date,
            'total_amount': total_amount,
            'status': status,
            'region': user_region,
            'payment_method': payment_method
        })
    
    orders_df = pd.DataFrame(orders)
    order_items_df = pd.DataFrame(order_items)
    
    return orders_df, order_items_df


def save_sample_data(output_dir='sample_data'):
    os.makedirs(output_dir, exist_ok=True)
    
    products_df = generate_products(50)
    users_df = generate_users(200)
    orders_df, order_items_df = generate_orders(users_df, products_df, 2000)
    
    products_df.to_csv(os.path.join(output_dir, 'products.csv'), index=False, encoding='utf-8-sig')
    users_df.to_csv(os.path.join(output_dir, 'users.csv'), index=False, encoding='utf-8-sig')
    orders_df.to_csv(os.path.join(output_dir, 'orders.csv'), index=False, encoding='utf-8-sig')
    order_items_df.to_csv(os.path.join(output_dir, 'order_items.csv'), index=False, encoding='utf-8-sig')
    
    print(f"数据已保存到 {output_dir}/ 目录")
    print(f"商品数据: {len(products_df)} 条")
    print(f"用户数据: {len(users_df)} 条")
    print(f"订单数据: {len(orders_df)} 条")
    print(f"订单项数据: {len(order_items_df)} 条")
    
    return products_df, users_df, orders_df, order_items_df


def get_sample_data():
    products_df = generate_products(50)
    users_df = generate_users(200)
    orders_df, order_items_df = generate_orders(users_df, products_df, 2000)
    
    return {
        'products': products_df,
        'users': users_df,
        'orders': orders_df,
        'order_items': order_items_df
    }


if __name__ == '__main__':
    save_sample_data()
