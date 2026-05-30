import os
import json
import csv
import io
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file, session
from data_module import RECIPES, NUTRITION_TABLE, INGREDIENT_SUBSTITUTIONS

app = Flask(__name__)
app.secret_key = 'recipe-recommendation-secret-key-2024'

BASE_CONDIMENTS = ['盐', '油', '生抽', '老抽', '醋', '糖', '料酒', '淀粉', '姜', '蒜', '葱', '葱花', '香油', '水']

user_preferences = {}
recommendation_history = []
feedback_data = {}

FEEDBACK_FILE = 'data/feedback.json'

def load_feedback():
    global feedback_data
    if os.path.exists(FEEDBACK_FILE):
        try:
            with open(FEEDBACK_FILE, 'r', encoding='utf-8') as f:
                feedback_data = json.load(f)
        except:
            feedback_data = {}
    else:
        feedback_data = {}

def save_feedback():
    os.makedirs(os.path.dirname(FEEDBACK_FILE), exist_ok=True)
    with open(FEEDBACK_FILE, 'w', encoding='utf-8') as f:
        json.dump(feedback_data, f, ensure_ascii=False, indent=2)

load_feedback()

def calculate_match_score(user_ingredients, recipe_ingredients):
    user_set = set([i.strip() for i in user_ingredients])
    recipe_set = set(recipe_ingredients)
    
    main_ingredients = [i for i in recipe_set if i not in BASE_CONDIMENTS]
    condiments = [i for i in recipe_set if i in BASE_CONDIMENTS]
    
    matched_main = len(user_set & set(main_ingredients))
    matched_condiments = len(user_set & set(condiments))
    
    total_main = len(main_ingredients)
    total_condiments = len(condiments)
    
    if total_main == 0:
        return 0, []
    
    main_match_ratio = matched_main / total_main if total_main > 0 else 0
    condiment_match_ratio = matched_condiments / total_condiments if total_condiments > 0 else 1
    
    score = main_match_ratio * 0.8 + condiment_match_ratio * 0.2
    
    missing_main = [i for i in main_ingredients if i not in user_set]
    missing_condiments = [i for i in condiments if i not in user_set]
    missing = missing_main + missing_condiments
    
    return max(0, score), missing

def get_weighted_score(recipe_id, base_score):
    likes = feedback_data.get(str(recipe_id), {}).get('likes', 0)
    dislikes = feedback_data.get(str(recipe_id), {}).get('dislikes', 0)
    weight = 1.0
    
    if likes + dislikes > 0:
        weight = 1.0 + (likes - dislikes) * 0.1
    
    return base_score * weight

def get_nutrition_estimate(ingredients):
    total_calories = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0
    
    for ing in ingredients:
        if ing in NUTRITION_TABLE:
            nut = NUTRITION_TABLE[ing]
            if ing in ['油', '香油']:
                factor = 0.15
            elif ing in BASE_CONDIMENTS:
                factor = 0.05
            elif ing in ['鸡蛋']:
                factor = 2.0
            elif ing in ['米饭', '面条', '饺子']:
                factor = 1.5
            else:
                factor = 1.0
            
            total_calories += nut['calories'] * factor
            total_protein += nut['protein'] * factor
            total_carbs += nut['carbs'] * factor
            total_fat += nut['fat'] * factor
    
    return {
        'calories': round(total_calories),
        'protein': round(total_protein, 1),
        'carbs': round(total_carbs, 1),
        'fat': round(total_fat, 1)
    }

def get_substitutions(missing_ingredients):
    substitutions = {}
    for ing in missing_ingredients:
        if ing in INGREDIENT_SUBSTITUTIONS:
            substitutions[ing] = INGREDIENT_SUBSTITUTIONS[ing]
    return substitutions

def recommend_recipes(user_ingredients, preferences=None, difficulty=None, limit=5):
    results = []
    
    for recipe in RECIPES:
        score, missing = calculate_match_score(user_ingredients, recipe['ingredients'])
        
        if preferences:
            if preferences.get('vegetarian') and not recipe['is_vegetarian']:
                score -= 0.5
            if preferences.get('gluten_free') and not recipe['is_gluten_free']:
                score -= 0.5
        
        if difficulty and recipe['difficulty'] != difficulty:
            continue
        
        weighted_score = get_weighted_score(recipe['id'], score)
        
        if score > 0:
            nutrition = get_nutrition_estimate(recipe['ingredients'])
            substitutions = get_substitutions(missing)
            
            results.append({
                'id': recipe['id'],
                'name': recipe['name'],
                'ingredients': recipe['ingredients'],
                'steps': recipe['steps'],
                'missing_ingredients': missing,
                'substitutions': substitutions,
                'cook_time': recipe['cook_time'],
                'difficulty': recipe['difficulty'],
                'tags': recipe['tags'],
                'nutrition': nutrition,
                'match_score': round(weighted_score * 100),
                'is_vegetarian': recipe['is_vegetarian'],
                'is_gluten_free': recipe['is_gluten_free']
            })
    
    results.sort(key=lambda x: x['match_score'], reverse=True)
    return results[:limit]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/recommend', methods=['POST'])
def api_recommend():
    data = request.json
    ingredients = data.get('ingredients', [])
    difficulty = data.get('difficulty')
    limit = data.get('limit', 5)
    
    if not ingredients:
        return jsonify({'error': '请输入食材列表'}), 400
    
    session_id = session.sid if hasattr(session, 'sid') else 'default'
    preferences = user_preferences.get(session_id, {})
    
    recommendations = recommend_recipes(ingredients, preferences, difficulty, limit)
    
    history_entry = {
        'timestamp': datetime.now().isoformat(),
        'ingredients': ingredients,
        'recommendations': [r['name'] for r in recommendations]
    }
    recommendation_history.append(history_entry)
    
    return jsonify({'recommendations': recommendations})

@app.route('/api/feedback', methods=['POST'])
def api_feedback():
    data = request.json
    recipe_id = str(data.get('recipe_id'))
    feedback_type = data.get('type')
    
    if recipe_id not in feedback_data:
        feedback_data[recipe_id] = {'likes': 0, 'dislikes': 0}
    
    if feedback_type == 'like':
        feedback_data[recipe_id]['likes'] += 1
    elif feedback_type == 'dislike':
        feedback_data[recipe_id]['dislikes'] += 1
    
    save_feedback()
    
    return jsonify({'success': True, 'feedback': feedback_data[recipe_id]})

@app.route('/api/preferences', methods=['GET', 'POST'])
def api_preferences():
    session_id = session.sid if hasattr(session, 'sid') else 'default'
    
    if request.method == 'POST':
        data = request.json
        user_preferences[session_id] = data
        return jsonify({'success': True, 'preferences': data})
    else:
        return jsonify(user_preferences.get(session_id, {}))

@app.route('/api/preferences/export', methods=['GET'])
def export_preferences():
    session_id = session.sid if hasattr(session, 'sid') else 'default'
    prefs = user_preferences.get(session_id, {})
    
    output = io.StringIO()
    json.dump(prefs, output, ensure_ascii=False, indent=2)
    output.seek(0)
    
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='application/json',
        as_attachment=True,
        download_name='preferences.json'
    )

@app.route('/api/batch', methods=['POST'])
def batch_recommend():
    if 'file' not in request.files:
        return jsonify({'error': '没有上传文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'error': '请上传CSV文件'}), 400
    
    content = file.read().decode('utf-8')
    csv_reader = csv.reader(io.StringIO(content))
    
    session_id = session.sid if hasattr(session, 'sid') else 'default'
    preferences = user_preferences.get(session_id, {})
    
    results = []
    for row in csv_reader:
        if not row:
            continue
        ingredients = [i.strip() for i in row if i.strip()]
        if ingredients:
            recommendations = recommend_recipes(ingredients, preferences, None, 3)
            results.append({
                'input_ingredients': ingredients,
                'recommendations': [r['name'] for r in recommendations]
            })
    
    return jsonify({'results': results})

@app.route('/api/history/export', methods=['GET'])
def export_history():
    if not recommendation_history:
        return jsonify({'history': recommendation_history})
    
    md_content = "# 推荐历史\n\n"
    md_content += "| 时间 | 输入食材 | 推荐菜品 |\n"
    md_content += "|------|----------|----------|\n"
    
    for entry in recommendation_history[-20:]:
        md_content += f"| {entry['timestamp']} | {', '.join(entry['ingredients'])} | {', '.join(entry['recommendations'])} |\n"
    
    output = io.BytesIO(md_content.encode('utf-8'))
    
    return send_file(
        output,
        mimetype='text/markdown',
        as_attachment=True,
        download_name='recommendation_history.md'
    )

@app.route('/api/shopping_list', methods=['POST'])
def generate_shopping_list():
    data = request.json
    recipe_ids = data.get('recipe_ids', [])
    
    all_missing = set()
    
    for recipe_id in recipe_ids:
        recipe = next((r for r in RECIPES if r['id'] == int(recipe_id)), None)
        if recipe:
            all_missing.update(recipe['ingredients'])
    
    shopping_list = list(all_missing)
    
    return jsonify({'shopping_list': shopping_list})

@app.route('/api/ingredients')
def get_ingredients_list():
    all_ingredients = set()
    for recipe in RECIPES:
        all_ingredients.update(recipe['ingredients'])
    
    return jsonify({'ingredients': sorted(list(all_ingredients))})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
