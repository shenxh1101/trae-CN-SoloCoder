"""
自定义拖拽工具模块
使用HTML5原生拖拽API实现字段拖拽分配功能
"""

import json
import streamlit as st
import streamlit.components.v1 as components


DRAG_AND_DROP_JS = """
(function() {
    window.StreamlitDragDrop = {
        initialized: false,
        ghostElement: null,
        dropSuccessTimer: null,

        init: function() {
            if (this.initialized) return;
            this.initialized = true;

            const root = window.parent.document;
            this.setupGlobalDragHandlers(root);
            this.observeNewElements(root);
            this.setupGlobalStyles(root);
        },

        setupGlobalStyles: function(root) {
            const style = document.createElement('style');
            style.textContent = `
                @keyframes dropSuccess {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                @keyframes fieldEnter {
                    0% { opacity: 0; transform: translateY(-10px) scale(0.8); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes fieldExit {
                    0% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0; transform: scale(0.8); }
                }
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
                    50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                @keyframes floatUp {
                    0% { opacity: 1; transform: translateY(0) scale(1); }
                    100% { opacity: 0; transform: translateY(-30px) scale(0.8); }
                }
                .field-tag.field-enter {
                    animation: fieldEnter 0.3s ease-out forwards;
                }
                .field-tag.field-exit {
                    animation: fieldExit 0.2s ease-in forwards;
                }
                .field-drop-zone.drop-success {
                    animation: dropSuccess 0.4s ease-out;
                }
                .field-drop-zone.drag-over.drag-over-valid {
                    animation: pulse 1s infinite;
                }
                .field-drop-zone.invalid-drop {
                    animation: shake 0.3s ease-in-out;
                }
                .success-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                    z-index: 99999;
                    font-weight: 500;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    pointer-events: none;
                }
                .success-toast.fade-out {
                    animation: floatUp 0.5s ease-out forwards;
                }
            `;
            root.head.appendChild(style);
        },

        showSuccessToast: function(message, root) {
            const existingToast = root.querySelector('.success-toast');
            if (existingToast) {
                existingToast.remove();
            }

            const toast = document.createElement('div');
            toast.className = 'success-toast';
            toast.innerHTML = `<span>✅</span><span>${message}</span>`;
            root.body.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 500);
            }, 1500);
        },

        setupGlobalDragHandlers: function(root) {
            let draggedElement = null;
            let draggedData = null;
            let ghostElement = null;

            const createGhost = function(e, originalElement) {
                if (ghostElement) ghostElement.remove();
                
                ghostElement = originalElement.cloneNode(true);
                ghostElement.style.position = 'fixed';
                ghostElement.style.top = e.clientY + 15 + 'px';
                ghostElement.style.left = e.clientX + 15 + 'px';
                ghostElement.style.opacity = '0.9';
                ghostElement.style.zIndex = '99999';
                ghostElement.style.pointerEvents = 'none';
                ghostElement.style.transform = 'rotate(3deg) scale(1.05)';
                ghostElement.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
                ghostElement.style.width = originalElement.offsetWidth + 'px';
                ghostElement.classList.add('dragging-ghost');
                
                root.body.appendChild(ghostElement);
            };

            root.addEventListener('dragstart', function(e) {
                if (e.target.classList.contains('draggable-field-item')) {
                    draggedElement = e.target;
                    draggedData = JSON.parse(e.target.dataset.dragData || '{}');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('application/json', JSON.stringify(draggedData));
                    e.dataTransfer.setDragImage(new Image(), 0, 0);
                    
                    e.target.classList.add('dragging-active');
                    
                    setTimeout(() => {
                        createGhost(e, e.target);
                    }, 0);
                }
            });

            root.addEventListener('drag', function(e) {
                if (ghostElement && e.clientX && e.clientY) {
                    ghostElement.style.top = e.clientY + 15 + 'px';
                    ghostElement.style.left = e.clientX + 15 + 'px';
                }
            });

            root.addEventListener('dragend', function(e) {
                if (e.target.classList.contains('draggable-field-item')) {
                    e.target.classList.remove('dragging-active');
                    const dropZones = root.querySelectorAll('.field-drop-zone');
                    dropZones.forEach(zone => {
                        zone.classList.remove('drag-over', 'drag-over-valid');
                    });
                    
                    if (ghostElement) {
                        ghostElement.style.transition = 'all 0.2s ease';
                        ghostElement.style.opacity = '0';
                        ghostElement.style.transform = 'scale(0.5)';
                        setTimeout(() => {
                            if (ghostElement) ghostElement.remove();
                            ghostElement = null;
                        }, 200);
                    }
                    
                    draggedElement = null;
                    draggedData = null;
                }
            });

            root.addEventListener('dragover', function(e) {
                const dropZone = e.target.closest('.field-drop-zone');
                if (dropZone && draggedElement) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';

                    const acceptedTypes = dropZone.dataset.acceptedTypes ? 
                        JSON.parse(dropZone.dataset.acceptedTypes) : null;
                    const fieldType = draggedData ? draggedData.fieldType : null;

                    dropZone.classList.add('drag-over');
                    if (!acceptedTypes || !fieldType || acceptedTypes.includes(fieldType)) {
                        dropZone.classList.add('drag-over-valid');
                    }
                }
            });

            root.addEventListener('dragleave', function(e) {
                const dropZone = e.target.closest('.field-drop-zone');
                if (dropZone) {
                    const rect = dropZone.getBoundingClientRect();
                    const x = e.clientX;
                    const y = e.clientY;
                    
                    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                        dropZone.classList.remove('drag-over', 'drag-over-valid');
                    }
                }
            });

            root.addEventListener('drop', function(e) {
                const dropZone = e.target.closest('.field-drop-zone');
                if (dropZone && draggedElement) {
                    e.preventDefault();
                    e.stopPropagation();

                    const dropZoneId = dropZone.dataset.zoneId;
                    const acceptedTypes = dropZone.dataset.acceptedTypes ? 
                        JSON.parse(dropZone.dataset.acceptedTypes) : null;
                    const fieldType = draggedData ? draggedData.fieldType : null;
                    const isMulti = dropZone.dataset.multi === 'true';

                    if (!acceptedTypes || !fieldType || acceptedTypes.includes(fieldType)) {
                        const fieldData = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
                        const existingFields = Array.from(dropZone.querySelectorAll('.field-tag'));
                        const fieldExists = existingFields.some(tag => {
                            const data = JSON.parse(tag.dataset.fieldData || '{}');
                            return data.fieldName === fieldData.fieldName;
                        });

                        if (!fieldExists) {
                            window.StreamlitDragDrop.addFieldToZone(dropZone, fieldData, isMulti);
                            window.StreamlitDragDrop.syncZoneToSession(dropZoneId, dropZone);
                            
                            dropZone.classList.add('drop-success');
                            setTimeout(() => dropZone.classList.remove('drop-success'), 400);
                            
                            window.StreamlitDragDrop.showSuccessToast(
                                `已添加 \"${fieldData.fieldName}\"`,
                                root
                            );
                        }
                    } else {
                        dropZone.classList.add('invalid-drop');
                        setTimeout(() => dropZone.classList.remove('invalid-drop'), 300);
                    }

                    dropZone.classList.remove('drag-over', 'drag-over-valid');
                }
            });

            root.addEventListener('click', function(e) {
                if (e.target.classList.contains('remove-field-tag')) {
                    e.stopPropagation();
                    const tagEl = e.target.closest('.field-tag');
                    const dropZone = e.target.closest('.field-drop-zone');
                    const dropZoneId = dropZone.dataset.zoneId;
                    
                    if (tagEl) {
                        tagEl.classList.add('field-exit');
                        setTimeout(() => {
                            tagEl.remove();
                            window.StreamlitDragDrop.updateZonePlaceholder(dropZone);
                            window.StreamlitDragDrop.syncZoneToSession(dropZoneId, dropZone);
                        }, 200);
                    }
                }
            });
        },

        addFieldToZone: function(dropZone, fieldData, isMulti) {
            const fieldsContainer = dropZone.querySelector('.zone-fields-container');
            if (!fieldsContainer) return;

            if (!isMulti) {
                fieldsContainer.innerHTML = '';
            }

            const existingFields = Array.from(fieldsContainer.querySelectorAll('.field-tag'));
            const fieldExists = existingFields.some(tag => {
                const data = JSON.parse(tag.dataset.fieldData || '{}');
                return data.fieldName === fieldData.fieldName;
            });

            if (fieldExists) return;

            const typeColors = {
                'numeric': '#3b82f6',
                'categorical': '#f97316',
                'datetime': '#10b981',
                'geographic': '#8b5cf6',
                'text': '#f59e0b',
                'boolean': '#06b6d4',
                'unknown': '#9ca3af'
            };
            const typeIcons = {
                'numeric': '📊',
                'categorical': '🏷️',
                'datetime': '📅',
                'geographic': '🗺️',
                'text': '📝',
                'boolean': '✅',
                'unknown': '❓'
            };

            const color = typeColors[fieldData.fieldType] || '#9ca3af';
            const icon = typeIcons[fieldData.fieldType] || '❓';

            const tagEl = document.createElement('div');
            tagEl.className = 'field-tag field-enter';
            tagEl.dataset.fieldData = JSON.stringify(fieldData);
            tagEl.innerHTML = `
                <span class="tag-icon" style="background-color: ${color}">${icon}</span>
                <span class="tag-name">${this.escapeHtml(fieldData.fieldName)}</span>
                <span class="remove-field-tag" title="移除">×</span>
            `;

            fieldsContainer.appendChild(tagEl);
            this.updateZonePlaceholder(dropZone);
        },

        updateZonePlaceholder: function(dropZone) {
            const fieldsContainer = dropZone.querySelector('.zone-fields-container');
            const placeholder = dropZone.querySelector('.zone-placeholder');
            if (!fieldsContainer || !placeholder) return;

            const hasFields = fieldsContainer.children.length > 0;
            placeholder.style.display = hasFields ? 'none' : 'flex';
        },

        syncZoneToSession: function(zoneId, dropZone) {
            const fieldsContainer = dropZone.querySelector('.zone-fields-container');
            if (!fieldsContainer) return;

            const fieldNames = Array.from(fieldsContainer.querySelectorAll('.field-tag')).map(tag => {
                const data = JSON.parse(tag.dataset.fieldData || '{}');
                return data.fieldName;
            });

            const syncEvent = new CustomEvent('dragdrop_sync', {
                detail: { zoneId: zoneId, values: fieldNames }
            });
            document.dispatchEvent(syncEvent);

            if (window.StreamlitDragDropSyncCallbacks) {
                const callback = window.StreamlitDragDropSyncCallbacks[zoneId];
                if (callback) {
                    callback(fieldNames);
                }
            }
        },

        setZoneValues: function(zoneId, fieldNames, allColumns) {
            const root = window.parent.document;
            const dropZone = root.querySelector(`[data-zone-id="${zoneId}"]`);
            if (!dropZone) return;

            const fieldsContainer = dropZone.querySelector('.zone-fields-container');
            if (!fieldsContainer) return;

            fieldsContainer.innerHTML = '';
            const isMulti = dropZone.dataset.multi === 'true';

            fieldNames.forEach(name => {
                const colData = allColumns.find(c => c.name === name);
                if (colData) {
                    this.addFieldToZone(dropZone, colData, isMulti);
                }
            });
        },

        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        observeNewElements: function(root) {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.classList && node.classList.contains('field-drop-zone')) {
                                this.updateZonePlaceholder(node);
                            }
                            const dropZones = node.querySelectorAll ? node.querySelectorAll('.field-drop-zone') : [];
                            dropZones.forEach(zone => this.updateZonePlaceholder(zone));
                        }
                    });
                });
            });

            observer.observe(root, { childList: true, subtree: true });
        },

        registerSyncCallback: function(zoneId, callback) {
            if (!window.StreamlitDragDropSyncCallbacks) {
                window.StreamlitDragDropSyncCallbacks = {};
            }
            window.StreamlitDragDropSyncCallbacks[zoneId] = callback;
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.StreamlitDragDrop.init();
        });
    } else {
        window.StreamlitDragDrop.init();
    }
})();
"""

DRAG_AND_DROP_CSS = """
<style>
.draggable-field-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    margin: 6px 0;
    background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    cursor: grab;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    position: relative;
    overflow: hidden;
}

.draggable-field-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 3px;
    background: linear-gradient(180deg, #3b82f6, #8b5cf6);
    transform: scaleY(0);
    transition: transform 0.25s ease;
}

.draggable-field-item:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
    transform: translateY(-3px) scale(1.02);
}

.draggable-field-item:hover::before {
    transform: scaleY(1);
}

.draggable-field-item.dragging-active {
    opacity: 0.5;
    cursor: grabbing;
    transform: scale(0.95);
    border-style: dashed;
}

.field-item-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.field-item-name {
    flex: 1;
    font-weight: 600;
    color: #1f2937;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.field-item-type {
    font-size: 11px;
    font-weight: 500;
    color: #4b5563;
    background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
    padding: 3px 8px;
    border-radius: 6px;
    flex-shrink: 0;
    border: 1px solid #d1d5db;
}

.fields-list-title {
    font-size: 15px;
    font-weight: 700;
    color: #1e3a5f;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid #e5e7eb;
    display: flex;
    align-items: center;
    gap: 8px;
}

.fields-scroll-container {
    max-height: 480px;
    overflow-y: auto;
    padding-right: 10px;
    scrollbar-width: thin;
    scrollbar-color: #d1d5db #f3f4f6;
}

.fields-scroll-container::-webkit-scrollbar {
    width: 8px;
}

.fields-scroll-container::-webkit-scrollbar-track {
    background: #f3f4f6;
    border-radius: 4px;
}

.fields-scroll-container::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #d1d5db, #9ca3af);
    border-radius: 4px;
    transition: background 0.2s ease;
}

.fields-scroll-container::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #9ca3af, #6b7280);
}

.field-drop-zone {
    min-height: 90px;
    padding: 16px;
    border: 2px dashed #d1d5db;
    border-radius: 14px;
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    margin-bottom: 12px;
    overflow: hidden;
}

.field-drop-zone::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, transparent 0%, rgba(255,255,255,0.5) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
}

.field-drop-zone:hover {
    border-color: #9ca3af;
    background: linear-gradient(135deg, #f5f5f5 0%, #f0f0f0 100%);
}

.field-drop-zone:hover::before {
    opacity: 1;
}

.field-drop-zone.drag-over {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border-style: solid;
    transform: scale(1.01);
}

.field-drop-zone.drag-over.drag-over-valid {
    border-color: #10b981;
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
}

.zone-title {
    font-size: 14px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.zone-fields-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 36px;
    align-items: flex-start;
}

.zone-placeholder {
    color: #9ca3af;
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    padding: 20px 12px;
    font-style: italic;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: 6px;
}

.field-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px 6px 10px;
    background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    max-width: 100%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.field-tag:hover {
    border-color: #ef4444;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
    transform: translateY(-2px);
}

.tag-icon {
    width: 20px;
    height: 20px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.tag-name {
    font-size: 13px;
    font-weight: 600;
    color: #1f2937;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.remove-field-tag {
    width: 20px;
    height: 20px;
    border: none;
    background: linear-gradient(135deg, #fee2e2, #fecaca);
    color: #dc2626;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.remove-field-tag:hover {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    transform: scale(1.1) rotate(90deg);
}

.drag-instruction {
    font-size: 12px;
    color: #4b5563;
    text-align: center;
    margin-top: 12px;
    padding: 10px 12px;
    background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
    border-radius: 8px;
    font-weight: 500;
    border: 1px dashed #d1d5db;
}

.quick-add-container {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
}

.quick-add-label {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 8px;
    font-weight: 500;
}

.dragging-ghost {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
"""


def init_drag_and_drop():
    """初始化拖拽功能，注入JavaScript和CSS"""
    components.html(f"""
        {DRAG_AND_DROP_CSS}
        <script>{DRAG_AND_DROP_JS}</script>
    """, height=0)


def render_draggable_field(field_name: str, field_type: str) -> str:
    """渲染可拖拽的字段元素"""
    drag_data = {'fieldName': field_name, 'fieldType': field_type}
    
    type_colors = {
        'numeric': '#3b82f6',
        'categorical': '#f97316',
        'datetime': '#10b981',
        'geographic': '#8b5cf6',
        'text': '#f59e0b',
        'boolean': '#06b6d4',
        'unknown': '#9ca3af'
    }
    type_icons = {
        'numeric': '📊',
        'categorical': '🏷️',
        'datetime': '📅',
        'geographic': '🗺️',
        'text': '📝',
        'boolean': '✅',
        'unknown': '❓'
    }
    type_labels = {
        'numeric': '数值',
        'categorical': '分类',
        'datetime': '时间',
        'geographic': '地理',
        'text': '文本',
        'boolean': '布尔',
        'unknown': '未知'
    }
    
    color = type_colors.get(field_type, '#9ca3af')
    icon = type_icons.get(field_type, '❓')
    label = type_labels.get(field_type, '未知')
    
    return f"""
    <div class="draggable-field-item" 
         draggable="true" 
         data-drag-data='{json.dumps(drag_data, ensure_ascii=False)}'>
        <span class="field-item-icon" style="background-color: {color}">{icon}</span>
        <span class="field-item-name">{field_name}</span>
        <span class="field-item-type">{label}</span>
    </div>
    """


def render_columns_list(columns: list, title: str = "可用字段") -> str:
    """渲染可拖拽的字段列表"""
    fields_html = ''.join([
        render_draggable_field(c['name'], c['type'])
        for c in columns
    ])
    
    return f"""
    <div>
        <div class="fields-list-title">📋 {title}</div>
        <div class="fields-scroll-container">
            {fields_html if fields_html else '<div style="color: #9ca3af; text-align: center; padding: 20px; font-style: italic;">无可用字段</div>'}
        </div>
        <div class="drag-instruction">💡 拖拽字段到右侧区域，或使用下方快速添加按钮</div>
    </div>
    """


def render_drop_zone(
    zone_id: str,
    title: str,
    icon: str = "📌",
    accepted_types: list = None,
    multi: bool = False,
    current_values: list = None,
    all_columns: list = None
) -> str:
    """渲染放置区域"""
    accepted_types_json = json.dumps(accepted_types) if accepted_types else 'null'
    current_values = current_values or []
    all_columns = all_columns or []
    
    type_labels = {
        'numeric': '数值型',
        'categorical': '分类型',
        'datetime': '时间型',
        'geographic': '地理型',
        'text': '文本型',
        'boolean': '布尔型'
    }
    
    if accepted_types:
        labels = [type_labels.get(t, t) for t in accepted_types]
        placeholder = f"🎯 拖拽{'/'.join(labels)}字段到此处"
    else:
        placeholder = "🎯 拖拽字段到此处"
    
    if multi:
        title_suffix = " (可多选)"
    else:
        title_suffix = ""
    
    fields_html = ''
    type_colors = {
        'numeric': '#3b82f6',
        'categorical': '#f97316',
        'datetime': '#10b981',
        'geographic': '#8b5cf6',
        'text': '#f59e0b',
        'boolean': '#06b6d4',
        'unknown': '#9ca3af'
    }
    type_icons = {
        'numeric': '📊',
        'categorical': '🏷️',
        'datetime': '📅',
        'geographic': '🗺️',
        'text': '📝',
        'boolean': '✅',
        'unknown': '❓'
    }
    
    for field_name in current_values:
        col_data = next((c for c in all_columns if c['name'] == field_name), None)
        if col_data:
            color = type_colors.get(col_data['type'], '#9ca3af')
            icon_tag = type_icons.get(col_data['type'], '❓')
            field_data = {'fieldName': field_name, 'fieldType': col_data['type']}
            fields_html += f"""
            <div class="field-tag" data-field-data='{json.dumps(field_data, ensure_ascii=False)}'>
                <span class="tag-icon" style="background-color: {color}">{icon_tag}</span>
                <span class="tag-name">{field_name}</span>
                <span class="remove-field-tag" title="移除">×</span>
            </div>
            """
    
    return f"""
    <div class="field-drop-zone" 
         data-zone-id="{zone_id}"
         data-accepted-types='{accepted_types_json}'
         data-multi="{'true' if multi else 'false'}">
        <div class="zone-title">
            <span>{icon}</span>
            {title}{title_suffix}
        </div>
        <div class="zone-fields-container">
            {fields_html}
        </div>
        <div class="zone-placeholder">{placeholder}</div>
    </div>
    """


def setup_drop_zone(
    zone_id: str,
    session_key: str,
    title: str,
    icon: str = "📌",
    accepted_types: list = None,
    multi: bool = False,
    all_columns: list = None
) -> list:
    """
    使用Streamlit会话状态管理放置区域的值
    
    Returns:
        当前已放置的字段名称列表
    """
    if session_key not in st.session_state:
        st.session_state[session_key] = []
    
    drop_zone_html = render_drop_zone(
        zone_id=zone_id,
        title=title,
        icon=icon,
        accepted_types=accepted_types,
        multi=multi,
        current_values=st.session_state[session_key],
        all_columns=all_columns
    )
    
    st.markdown(drop_zone_html, unsafe_allow_html=True)
    
    quick_add_key = f"quick_add_{zone_id}"
    available_options = [''] + [
        c['name'] for c in (all_columns or [])
        if c['name'] not in st.session_state[session_key]
        and (not accepted_types or c['type'] in accepted_types)
    ]
    
    if len(available_options) > 1:
        with st.container():
            st.markdown('<div class="quick-add-container">', unsafe_allow_html=True)
            st.markdown('<div class="quick-add-label">⚡ 或快速添加：</div>', unsafe_allow_html=True)
            
            cols = st.columns([3, 1])
            with cols[0]:
                selected = st.selectbox(
                    f"快速添加 - {title}",
                    options=available_options,
                    key=f"select_{quick_add_key}",
                    label_visibility="collapsed"
                )
            with cols[1]:
                if st.button("➕", key=f"btn_{quick_add_key}", use_container_width=True):
                    if selected:
                        if multi:
                            if selected not in st.session_state[session_key]:
                                st.session_state[session_key].append(selected)
                        else:
                            st.session_state[session_key] = [selected]
                        st.rerun()
            
            st.markdown('</div>', unsafe_allow_html=True)
    
    return st.session_state.get(session_key, [])


def render_drag_and_drop_interface(
    columns: list,
    drop_zones: list,
    session_prefix: str = "dd"
) -> dict:
    """
    渲染完整的拖拽配置界面（左侧字段列表 + 右侧多个放置区域）
    
    Args:
        columns: 可用字段列表 [{'name': str, 'type': str}]
        drop_zones: 放置区域配置列表，每个区域包含：
            - id: 唯一标识
            - title: 标题
            - icon: 图标
            - accepted_types: 接受的字段类型列表
            - multi: 是否支持多个字段
        session_prefix: 会话状态前缀
    
    Returns:
        各区域当前值的字典 {zone_id: [field_names]}
    """
    init_drag_and_drop()
    
    results = {}
    
    col1, col2 = st.columns([1, 1.5])
    
    with col1:
        columns_html = render_columns_list(columns)
        st.markdown(columns_html, unsafe_allow_html=True)
    
    with col2:
        for zone in drop_zones:
            zone_id = zone['id']
            session_key = zone.get('session_key', f"{session_prefix}_{zone_id}")
            
            current_value = setup_drop_zone(
                zone_id=zone_id,
                session_key=session_key,
                title=zone['title'],
                icon=zone.get('icon', '📌'),
                accepted_types=zone.get('accepted_types'),
                multi=zone.get('multi', False),
                all_columns=columns
            )
            
            results[zone_id] = current_value
            st.markdown("<br>", unsafe_allow_html=True)
    
    return results
