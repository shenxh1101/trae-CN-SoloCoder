let ingredients = [];
let currentRecommendations = [];

function addIngredient() {
    const input = document.getElementById('ingredientInput');
    const value = input.value.trim();
    
    if (value && !ingredients.includes(value)) {
        ingredients.push(value);
        renderIngredientTags();
    }
    
    input.value = '';
    input.focus();
}

function removeIngredient(ingredient) {
    ingredients = ingredients.filter(i => i !== ingredient);
    renderIngredientTags();
}

function renderIngredientTags() {
    const container = document.getElementById('ingredientTags');
    container.innerHTML = ingredients.map(ing => `
        <span class="ingredient-tag">
            ${ing}
            <span class="remove" onclick="removeIngredient('${ing}')">×</span>
        </span>
    `).join('');
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        addIngredient();
    }
}

async function getRecommendations() {
    if (ingredients.length === 0) {
        alert('请先添加食材！');
        return;
    }
    
    const difficulty = document.getElementById('difficulty').value;
    const limit = document.getElementById('limit').value;
    
    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ingredients: ingredients,
                difficulty: difficulty || null,
                limit: parseInt(limit)
            })
        });
        
        const data = await response.json();
        currentRecommendations = data.recommendations;
        renderRecommendations(data.recommendations);
    } catch (error) {
        console.error('Error:', error);
        alert('获取推荐失败，请重试');
    }
}

function renderRecommendations(recommendations) {
    const container = document.getElementById('recommendations');
    
    if (recommendations.length === 0) {
        container.innerHTML = `
            <h2>🍽️ 推荐结果</h2>
            <p class="hint">没有找到匹配的菜谱，请尝试添加更多食材</p>
        `;
        return;
    }
    
    container.innerHTML = `
        <h2>🍽️ 推荐结果 (${recommendations.length}道)</h2>
        ${recommendations.map(recipe => `
            <div class="recipe-card" data-id="${recipe.id}">
                <div class="recipe-header">
                    <span class="recipe-title">${recipe.name}</span>
                    <span class="match-score">${recipe.match_score}% 匹配</span>
                </div>
                
                <div class="recipe-meta">
                    <span class="meta-item">⏱️ ${recipe.cook_time}分钟</span>
                    <span class="meta-item">📊 ${recipe.difficulty}</span>
                    ${recipe.is_vegetarian ? '<span class="tag">🥬 素食</span>' : ''}
                    ${recipe.is_gluten_free ? '<span class="tag">🌾 无麸质</span>' : ''}
                    ${recipe.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
                </div>
                
                <div class="ingredients-list">
                    <h4>🥗 所需食材</h4>
                    <ul>
                        ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="steps-list">
                    <h4>👨‍🍳 烹饪步骤</h4>
                    <ol>
                        ${recipe.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
                
                ${recipe.missing_ingredients.length > 0 ? `
                    <div class="missing-section">
                        <h4>⚠️ 缺少食材</h4>
                        <ul>
                            ${recipe.missing_ingredients.map(ing => `<li>${ing}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${Object.keys(recipe.substitutions).length > 0 ? `
                    <div class="substitutions-section">
                        <h4>🔄 食材替换建议</h4>
                        ${Object.entries(recipe.substitutions).map(([original, subs]) => `
                            <div class="substitution-item">
                                <span class="original">${original} 可替换为：</span>
                                <span class="subs">
                                    ${subs.map(s => `${s.substitute} (${s.reason})`).join('；')}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="nutrition-section">
                    <h4>📊 营养估算 (每份)</h4>
                    <div class="nutrition-grid">
                        <div class="nutrition-item">
                            <div class="nutrition-value">${recipe.nutrition.calories}</div>
                            <div class="nutrition-label">热量 (kcal)</div>
                        </div>
                        <div class="nutrition-item">
                            <div class="nutrition-value">${recipe.nutrition.protein}</div>
                            <div class="nutrition-label">蛋白质 (g)</div>
                        </div>
                        <div class="nutrition-item">
                            <div class="nutrition-value">${recipe.nutrition.carbs}</div>
                            <div class="nutrition-label">碳水 (g)</div>
                        </div>
                        <div class="nutrition-item">
                            <div class="nutrition-value">${recipe.nutrition.fat}</div>
                            <div class="nutrition-label">脂肪 (g)</div>
                        </div>
                    </div>
                </div>
                
                <div class="feedback-section">
                    <button class="feedback-btn like" onclick="sendFeedback(${recipe.id}, 'like')">👍 有用</button>
                    <button class="feedback-btn dislike" onclick="sendFeedback(${recipe.id}, 'dislike')">👎 没用</button>
                </div>
            </div>
        `).join('')}
    `;
}

async function sendFeedback(recipeId, type) {
    try {
        await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipe_id: recipeId,
                type: type
            })
        });
        alert(type === 'like' ? '感谢您的点赞！' : '感谢您的反馈！');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function savePreferences() {
    const vegetarian = document.getElementById('vegetarian').checked;
    const glutenFree = document.getElementById('gluten_free').checked;
    
    try {
        await fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vegetarian: vegetarian,
                gluten_free: glutenFree
            })
        });
        alert('偏好设置已保存！');
    } catch (error) {
        console.error('Error:', error);
        alert('保存失败，请重试');
    }
}

async function loadPreferences() {
    try {
        const response = await fetch('/api/preferences');
        const prefs = await response.json();
        
        document.getElementById('vegetarian').checked = prefs.vegetarian || false;
        document.getElementById('gluten_free').checked = prefs.gluten_free || false;
    } catch (error) {
        console.error('Error:', error);
    }
}

function exportPreferences() {
    window.location.href = '/api/preferences/export';
}

async function batchRecommend() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('请先选择CSV文件！');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/batch', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        renderBatchResults(data.results);
    } catch (error) {
        console.error('Error:', error);
        alert('批量推荐失败，请重试');
    }
}

function renderBatchResults(results) {
    const container = document.getElementById('batchResults');
    container.style.display = 'block';
    
    container.innerHTML = `
        <h2>📦 批量推荐结果</h2>
        ${results.map((item, index) => `
            <div class="batch-item">
                <div class="batch-input">第${index + 1}组: ${item.input_ingredients.join(', ')}</div>
                <div class="batch-recipes">推荐: ${item.recommendations.join('、') || '无匹配菜谱'}</div>
            </div>
        `).join('')}
    `;
}

function exportHistory() {
    window.location.href = '/api/history/export';
}

async function generateShoppingList() {
    if (currentRecommendations.length === 0) {
        alert('请先获取推荐结果！');
        return;
    }
    
    const recipeIds = currentRecommendations.map(r => r.id);
    
    try {
        const response = await fetch('/api/shopping_list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipe_ids: recipeIds })
        });
        
        const data = await response.json();
        showShoppingListModal(data.shopping_list);
    } catch (error) {
        console.error('Error:', error);
        alert('生成购物清单失败，请重试');
    }
}

function showShoppingListModal(shoppingList) {
    const modal = document.getElementById('shoppingListModal');
    const content = document.getElementById('shoppingListContent');
    
    content.innerHTML = `
        <p>基于当前推荐菜品，您可能需要购买以下食材：</p>
        <ul>
            ${shoppingList.map(item => `
                <li>
                    <input type="checkbox" class="shopping-list-checkbox">
                    ${item}
                </li>
            `).join('')}
        </ul>
    `;
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('shoppingListModal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('shoppingListModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

window.onload = function() {
    loadPreferences();
};
