const NUTRITION_DATA = {
    'pizza': { name: '披萨', calories: 266, protein: 11, carbs: 33, fat: 10, fiber: 2, sugar: 5 },
    'pizza pie': { name: '披萨', calories: 266, protein: 11, carbs: 33, fat: 10, fiber: 2, sugar: 5 },
    'cheeseburger': { name: '芝士汉堡', calories: 303, protein: 17, carbs: 25, fat: 15, fiber: 1, sugar: 6 },
    'hamburger': { name: '汉堡', calories: 264, protein: 17, carbs: 23, fat: 11, fiber: 1, sugar: 5 },
    'hot dog': { name: '热狗', calories: 290, protein: 9, carbs: 23, fat: 18, fiber: 0, sugar: 4 },
    'hotdog': { name: '热狗', calories: 290, protein: 9, carbs: 23, fat: 18, fiber: 0, sugar: 4 },
    'french fries': { name: '薯条', calories: 312, protein: 3, carbs: 41, fat: 15, fiber: 3, sugar: 0 },
    'chips': { name: '薯片', calories: 536, protein: 7, carbs: 53, fat: 33, fiber: 4, sugar: 1 },
    'apple': { name: '苹果', calories: 52, protein: 0, carbs: 14, fat: 0, fiber: 2, sugar: 10 },
    'banana': { name: '香蕉', calories: 89, protein: 1, carbs: 23, fat: 0, fiber: 3, sugar: 12 },
    'orange': { name: '橙子', calories: 47, protein: 1, carbs: 12, fat: 0, fiber: 2, sugar: 9 },
    'strawberry': { name: '草莓', calories: 32, protein: 1, carbs: 8, fat: 0, fiber: 2, sugar: 5 },
    'grapes': { name: '葡萄', calories: 69, protein: 1, carbs: 18, fat: 0, fiber: 1, sugar: 16 },
    'watermelon': { name: '西瓜', calories: 30, protein: 1, carbs: 8, fat: 0, fiber: 0, sugar: 6 },
    'sushi': { name: '寿司', calories: 140, protein: 6, carbs: 20, fat: 4, fiber: 1, sugar: 1 },
    'ramen': { name: '拉面', calories: 436, protein: 17, carbs: 53, fat: 16, fiber: 2, sugar: 3 },
    'noodle': { name: '面条', calories: 138, protein: 4, carbs: 25, fat: 2, fiber: 1, sugar: 1 },
    'pasta': { name: '意大利面', calories: 131, protein: 5, carbs: 25, fat: 1, fiber: 1, sugar: 0 },
    'spaghetti': { name: '意大利面', calories: 158, protein: 6, carbs: 31, fat: 1, fiber: 2, sugar: 2 },
    'lasagna': { name: '千层面', calories: 159, protein: 8, carbs: 18, fat: 6, fiber: 1, sugar: 3 },
    'rice': { name: '米饭', calories: 130, protein: 3, carbs: 28, fat: 0, fiber: 0, sugar: 0 },
    'fried rice': { name: '炒饭', calories: 168, protein: 4, carbs: 27, fat: 5, fiber: 1, sugar: 1 },
    'chicken': { name: '鸡肉', calories: 239, protein: 27, carbs: 0, fat: 14, fiber: 0, sugar: 0 },
    'chicken wings': { name: '鸡翅', calories: 290, protein: 25, carbs: 0, fat: 20, fiber: 0, sugar: 0 },
    'beef': { name: '牛肉', calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, sugar: 0 },
    'steak': { name: '牛排', calories: 271, protein: 26, carbs: 0, fat: 18, fiber: 0, sugar: 0 },
    'pork': { name: '猪肉', calories: 242, protein: 27, carbs: 0, fat: 14, fiber: 0, sugar: 0 },
    'fish': { name: '鱼肉', calories: 206, protein: 22, carbs: 0, fat: 12, fiber: 0, sugar: 0 },
    'salmon': { name: '三文鱼', calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0 },
    'tuna': { name: '金枪鱼', calories: 144, protein: 30, carbs: 0, fat: 2, fiber: 0, sugar: 0 },
    'shrimp': { name: '虾', calories: 99, protein: 24, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    'egg': { name: '鸡蛋', calories: 155, protein: 13, carbs: 1, fat: 11, fiber: 0, sugar: 1 },
    'omelette': { name: '煎蛋', calories: 210, protein: 14, carbs: 2, fat: 16, fiber: 0, sugar: 1 },
    'salad': { name: '沙拉', calories: 35, protein: 2, carbs: 6, fat: 1, fiber: 2, sugar: 3 },
    'lettuce': { name: '生菜', calories: 15, protein: 1, carbs: 3, fat: 0, fiber: 1, sugar: 1 },
    'tomato': { name: '番茄', calories: 18, protein: 1, carbs: 4, fat: 0, fiber: 1, sugar: 3 },
    'carrot': { name: '胡萝卜', calories: 41, protein: 1, carbs: 10, fat: 0, fiber: 3, sugar: 5 },
    'broccoli': { name: '西兰花', calories: 34, protein: 3, carbs: 7, fat: 0, fiber: 2, sugar: 2 },
    'corn': { name: '玉米', calories: 86, protein: 3, carbs: 19, fat: 1, fiber: 2, sugar: 3 },
    'potato': { name: '土豆', calories: 77, protein: 2, carbs: 17, fat: 0, fiber: 2, sugar: 1 },
    'mashed potato': { name: '土豆泥', calories: 113, protein: 2, carbs: 18, fat: 4, fiber: 1, sugar: 1 },
    'bread': { name: '面包', calories: 265, protein: 9, carbs: 49, fat: 3, fiber: 3, sugar: 5 },
    'toast': { name: '吐司', calories: 298, protein: 9, carbs: 55, fat: 4, fiber: 4, sugar: 5 },
    'sandwich': { name: '三明治', calories: 252, protein: 14, carbs: 28, fat: 9, fiber: 2, sugar: 4 },
    'burger': { name: '汉堡', calories: 264, protein: 17, carbs: 23, fat: 11, fiber: 1, sugar: 5 },
    'cake': { name: '蛋糕', calories: 350, protein: 4, carbs: 50, fat: 15, fiber: 1, sugar: 35 },
    'cheesecake': { name: '芝士蛋糕', calories: 321, protein: 6, carbs: 26, fat: 22, fiber: 0, sugar: 20 },
    'ice cream': { name: '冰淇淋', calories: 207, protein: 4, carbs: 27, fat: 10, fiber: 0, sugar: 21 },
    'icecream': { name: '冰淇淋', calories: 207, protein: 4, carbs: 27, fat: 10, fiber: 0, sugar: 21 },
    'chocolate': { name: '巧克力', calories: 546, protein: 5, carbs: 61, fat: 31, fiber: 11, sugar: 49 },
    'cookie': { name: '饼干', calories: 453, protein: 6, carbs: 58, fat: 22, fiber: 2, sugar: 28 },
    'donut': { name: '甜甜圈', calories: 434, protein: 5, carbs: 54, fat: 22, fiber: 1, sugar: 26 },
    'doughnut': { name: '甜甜圈', calories: 434, protein: 5, carbs: 54, fat: 22, fiber: 1, sugar: 26 },
    'pancake': { name: '煎饼', calories: 227, protein: 6, carbs: 28, fat: 10, fiber: 1, sugar: 6 },
    'waffle': { name: '华夫饼', calories: 309, protein: 8, carbs: 55, fat: 7, fiber: 2, sugar: 9 },
    'muffin': { name: '玛芬', calories: 377, protein: 5, carbs: 53, fat: 16, fiber: 2, sugar: 29 },
    'soup': { name: '汤', calories: 75, protein: 3, carbs: 10, fat: 2, fiber: 1, sugar: 3 },
    'misoshiru': { name: '味噌汤', calories: 36, protein: 2, carbs: 5, fat: 1, fiber: 1, sugar: 1 },
    'miso soup': { name: '味噌汤', calories: 36, protein: 2, carbs: 5, fat: 1, fiber: 1, sugar: 1 },
    'guacamole': { name: '鳄梨酱', calories: 160, protein: 2, carbs: 9, fat: 14, fiber: 5, sugar: 1 },
    'guacamole dip': { name: '鳄梨酱', calories: 160, protein: 2, carbs: 9, fat: 14, fiber: 5, sugar: 1 },
    'taco': { name: '塔可', calories: 226, protein: 10, carbs: 20, fat: 11, fiber: 2, sugar: 2 },
    'burrito': { name: '墨西哥卷', calories: 320, protein: 14, carbs: 36, fat: 12, fiber: 4, sugar: 3 },
    'quesadilla': { name: '墨西哥馅饼', calories: 300, protein: 14, carbs: 25, fat: 15, fiber: 1, sugar: 2 },
    'nachos': { name: '玉米片', calories: 346, protein: 9, carbs: 34, fat: 19, fiber: 4, sugar: 2 },
    'olive': { name: '橄榄', calories: 115, protein: 1, carbs: 6, fat: 11, fiber: 3, sugar: 0 },
    'hummus': { name: '鹰嘴豆泥', calories: 166, protein: 8, carbs: 14, fat: 10, fiber: 6, sugar: 0 },
    'falafel': { name: '法拉费', calories: 333, protein: 13, carbs: 32, fat: 17, fiber: 5, sugar: 2 },
    'kebab': { name: '烤肉串', calories: 265, protein: 19, carbs: 5, fat: 19, fiber: 1, sugar: 1 },
    'curry': { name: '咖喱', calories: 220, protein: 10, carbs: 15, fat: 13, fiber: 2, sugar: 3 },
    'naan': { name: '印度烤饼', calories: 319, protein: 10, carbs: 50, fat: 8, fiber: 2, sugar: 3 },
    'dumpling': { name: '饺子', calories: 138, protein: 5, carbs: 17, fat: 5, fiber: 1, sugar: 1 },
    'potsticker': { name: '锅贴', calories: 182, protein: 8, carbs: 21, fat: 6, fiber: 1, sugar: 1 },
    'won ton': { name: '馄饨', calories: 124, protein: 7, carbs: 16, fat: 3, fiber: 1, sugar: 1 },
    'egg roll': { name: '蛋卷', calories: 190, protein: 5, carbs: 20, fat: 10, fiber: 1, sugar: 2 },
    'spring roll': { name: '春卷', calories: 122, protein: 4, carbs: 18, fat: 4, fiber: 1, sugar: 2 },
    'lobster': { name: '龙虾', calories: 90, protein: 19, carbs: 0, fat: 1, fiber: 0, sugar: 0 },
    'crab': { name: '螃蟹', calories: 97, protein: 19, carbs: 0, fat: 2, fiber: 0, sugar: 0 },
    'oyster': { name: '牡蛎', calories: 68, protein: 7, carbs: 4, fat: 2, fiber: 0, sugar: 0 },
    'sashimi': { name: '刺身', calories: 140, protein: 20, carbs: 0, fat: 6, fiber: 0, sugar: 0 },
    'tempeh': { name: '天贝', calories: 192, protein: 19, carbs: 8, fat: 10, fiber: 0, sugar: 0 },
    'tofu': { name: '豆腐', calories: 76, protein: 8, carbs: 2, fat: 5, fiber: 0, sugar: 1 },
    'yogurt': { name: '酸奶', calories: 59, protein: 10, carbs: 4, fat: 0, fiber: 0, sugar: 4 },
    'cheese': { name: '奶酪', calories: 402, protein: 25, carbs: 1, fat: 33, fiber: 0, sugar: 1 },
    'milk': { name: '牛奶', calories: 42, protein: 3, carbs: 5, fat: 1, fiber: 0, sugar: 5 },
    'coffee': { name: '咖啡', calories: 1, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    'espresso': { name: '浓缩咖啡', calories: 9, protein: 1, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    'beer': { name: '啤酒', calories: 43, protein: 0, carbs: 4, fat: 0, fiber: 0, sugar: 0 },
    'wine': { name: '葡萄酒', calories: 83, protein: 0, carbs: 3, fat: 0, fiber: 0, sugar: 1 },
    'whiskey': { name: '威士忌', calories: 250, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    'cocktail': { name: '鸡尾酒', calories: 185, protein: 0, carbs: 17, fat: 0, fiber: 0, sugar: 13 },
    'carbonara': { name: '卡邦尼意面', calories: 320, protein: 15, carbs: 40, fat: 12, fiber: 2, sugar: 2 },
    'bolognese': { name: '肉酱意面', calories: 270, protein: 18, carbs: 35, fat: 8, fiber: 3, sugar: 5 },
    'meatball': { name: '肉丸', calories: 200, protein: 20, carbs: 8, fat: 12, fiber: 1, sugar: 1 },
    'sausage': { name: '香肠', calories: 301, protein: 17, carbs: 4, fat: 25, fiber: 0, sugar: 1 },
    'bacon': { name: '培根', calories: 541, protein: 37, carbs: 1, fat: 42, fiber: 0, sugar: 0 },
    'ham': { name: '火腿', calories: 145, protein: 21, carbs: 2, fat: 6, fiber: 0, sugar: 1 },
    'pepperoni': { name: '意大利辣香肠', calories: 500, protein: 23, carbs: 2, fat: 44, fiber: 0, sugar: 1 },
    'meatloaf': { name: '烘肉卷', calories: 230, protein: 25, carbs: 10, fat: 12, fiber: 1, sugar: 3 },
    'casserole': { name: '砂锅菜', calories: 180, protein: 12, carbs: 15, fat: 10, fiber: 2, sugar: 3 },
    'stew': { name: '炖菜', calories: 130, protein: 10, carbs: 12, fat: 5, fiber: 2, sugar: 2 },
    'roast': { name: '烤肉', calories: 280, protein: 28, carbs: 0, fat: 18, fiber: 0, sugar: 0 },
    'bbq': { name: '烧烤', calories: 290, protein: 25, carbs: 5, fat: 19, fiber: 0, sugar: 4 },
    'grilled cheese': { name: '烤芝士三明治', calories: 350, protein: 15, carbs: 25, fat: 22, fiber: 1, sugar: 3 },
    'mac and cheese': { name: '芝士通心粉', calories: 330, protein: 15, carbs: 40, fat: 14, fiber: 2, sugar: 6 },
    'macaroni': { name: '通心粉', calories: 150, protein: 5, carbs: 29, fat: 1, fiber: 1, sugar: 0 },
    'popcorn': { name: '爆米花', calories: 375, protein: 12, carbs: 73, fat: 4, fiber: 15, sugar: 1 },
    'pretzel': { name: '椒盐卷饼', calories: 380, protein: 10, carbs: 76, fat: 3, fiber: 2, sugar: 3 },
    'churro': { name: '吉事果', calories: 450, protein: 6, carbs: 55, fat: 24, fiber: 1, sugar: 20 },
    'tiramisu': { name: '提拉米苏', calories: 450, protein: 7, carbs: 42, fat: 28, fiber: 0, sugar: 30 },
    'trifle': { name: '水果蛋糕', calories: 260, protein: 4, carbs: 45, fat: 8, fiber: 1, sugar: 35 },
    'pudding': { name: '布丁', calories: 150, protein: 4, carbs: 28, fat: 3, fiber: 0, sugar: 18 },
    'jelly': { name: '果冻', calories: 70, protein: 2, carbs: 17, fat: 0, fiber: 0, sugar: 15 },
    'jam': { name: '果酱', calories: 278, protein: 0, carbs: 70, fat: 0, fiber: 1, sugar: 49 },
    'peanut butter': { name: '花生酱', calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, sugar: 6 },
    'honey': { name: '蜂蜜', calories: 304, protein: 0, carbs: 82, fat: 0, fiber: 0, sugar: 82 },
    'syrup': { name: '糖浆', calories: 260, protein: 0, carbs: 67, fat: 0, fiber: 0, sugar: 67 },
    'ketchup': { name: '番茄酱', calories: 112, protein: 1, carbs: 26, fat: 0, fiber: 0, sugar: 22 },
    'mustard': { name: '芥末', calories: 276, protein: 14, carbs: 16, fat: 20, fiber: 6, sugar: 5 },
    'mayonnaise': { name: '蛋黄酱', calories: 680, protein: 1, carbs: 1, fat: 75, fiber: 0, sugar: 1 },
    'vinegar': { name: '醋', calories: 21, protein: 0, carbs: 1, fat: 0, fiber: 0, sugar: 0 },
    'soy sauce': { name: '酱油', calories: 53, protein: 8, carbs: 4, fat: 0, fiber: 0, sugar: 1 },
    'chili': { name: '辣椒', calories: 40, protein: 2, carbs: 9, fat: 0, fiber: 2, sugar: 5 },
    'pepper': { name: '甜椒', calories: 26, protein: 1, carbs: 6, fat: 0, fiber: 1, sugar: 3 },
    'onion': { name: '洋葱', calories: 40, protein: 1, carbs: 9, fat: 0, fiber: 2, sugar: 5 },
    'garlic': { name: '大蒜', calories: 149, protein: 6, carbs: 33, fat: 0, fiber: 2, sugar: 1 },
    'ginger': { name: '生姜', calories: 80, protein: 2, carbs: 18, fat: 1, fiber: 2, sugar: 1 },
    'cucumber': { name: '黄瓜', calories: 16, protein: 1, carbs: 4, fat: 0, fiber: 0, sugar: 2 },
    'zucchini': { name: '西葫芦', calories: 17, protein: 1, carbs: 3, fat: 0, fiber: 1, sugar: 2 },
    'eggplant': { name: '茄子', calories: 25, protein: 1, carbs: 6, fat: 0, fiber: 2, sugar: 3 },
    'mushroom': { name: '蘑菇', calories: 22, protein: 3, carbs: 3, fat: 0, fiber: 1, sugar: 2 },
    'spinach': { name: '菠菜', calories: 23, protein: 3, carbs: 4, fat: 0, fiber: 2, sugar: 0 },
    'kale': { name: '羽衣甘蓝', calories: 49, protein: 4, carbs: 9, fat: 1, fiber: 4, sugar: 2 },
    'celery': { name: '芹菜', calories: 16, protein: 1, carbs: 3, fat: 0, fiber: 2, sugar: 1 },
    'asparagus': { name: '芦笋', calories: 20, protein: 2, carbs: 4, fat: 0, fiber: 2, sugar: 1 },
    'artichoke': { name: '洋蓟', calories: 47, protein: 3, carbs: 11, fat: 0, fiber: 5, sugar: 1 },
    'avocado': { name: '牛油果', calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, sugar: 1 },
    'coconut': { name: '椰子', calories: 354, protein: 3, carbs: 15, fat: 33, fiber: 9, sugar: 6 },
    'peach': { name: '桃子', calories: 39, protein: 1, carbs: 10, fat: 0, fiber: 2, sugar: 8 },
    'pear': { name: '梨', calories: 57, protein: 0, carbs: 15, fat: 0, fiber: 3, sugar: 10 },
    'pineapple': { name: '菠萝', calories: 50, protein: 0, carbs: 13, fat: 0, fiber: 1, sugar: 10 },
    'mango': { name: '芒果', calories: 60, protein: 1, carbs: 15, fat: 0, fiber: 2, sugar: 14 },
    'papaya': { name: '木瓜', calories: 43, protein: 0, carbs: 11, fat: 0, fiber: 2, sugar: 6 },
    'cherry': { name: '樱桃', calories: 50, protein: 1, carbs: 12, fat: 0, fiber: 2, sugar: 8 },
    'blueberry': { name: '蓝莓', calories: 57, protein: 1, carbs: 14, fat: 0, fiber: 2, sugar: 10 },
    'raspberry': { name: '树莓', calories: 52, protein: 1, carbs: 12, fat: 0, fiber: 7, sugar: 4 },
    'blackberry': { name: '黑莓', calories: 43, protein: 1, carbs: 10, fat: 0, fiber: 5, sugar: 5 },
    'cranberry': { name: '蔓越莓', calories: 46, protein: 0, carbs: 12, fat: 0, fiber: 5, sugar: 4 },
    'lemon': { name: '柠檬', calories: 29, protein: 1, carbs: 9, fat: 0, fiber: 2, sugar: 2 },
    'lime': { name: '青柠', calories: 30, protein: 1, carbs: 11, fat: 0, fiber: 3, sugar: 1 },
    'grapefruit': { name: '西柚', calories: 42, protein: 1, carbs: 11, fat: 0, fiber: 2, sugar: 7 },
    'cantaloupe': { name: '哈密瓜', calories: 34, protein: 1, carbs: 8, fat: 0, fiber: 1, sugar: 8 },
    'honeydew': { name: '白兰瓜', calories: 36, protein: 0, carbs: 9, fat: 0, fiber: 1, sugar: 8 },
    'fig': { name: '无花果', calories: 74, protein: 1, carbs: 19, fat: 0, fiber: 3, sugar: 16 },
    'date': { name: '椰枣', calories: 282, protein: 2, carbs: 75, fat: 0, fiber: 8, sugar: 63 },
    'prune': { name: '西梅干', calories: 240, protein: 2, carbs: 64, fat: 0, fiber: 7, sugar: 38 },
    'raisin': { name: '葡萄干', calories: 299, protein: 3, carbs: 79, fat: 0, fiber: 4, sugar: 59 },
    'peanut': { name: '花生', calories: 567, protein: 26, carbs: 16, fat: 49, fiber: 9, sugar: 5 },
    'almond': { name: '杏仁', calories: 575, protein: 21, carbs: 22, fat: 50, fiber: 12, sugar: 4 },
    'walnut': { name: '核桃', calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 7, sugar: 3 },
    'cashew': { name: '腰果', calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3, sugar: 6 },
    'pistachio': { name: '开心果', calories: 560, protein: 21, carbs: 28, fat: 45, fiber: 10, sugar: 8 },
    'hazelnut': { name: '榛子', calories: 628, protein: 15, carbs: 17, fat: 61, fiber: 10, sugar: 4 },
    'pecan': { name: '山核桃', calories: 691, protein: 9, carbs: 14, fat: 72, fiber: 10, sugar: 4 },
    'sunflower seed': { name: '葵花籽', calories: 584, protein: 21, carbs: 20, fat: 51, fiber: 9, sugar: 3 },
    'pumpkin seed': { name: '南瓜籽', calories: 559, protein: 30, carbs: 11, fat: 49, fiber: 6, sugar: 1 },
    'sesame seed': { name: '芝麻', calories: 573, protein: 18, carbs: 23, fat: 50, fiber: 12, sugar: 0 },
    'flax seed': { name: '亚麻籽', calories: 534, protein: 18, carbs: 29, fat: 42, fiber: 27, sugar: 2 },
    'chia seed': { name: '奇亚籽', calories: 490, protein: 17, carbs: 42, fat: 31, fiber: 34, sugar: 0 },
    'oat': { name: '燕麦', calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, sugar: 0 },
    'granola': { name: '格兰诺拉麦片', calories: 471, protein: 10, carbs: 65, fat: 20, fiber: 6, sugar: 22 },
    'cereal': { name: '麦片', calories: 376, protein: 7, carbs: 81, fat: 2, fiber: 8, sugar: 33 },
    'muesli': { name: '木斯里', calories: 355, protein: 11, carbs: 62, fat: 6, fiber: 9, sugar: 20 },
    'croissant': { name: '可颂', calories: 406, protein: 8, carbs: 46, fat: 22, fiber: 2, sugar: 8 },
    'bagel': { name: '贝果', calories: 250, protein: 10, carbs: 49, fat: 2, fiber: 2, sugar: 6 },
    'biscuit': { name: '饼干', calories: 428, protein: 7, carbs: 60, fat: 18, fiber: 2, sugar: 15 },
    'scone': { name: '司康', calories: 347, protein: 6, carbs: 57, fat: 12, fiber: 2, sugar: 15 },
    'brownie': { name: '布朗尼', calories: 379, protein: 5, carbs: 52, fat: 18, fiber: 3, sugar: 33 },
    'fudge': { name: '软糖', calories: 411, protein: 3, carbs: 76, fat: 11, fiber: 1, sugar: 71 },
    'caramel': { name: '焦糖', calories: 382, protein: 3, carbs: 77, fat: 8, fiber: 0, sugar: 57 },
    'marshmallow': { name: '棉花糖', calories: 318, protein: 2, carbs: 81, fat: 0, fiber: 0, sugar: 67 },
    'candy': { name: '糖果', calories: 396, protein: 0, carbs: 98, fat: 0, fiber: 0, sugar: 84 },
    'lollipop': { name: '棒棒糖', calories: 384, protein: 0, carbs: 96, fat: 0, fiber: 0, sugar: 78 },
    'gummy bear': { name: '软糖熊', calories: 396, protein: 7, carbs: 92, fat: 0, fiber: 0, sugar: 57 },
    'liquorice': { name: '甘草糖', calories: 385, protein: 4, carbs: 94, fat: 0, fiber: 0, sugar: 70 },
    'soda': { name: '苏打水', calories: 40, protein: 0, carbs: 11, fat: 0, fiber: 0, sugar: 11 },
    'juice': { name: '果汁', calories: 46, protein: 0, carbs: 11, fat: 0, fiber: 0, sugar: 10 },
    'smoothie': { name: '奶昔', calories: 97, protein: 4, carbs: 18, fat: 1, fiber: 1, sugar: 15 },
    'milkshake': { name: '奶昔', calories: 155, protein: 5, carbs: 25, fat: 4, fiber: 0, sugar: 20 },
    'hot chocolate': { name: '热巧克力', calories: 167, protein: 4, carbs: 30, fat: 4, fiber: 2, sugar: 25 },
    'tea': { name: '茶', calories: 1, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    'green tea': { name: '绿茶', calories: 1, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    'matcha': { name: '抹茶', calories: 340, protein: 30, carbs: 55, fat: 5, fiber: 35, sugar: 0 },
    'lemonade': { name: '柠檬水', calories: 40, protein: 0, carbs: 10, fat: 0, fiber: 0, sugar: 9 },
    'iced tea': { name: '冰茶', calories: 33, protein: 0, carbs: 9, fat: 0, fiber: 0, sugar: 8 },
    'cola': { name: '可乐', calories: 42, protein: 0, carbs: 11, fat: 0, fiber: 0, sugar: 11 },
    'sprite': { name: '雪碧', calories: 42, protein: 0, carbs: 11, fat: 0, fiber: 0, sugar: 11 },
    'drink': { name: '饮料', calories: 40, protein: 0, carbs: 10, fat: 0, fiber: 0, sugar: 9 },
    'beverage': { name: '饮品', calories: 40, protein: 0, carbs: 10, fat: 0, fiber: 0, sugar: 9 },
    'water': { name: '水', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
};

const RECIPES = {
    'pizza': {
        title: '意式玛格丽特披萨',
        time: '60分钟',
        servings: 4,
        difficulty: '中等',
        ingredients: ['高筋面粉 300g', '干酵母 5g', '温水 180ml', '盐 5g', '橄榄油 20ml', '番茄酱 200g', '马苏里拉芝士 200g', '新鲜罗勒叶 10片', '盐和黑胡椒 适量'],
        instructions: [
            '将干酵母溶于温水中，静置5分钟至表面起泡',
            '面粉加盐，倒入酵母水和橄榄油，揉成光滑面团',
            '面团发酵1小时至两倍大',
            '将面团擀成圆形披萨饼底',
            '涂抹番茄酱，撒上芝士和罗勒叶',
            '预热烤箱至220°C，烤15-20分钟至边缘金黄',
            '取出后淋上橄榄油，撒上盐和黑胡椒调味'
        ]
    },
    'burger': {
        title: '经典芝士汉堡',
        time: '40分钟',
        servings: 4,
        difficulty: '简单',
        ingredients: ['牛肉馅 500g', '汉堡面包 4个', '芝士片 4片', '生菜 4片', '番茄 2个（切片）', '洋葱 1个（切片）', '酸黄瓜 适量', '番茄酱、芥末酱 适量', '盐和黑胡椒 适量'],
        instructions: [
            '牛肉馅加盐和黑胡椒调味，分成4份，揉成肉饼',
            '预热平底锅或烤架，放入肉饼，每面煎4-5分钟',
            '最后一分钟在肉饼上放上芝士片，盖上锅盖让芝士融化',
            '汉堡面包切开，烤至表面金黄',
            '在面包上涂抹番茄酱和芥末酱',
            '依次放上生菜、番茄、洋葱、酸黄瓜和肉饼',
            '盖上面包顶部，用牙签固定即可'
        ]
    },
    'sushi': {
        title: '三文鱼寿司卷',
        time: '90分钟',
        servings: 4,
        difficulty: '中等',
        ingredients: ['寿司米 300g', '三文鱼刺身 200g', '黄瓜 1条（切条）', '牛油果 1个（切片）', '海苔片 4张', '寿司醋 30ml', '白糖 10g', '盐 3g', '芥末和酱油 适量'],
        instructions: [
            '寿司米洗净，加水浸泡30分钟，煮熟',
            '寿司醋加糖和盐加热融化，拌入米饭中，放凉',
            '海苔片铺在寿司帘上，均匀铺上一层米饭',
            '中间放上三文鱼、黄瓜条和牛油果',
            '用寿司帘卷起，捏紧定型',
            '刀沾水，切成2cm厚的片',
            '配上芥末和酱油食用'
        ]
    },
    'pasta': {
        title: '奶油培根意面',
        time: '30分钟',
        servings: 4,
        difficulty: '简单',
        ingredients: ['意大利面 400g', '培根 150g（切条）', '大蒜 3瓣（切末）', '淡奶油 200ml', '帕玛森芝士 50g（磨碎）', '鸡蛋黄 2个', '黑胡椒 适量', '盐 适量', '意大利香草 适量'],
        instructions: [
            '烧一大锅水，加盐，煮意面至八分熟',
            '培根放入平底锅煎至金黄出油',
            '加入蒜末炒香',
            '转小火，倒入淡奶油，加入帕玛森芝士融化',
            '关火，加入蛋黄快速搅拌均匀',
            '将煮好的意面和部分面汤加入酱汁中拌匀',
            '撒上黑胡椒和意大利香草，淋上橄榄油即可'
        ]
    },
    'rice': {
        title: '扬州炒饭',
        time: '20分钟',
        servings: 4,
        difficulty: '简单',
        ingredients: ['隔夜米饭 500g', '鸡蛋 3个', '虾仁 100g', '火腿 100g（切丁）', '青豆 50g', '胡萝卜 50g（切丁）', '玉米粒 50g', '葱 3根（切葱花）', '盐、生抽、料酒 适量'],
        instructions: [
            '鸡蛋打散，加少许盐，炒熟盛出',
            '虾仁用料酒和盐腌制10分钟，炒熟备用',
            '火腿丁炒香，加入胡萝卜丁、青豆、玉米粒翻炒',
            '倒入米饭，用铲子压散，翻炒均匀',
            '加入炒好的鸡蛋和虾仁，继续翻炒',
            '淋入生抽，加盐调味',
            '最后撒上葱花，翻炒均匀即可出锅'
        ]
    },
    'chicken': {
        title: '香煎柠檬鸡胸肉',
        time: '25分钟',
        servings: 2,
        difficulty: '简单',
        ingredients: ['鸡胸肉 2块', '柠檬 1个', '大蒜 2瓣（切末）', '橄榄油 30ml', '迷迭香 2枝', '盐和黑胡椒 适量', '蜂蜜 10ml'],
        instructions: [
            '鸡胸肉用刀背拍松，两面撒盐和黑胡椒腌制15分钟',
            '柠檬一半切片，一半榨汁',
            '平底锅加热橄榄油，放入鸡胸肉，每面煎3-4分钟至金黄',
            '加入蒜末、迷迭香和柠檬片',
            '倒入柠檬汁和蜂蜜，收汁',
            '取出鸡胸肉，静置5分钟后切片',
            '淋上锅中的酱汁，搭配蔬菜食用'
        ]
    },
    'salad': {
        title: '凯撒沙拉',
        time: '15分钟',
        servings: 4,
        difficulty: '简单',
        ingredients: ['生菜 1颗（撕成碎片）', '面包丁 50g', '帕玛森芝士 30g（刨片）', '鸡胸肉 100g（煎熟切片）', '凯撒酱 100ml', '培根 50g（煎熟切碎）', '柠檬汁 适量', '盐和黑胡椒 适量'],
        instructions: [
            '生菜洗净沥干，撕成适当大小，放入大碗',
            '鸡胸肉煎熟，切片备用',
            '培根煎香，切碎备用',
            '将面包丁放入烤箱或平底锅烤至金黄',
            '在生菜中加入凯撒酱拌匀',
            '铺上鸡胸肉片、培根碎和面包丁',
            '撒上帕玛森芝士，淋上柠檬汁，加黑胡椒调味'
        ]
    },
    'cake': {
        title: '简易电饭煲蛋糕',
        time: '60分钟',
        servings: 6,
        difficulty: '简单',
        ingredients: ['鸡蛋 6个', '低筋面粉 100g', '白糖 80g', '牛奶 60ml', '玉米油 50ml', '白醋 几滴', '泡打粉 3g', '盐 1g'],
        instructions: [
            '蛋黄和蛋清分离',
            '蛋黄加20g糖、牛奶、玉米油搅拌均匀',
            '筛入低筋面粉和泡打粉，拌匀成蛋黄糊',
            '蛋清加白醋和盐，分次加入60g糖，打至硬性发泡',
            '取1/3蛋白霜加入蛋黄糊拌匀，再倒回蛋白霜中翻拌均匀',
            '电饭煲预热，内壁刷油，倒入蛋糕糊',
            '按煮饭键，跳键后焖20分钟即可'
        ]
    },
    'soup': {
        title: '番茄牛肉汤',
        time: '90分钟',
        servings: 6,
        difficulty: '中等',
        ingredients: ['牛肉 500g（切块）', '番茄 4个', '洋葱 1个（切丁）', '胡萝卜 2根（切块）', '土豆 2个（切块）', '大蒜 3瓣（切末）', '番茄酱 30g', '牛肉高汤 1L', '月桂叶 2片', '盐和黑胡椒 适量'],
        instructions: [
            '牛肉焯水后捞出洗净',
            '番茄划十字，用开水烫一下去皮，切块',
            '锅中加油，炒香洋葱和蒜末',
            '加入番茄炒软，加入番茄酱炒出红油',
            '加入牛肉、胡萝卜、土豆翻炒',
            '倒入高汤，加入月桂叶，大火烧开后转小火炖1小时',
            '最后加盐和黑胡椒调味即可'
        ]
    },
    'steak': {
        title: '黑椒牛排',
        time: '30分钟',
        servings: 2,
        difficulty: '中等',
        ingredients: ['西冷牛排 2块（约200g/块）', '黑胡椒碎 10g', '黄油 20g', '大蒜 4瓣（带皮拍碎）', '迷迭香 2枝', '百里香 1枝', '盐 适量', '橄榄油 适量'],
        instructions: [
            '牛排提前30分钟从冰箱取出，用厨房纸吸干水分',
            '两面均匀撒上盐和黑胡椒腌制',
            '平底锅大火加热，倒入橄榄油',
            '放入牛排，每面煎2-3分钟（根据喜好调整熟度）',
            '转小火，加入黄油、大蒜、迷迭香和百里香',
            '将融化的黄油反复浇在牛排上',
            '取出牛排，静置5分钟后切片，淋上锅中的酱汁'
        ]
    },
    'ramen': {
        title: '日式豚骨拉面',
        time: '120分钟',
        servings: 4,
        difficulty: '较难',
        ingredients: ['猪大骨 1kg', '拉面面饼 4份', '叉烧肉 200g（切片）', '溏心蛋 4个（切半）', '海苔 4片', '葱花 适量', '笋干 适量', '玉米 适量', '味噌 50g', '酱油 30ml', '盐 适量'],
        instructions: [
            '猪大骨焯水后洗净，加水大火烧开，转小火炖4小时成奶白色',
            '味噌用少量汤化开，加入酱油和盐调味',
            '面条煮3分钟，捞出放入碗中',
            '溏心蛋提前腌好备用',
            '叉烧肉提前做好切片',
            '碗中倒入调好的汤底',
            '摆上叉烧、溏心蛋、海苔、笋干、玉米，撒上葱花即可'
        ]
    },
    'ice cream': {
        title: '草莓冰淇淋（无需搅拌）',
        time: '360分钟（含冷冻时间）',
        servings: 6,
        difficulty: '简单',
        ingredients: ['淡奶油 300ml', '炼乳 200g', '新鲜草莓 300g', '柠檬汁 10ml', '草莓酱 50g'],
        instructions: [
            '新鲜草莓洗净，200g打成果泥，100g切小丁',
            '草莓果泥加柠檬汁拌匀',
            '淡奶油打至六分发（出现纹路但可流动）',
            '加入炼乳和草莓果泥拌匀',
            '加入草莓丁和草莓酱轻轻翻拌',
            '倒入密封盒，放入冰箱冷冻6小时以上',
            '食用前取出稍微软化即可'
        ]
    },
    'fish': {
        title: '清蒸鲈鱼',
        time: '25分钟',
        servings: 3,
        difficulty: '简单',
        ingredients: ['鲈鱼 1条（约500g）', '葱 3根（切丝）', '姜 1块（切片和丝）', '蒸鱼豉油 30ml', '料酒 15ml', '盐 适量', '食用油 30ml'],
        instructions: [
            '鲈鱼处理干净，两面划几刀，抹上料酒和盐腌制10分钟',
            '鱼身铺上姜片和葱丝',
            '蒸锅水开后放入鱼，大火蒸8分钟',
            '取出鱼，倒掉盘中的水，去掉姜片和葱丝',
            '铺上新鲜的葱丝，淋上蒸鱼豉油',
            '食用油烧热，淋在葱丝上爆香',
            '配上米饭食用最佳'
        ]
    },
    'salmon': {
        title: '香煎三文鱼配芦笋',
        time: '20分钟',
        servings: 2,
        difficulty: '简单',
        ingredients: ['三文鱼排 2块（约150g/块）', '芦笋 200g', '柠檬 1个', '大蒜 2瓣（切末）', '橄榄油 30ml', '黄油 15g', '盐和黑胡椒 适量', '莳萝 适量'],
        instructions: [
            '三文鱼用厨房纸吸干水分，两面撒盐和黑胡椒',
            '芦笋洗净切段，焯水1分钟捞出',
            '平底锅加热橄榄油，三文鱼皮朝下放入',
            '煎4分钟至皮金黄，翻面煎2分钟',
            '加入黄油、蒜末，融化后浇在鱼上',
            '芦笋放入锅中，加盐和黑胡椒翻炒',
            '三文鱼和芦笋装盘，挤上柠檬汁，撒上莳萝'
        ]
    },
    'omelette': {
        title: '法式欧姆蛋',
        time: '10分钟',
        servings: 2,
        difficulty: '简单',
        ingredients: ['鸡蛋 4个', '牛奶 30ml', '黄油 20g', '芝士碎 30g', '盐和黑胡椒 适量', '葱花 适量', '彩椒丁 适量'],
        instructions: [
            '鸡蛋打散，加入牛奶、盐和黑胡椒搅匀',
            '平底锅中小火加热，放入黄油融化',
            '倒入蛋液，用筷子快速搅拌至半凝固',
            '在一半的蛋饼上撒上芝士碎、彩椒丁和葱花',
            '将另一半蛋饼对折盖住馅料',
            '煎1分钟至芝士融化',
            '出锅，可淋上番茄酱或配吐司食用'
        ]
    }
};

const FOOD_KEYWORDS = [
    'food', 'dessert', 'fruit', 'vegetable', 'meat', 'seafood', 'dairy', 'bakery',
    'beverage', 'drink', 'snack', 'meal', 'dish', 'cuisine', 'recipe',
    'pizza', 'burger', 'sushi', 'pasta', 'rice', 'noodle', 'salad', 'soup',
    'cake', 'ice cream', 'chocolate', 'cookie', 'bread', 'sandwich',
    'chicken', 'beef', 'pork', 'steak', 'fish', 'salmon', 'shrimp', 'egg',
    'apple', 'banana', 'orange', 'strawberry', 'grape', 'watermelon',
    'tomato', 'carrot', 'broccoli', 'potato', 'corn', 'mushroom',
    'coffee', 'tea', 'juice', 'beer', 'wine', 'soda',
    'ramen', 'curry', 'taco', 'burrito', 'kebab', 'dim sum',
    'dumpling', 'eggroll', 'springroll', 'wonton', 'potsticker',
    'pancake', 'waffle', 'muffin', 'donut', 'croissant', 'bagel',
    'cheese', 'yogurt', 'milk', 'honey', 'jam', 'peanut butter',
    'almond', 'walnut', 'peanut', 'oat', 'cereal', 'granola',
    'hot dog', 'french fries', 'chips', 'popcorn', 'pretzel',
    'bbq', 'grill', 'roast', 'stew', 'casserole', 'meatloaf',
    'lasagna', 'spaghetti', 'macaroni', 'ravioli', 'gnocchi',
    'lobster', 'crab', 'oyster', 'sashimi', 'tempeh', 'tofu',
    'avocado', 'coconut', 'mango', 'pineapple', 'peach', 'pear',
    'blueberry', 'raspberry', 'cherry', 'lemon', 'lime', 'fig',
    'olive', 'hummus', 'falafel', 'naan', 'tiramisu', 'pudding',
    'guacamole', 'quesadilla', 'nachos', 'churro', 'brownie'
];

function findNutrition(predictionLabel) {
    const lowerLabel = predictionLabel.toLowerCase().trim();
    
    if (NUTRITION_DATA[lowerLabel]) {
        return NUTRITION_DATA[lowerLabel];
    }
    
    for (const key in NUTRITION_DATA) {
        if (lowerLabel.includes(key) || key.includes(lowerLabel)) {
            return NUTRITION_DATA[key];
        }
    }
    
    const keywords = lowerLabel.split(/[\s,-]+/);
    for (const keyword of keywords) {
        if (NUTRITION_DATA[keyword]) {
            return NUTRITION_DATA[keyword];
        }
        for (const key in NUTRITION_DATA) {
            if (key.includes(keyword) || keyword.includes(key)) {
                return NUTRITION_DATA[key];
            }
        }
    }
    
    return null;
}

function findRecipe(predictionLabel) {
    const lowerLabel = predictionLabel.toLowerCase().trim();
    
    if (RECIPES[lowerLabel]) {
        return RECIPES[lowerLabel];
    }
    
    for (const key in RECIPES) {
        if (lowerLabel.includes(key) || key.includes(lowerLabel)) {
            return RECIPES[key];
        }
    }
    
    const keywords = lowerLabel.split(/[\s,-]+/);
    for (const keyword of keywords) {
        if (RECIPES[keyword]) {
            return RECIPES[keyword];
        }
        for (const key in RECIPES) {
            if (key.includes(keyword) || keyword.includes(key)) {
                return RECIPES[key];
            }
        }
    }
    
    const fallbackRecipes = Object.values(RECIPES);
    return fallbackRecipes[Math.floor(Math.random() * fallbackRecipes.length)];
}

function isFoodPrediction(predictionLabel) {
    const lowerLabel = predictionLabel.toLowerCase().trim();
    
    for (const keyword of FOOD_KEYWORDS) {
        if (lowerLabel.includes(keyword) || keyword.includes(lowerLabel)) {
            return true;
        }
    }
    
    if (NUTRITION_DATA[lowerLabel]) {
        return true;
    }
    
    for (const key in NUTRITION_DATA) {
        if (lowerLabel.includes(key) || key.includes(lowerLabel)) {
            return true;
        }
    }
    
    return false;
}

function translateLabel(predictionLabel) {
    const nutrition = findNutrition(predictionLabel);
    if (nutrition) {
        return nutrition.name;
    }
    return predictionLabel;
}
