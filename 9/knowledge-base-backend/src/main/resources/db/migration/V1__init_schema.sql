-- =============================================
-- 知识库管理系统 - 数据库初始化脚本
-- 数据库: PostgreSQL
-- 版本: V1
-- 描述: 初始化数据库表结构和基础数据
-- =============================================

-- 扩展插件
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 部门表
-- =============================================
CREATE TABLE IF NOT EXISTS sys_department (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    parent_id BIGINT,
    leader_id BIGINT,
    sort_order INT DEFAULT 0,
    description VARCHAR(500),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_department_parent ON sys_department(parent_id);
CREATE INDEX IF NOT EXISTS idx_department_code ON sys_department(code);

-- =============================================
-- 用户表
-- =============================================
CREATE TABLE IF NOT EXISTS sys_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    real_name VARCHAR(50),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    avatar VARCHAR(500),
    department_id BIGINT,
    position VARCHAR(50),
    pinyin VARCHAR(100),
    first_letter VARCHAR(50),
    last_login_time TIMESTAMP,
    last_login_ip VARCHAR(50),
    login_count INT DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    ldap_dn VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT,
    FOREIGN KEY (department_id) REFERENCES sys_department(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_username ON sys_user(username);
CREATE INDEX IF NOT EXISTS idx_user_email ON sys_user(email);
CREATE INDEX IF NOT EXISTS idx_user_department ON sys_user(department_id);
CREATE INDEX IF NOT EXISTS idx_user_pinyin ON sys_user(pinyin);
CREATE INDEX IF NOT EXISTS idx_user_first_letter ON sys_user(first_letter);

-- =============================================
-- 权限表
-- =============================================
CREATE TABLE IF NOT EXISTS sys_permission (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL,
    parent_id BIGINT,
    path VARCHAR(500),
    component VARCHAR(255),
    icon VARCHAR(100),
    sort_order INT DEFAULT 0,
    description VARCHAR(500),
    enabled BOOLEAN DEFAULT TRUE,
    api_method VARCHAR(10),
    api_path VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_permission_parent ON sys_permission(parent_id);
CREATE INDEX IF NOT EXISTS idx_permission_code ON sys_permission(code);
CREATE INDEX IF NOT EXISTS idx_permission_type ON sys_permission(type);

-- =============================================
-- API Token表
-- =============================================
CREATE TABLE IF NOT EXISTS sys_api_token (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    user_name VARCHAR(50),
    expire_at TIMESTAMP,
    last_used_at TIMESTAMP,
    usage_count BIGINT DEFAULT 0,
    ip_whitelist VARCHAR(1000),
    permissions VARCHAR(2000),
    enabled BOOLEAN DEFAULT TRUE,
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_api_token_token ON sys_api_token(token);
CREATE INDEX IF NOT EXISTS idx_api_token_user ON sys_api_token(user_id);

-- =============================================
-- 操作日志表
-- =============================================
CREATE TABLE IF NOT EXISTS sys_operation_log (
    id BIGSERIAL PRIMARY KEY,
    module VARCHAR(50),
    operation_type VARCHAR(20),
    description VARCHAR(500),
    user_id BIGINT NOT NULL,
    user_name VARCHAR(50),
    department_id BIGINT,
    department_name VARCHAR(100),
    request_method VARCHAR(10),
    request_url VARCHAR(500),
    request_params TEXT,
    response_result TEXT,
    ip_address VARCHAR(50),
    ip_location VARCHAR(100),
    user_agent VARCHAR(500),
    browser VARCHAR(100),
    os VARCHAR(100),
    operation_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cost_time BIGINT DEFAULT 0,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_operation_log_user ON sys_operation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_log_module ON sys_operation_log(module);
CREATE INDEX IF NOT EXISTS idx_operation_log_time ON sys_operation_log(operation_time);
CREATE INDEX IF NOT EXISTS idx_operation_log_ip ON sys_operation_log(ip_address);

-- =============================================
-- 文档标签表
-- =============================================
CREATE TABLE IF NOT EXISTS doc_document_tag (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    pinyin VARCHAR(100),
    first_letter VARCHAR(50),
    color VARCHAR(20),
    sort_order INT DEFAULT 0,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_tag_name ON doc_document_tag(name);
CREATE INDEX IF NOT EXISTS idx_tag_pinyin ON doc_document_tag(pinyin);
CREATE INDEX IF NOT EXISTS idx_tag_first_letter ON doc_document_tag(first_letter);

-- =============================================
-- 文档表
-- =============================================
CREATE TABLE IF NOT EXISTS doc_document (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(1000),
    content TEXT,
    content_html TEXT,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size BIGINT DEFAULT 0,
    file_type VARCHAR(20),
    mime_type VARCHAR(100),
    file_hash VARCHAR(64),
    version INT DEFAULT 1,
    status VARCHAR(20) NOT NULL,
    category_id BIGINT,
    tags VARCHAR(500),
    is_template BOOLEAN DEFAULT FALSE,
    is_encrypted BOOLEAN DEFAULT FALSE,
    password VARCHAR(100),
    watermark_text VARCHAR(200),
    enable_watermark BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by BIGINT,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_by BIGINT,
    locked_at TIMESTAMP,
    view_count BIGINT DEFAULT 0,
    download_count BIGINT DEFAULT 0,
    like_count INT DEFAULT 0,
    favorite_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    pinyin VARCHAR(200),
    first_letter VARCHAR(100),
    published_at TIMESTAMP,
    expire_at TIMESTAMP,
    approval_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_document_title ON doc_document(title);
CREATE INDEX IF NOT EXISTS idx_document_status ON doc_document(status);
CREATE INDEX IF NOT EXISTS idx_document_created_by ON doc_document(created_by);
CREATE INDEX IF NOT EXISTS idx_document_category ON doc_document(category_id);
CREATE INDEX IF NOT EXISTS idx_document_pinyin ON doc_document(pinyin);
CREATE INDEX IF NOT EXISTS idx_document_first_letter ON doc_document(first_letter);
CREATE INDEX IF NOT EXISTS idx_document_created_at ON doc_document(created_at);
CREATE INDEX IF NOT EXISTS idx_document_view_count ON doc_document(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_document_is_deleted ON doc_document(is_deleted);
CREATE INDEX IF NOT EXISTS idx_document_approval ON doc_document(approval_id);

-- =============================================
-- 文档版本表
-- =============================================
CREATE TABLE IF NOT EXISTS doc_document_version (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(1000),
    content TEXT,
    content_html TEXT,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size BIGINT DEFAULT 0,
    file_type VARCHAR(20),
    file_hash VARCHAR(64),
    status VARCHAR(20),
    change_log VARCHAR(1000),
    is_major BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT,
    FOREIGN KEY (document_id) REFERENCES doc_document(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_version_document ON doc_document_version(document_id);
CREATE INDEX IF NOT EXISTS idx_version_doc_ver ON doc_document_version(document_id, version);
CREATE UNIQUE INDEX IF NOT EXISTS uk_doc_version ON doc_document_version(document_id, version);

-- =============================================
-- 文档关联表
-- =============================================
CREATE TABLE IF NOT EXISTS doc_document_link (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    linked_document_id BIGINT NOT NULL,
    link_type VARCHAR(50),
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT,
    FOREIGN KEY (document_id) REFERENCES doc_document(id) ON DELETE CASCADE,
    FOREIGN KEY (linked_document_id) REFERENCES doc_document(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_link_document ON doc_document_link(document_id);
CREATE INDEX IF NOT EXISTS idx_linked_document ON doc_document_link(linked_document_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_doc_link ON doc_document_link(document_id, linked_document_id);

-- =============================================
-- 文档模板表
-- =============================================
CREATE TABLE IF NOT EXISTS doc_document_template (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(1000),
    content TEXT,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size BIGINT DEFAULT 0,
    file_type VARCHAR(20),
    category_id BIGINT,
    thumbnail VARCHAR(500),
    usage_count INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_template_category ON doc_document_template(category_id);
CREATE INDEX IF NOT EXISTS idx_template_enabled ON doc_document_template(enabled);

-- =============================================
-- 文档点赞表
-- =============================================
CREATE TABLE IF NOT EXISTS doc_document_like (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    user_name VARCHAR(50),
    uk_doc_user VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT,
    FOREIGN KEY (document_id) REFERENCES doc_document(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_like_document ON doc_document_like(document_id);
CREATE INDEX IF NOT EXISTS idx_like_user ON doc_document_like(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_like_doc_user ON doc_document_like(document_id, user_id);

-- =============================================
-- 文档收藏表
-- =============================================
CREATE TABLE IF NOT EXISTS doc_document_favorite (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    document_title VARCHAR(200),
    user_id BIGINT NOT NULL,
    folder_id BIGINT,
    remarks VARCHAR(500),
    uk_doc_user VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT,
    FOREIGN KEY (document_id) REFERENCES doc_document(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_favorite_document ON doc_document_favorite(document_id);
CREATE INDEX IF NOT EXISTS idx_favorite_user ON doc_document_favorite(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_folder ON doc_document_favorite(folder_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_favorite_doc_user ON doc_document_favorite(document_id, user_id);

-- =============================================
-- 审批表
-- =============================================
CREATE TABLE IF NOT EXISTS ap_approval (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    document_title VARCHAR(200),
    process_instance_id VARCHAR(64),
    process_definition_key VARCHAR(64),
    status VARCHAR(20) NOT NULL,
    applicant_id BIGINT NOT NULL,
    applicant_name VARCHAR(50),
    current_node_id VARCHAR(64),
    current_node_name VARCHAR(100),
    current_approver_id BIGINT,
    current_approver_name VARCHAR(50),
    apply_reason VARCHAR(1000),
    submitted_at TIMESTAMP,
    completed_at TIMESTAMP,
    timeout_at TIMESTAMP,
    is_timeout BOOLEAN DEFAULT FALSE,
    priority INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_approval_document ON ap_approval(document_id);
CREATE INDEX IF NOT EXISTS idx_approval_applicant ON ap_approval(applicant_id);
CREATE INDEX IF NOT EXISTS idx_approval_approver ON ap_approval(current_approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_status ON ap_approval(status);
CREATE INDEX IF NOT EXISTS idx_approval_process ON ap_approval(process_instance_id);
CREATE INDEX IF NOT EXISTS idx_approval_submitted ON ap_approval(submitted_at);

-- =============================================
-- 审批节点表
-- =============================================
CREATE TABLE IF NOT EXISTS ap_approval_node (
    id BIGSERIAL PRIMARY KEY,
    approval_id BIGINT NOT NULL,
    node_id VARCHAR(64),
    node_name VARCHAR(100),
    node_type VARCHAR(20),
    approver_id BIGINT,
    approver_name VARCHAR(50),
    approver_type VARCHAR(20),
    sort_order INT DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    status VARCHAR(20),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT,
    FOREIGN KEY (approval_id) REFERENCES ap_approval(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_node_approval ON ap_approval_node(approval_id);
CREATE INDEX IF NOT EXISTS idx_node_approver ON ap_approval_node(approver_id);
CREATE INDEX IF NOT EXISTS idx_node_sort ON ap_approval_node(approval_id, sort_order);

-- =============================================
-- 审批记录表
-- =============================================
CREATE TABLE IF NOT EXISTS ap_approval_record (
    id BIGSERIAL PRIMARY KEY,
    approval_id BIGINT NOT NULL,
    node_id VARCHAR(64),
    node_name VARCHAR(100),
    approver_id BIGINT NOT NULL,
    approver_name VARCHAR(50),
    action VARCHAR(20),
    comment VARCHAR(2000),
    sign_image VARCHAR(500),
    processed_at TIMESTAMP,
    duration BIGINT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT,
    FOREIGN KEY (approval_id) REFERENCES ap_approval(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_record_approval ON ap_approval_record(approval_id);
CREATE INDEX IF NOT EXISTS idx_record_approver ON ap_approval_record(approver_id);
CREATE INDEX IF NOT EXISTS idx_record_processed ON ap_approval_record(processed_at);

-- =============================================
-- 评论表
-- =============================================
CREATE TABLE IF NOT EXISTS cm_comment (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    parent_id BIGINT,
    user_id BIGINT NOT NULL,
    user_name VARCHAR(50),
    user_avatar VARCHAR(500),
    content TEXT NOT NULL,
    attachments VARCHAR(2000),
    like_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    is_approved BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_comment_document ON cm_comment(document_id);
CREATE INDEX IF NOT EXISTS idx_comment_parent ON cm_comment(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_user ON cm_comment(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_created ON cm_comment(created_at);

-- =============================================
-- 评论@表
-- =============================================
CREATE TABLE IF NOT EXISTS cm_comment_mention (
    id BIGSERIAL PRIMARY KEY,
    comment_id BIGINT NOT NULL,
    mentioned_user_id BIGINT NOT NULL,
    mentioned_user_name VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_mention_comment ON cm_comment_mention(comment_id);
CREATE INDEX IF NOT EXISTS idx_mention_user ON cm_comment_mention(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mention_read ON cm_comment_mention(mentioned_user_id, is_read);

-- =============================================
-- 热搜榜表
-- =============================================
CREATE TABLE IF NOT EXISTS st_hot_ranking (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    document_title VARCHAR(200),
    ranking_type VARCHAR(50) NOT NULL,
    ranking_date DATE NOT NULL,
    view_count BIGINT DEFAULT 0,
    download_count BIGINT DEFAULT 0,
    like_count INT DEFAULT 0,
    favorite_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    score DOUBLE PRECISION DEFAULT 0,
    rank_position INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_at TIMESTAMP,
    updated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_ranking_type_date ON st_hot_ranking(ranking_type, ranking_date);
CREATE INDEX IF NOT EXISTS idx_ranking_score ON st_hot_ranking(ranking_type, ranking_date, score DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ranking_doc_type_date ON st_hot_ranking(document_id, ranking_type, ranking_date);

-- =============================================
-- 初始化数据
-- =============================================

-- 初始化部门数据
INSERT INTO sys_department (name, code, parent_id, sort_order, description, enabled, created_at)
VALUES
('总公司', 'HQ', NULL, 1, '公司总部', TRUE, CURRENT_TIMESTAMP),
('技术部', 'TECH', 1, 1, '技术研发部门', TRUE, CURRENT_TIMESTAMP),
('产品部', 'PROD', 1, 2, '产品设计部门', TRUE, CURRENT_TIMESTAMP),
('运营部', 'OPS', 1, 3, '运营管理部门', TRUE, CURRENT_TIMESTAMP),
('市场部', 'MARKET', 1, 4, '市场营销部门', TRUE, CURRENT_TIMESTAMP),
('人力资源部', 'HR', 1, 5, '人力资源管理', TRUE, CURRENT_TIMESTAMP),
('财务部', 'FIN', 1, 6, '财务管理部门', TRUE, CURRENT_TIMESTAMP),
('行政部', 'ADMIN', 1, 7, '行政管理部门', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 初始化用户数据 (密码: admin123, 使用BCrypt加密)
INSERT INTO sys_user (username, password, real_name, email, phone, department_id, position, pinyin, first_letter, enabled, is_admin, created_at)
VALUES
('admin', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '系统管理员', 'admin@company.com', '13800138000', 1, '系统管理员', 'xitongguanliyuan', 'XTGLY', TRUE, TRUE, CURRENT_TIMESTAMP),
('zhangsan', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '张三', 'zhangsan@company.com', '13800138001', 2, '高级工程师', 'zhangsan', 'ZSS', TRUE, FALSE, CURRENT_TIMESTAMP),
('lisi', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '李四', 'lisi@company.com', '13800138002', 2, '工程师', 'lisi', 'LS', TRUE, FALSE, CURRENT_TIMESTAMP),
('wangwu', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '王五', 'wangwu@company.com', '13800138003', 3, '产品经理', 'wangwu', 'WW', TRUE, FALSE, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- 初始化权限数据
INSERT INTO sys_permission (name, code, type, parent_id, path, component, icon, sort_order, description, enabled, created_at)
VALUES
('系统管理', 'system', 'menu', NULL, '/system', 'Layout', 'setting', 1, '系统管理菜单', TRUE, CURRENT_TIMESTAMP),
('用户管理', 'system:user', 'menu', 1, '/system/user', 'system/user/index', 'user', 1, '用户管理', TRUE, CURRENT_TIMESTAMP),
('部门管理', 'system:dept', 'menu', 1, '/system/dept', 'system/dept/index', 'tree', 2, '部门管理', TRUE, CURRENT_TIMESTAMP),
('角色管理', 'system:role', 'menu', 1, '/system/role', 'system/role/index', 'peoples', 3, '角色管理', TRUE, CURRENT_TIMESTAMP),
('权限管理', 'system:permission', 'menu', 1, '/system/permission', 'system/permission/index', 'lock', 4, '权限管理', TRUE, CURRENT_TIMESTAMP),
('用户列表', 'system:user:list', 'api', 2, NULL, NULL, NULL, 1, '查看用户列表', TRUE, CURRENT_TIMESTAMP),
('用户新增', 'system:user:add', 'api', 2, NULL, NULL, NULL, 2, '新增用户', TRUE, CURRENT_TIMESTAMP),
('用户编辑', 'system:user:edit', 'api', 2, NULL, NULL, NULL, 3, '编辑用户', TRUE, CURRENT_TIMESTAMP),
('用户删除', 'system:user:delete', 'api', 2, NULL, NULL, NULL, 4, '删除用户', TRUE, CURRENT_TIMESTAMP),

('文档管理', 'document', 'menu', NULL, '/document', 'Layout', 'document', 2, '文档管理菜单', TRUE, CURRENT_TIMESTAMP),
('文档列表', 'document:list', 'menu', 10, '/document/list', 'document/list/index', 'list', 1, '文档列表', TRUE, CURRENT_TIMESTAMP),
('文档新建', 'document:create', 'menu', 10, '/document/create', 'document/create/index', 'edit', 2, '新建文档', TRUE, CURRENT_TIMESTAMP),
('模板管理', 'document:template', 'menu', 10, '/document/template', 'document/template/index', 'template', 3, '模板管理', TRUE, CURRENT_TIMESTAMP),
('文档查看', 'document:view', 'api', 11, NULL, NULL, NULL, 1, '查看文档', TRUE, CURRENT_TIMESTAMP),
('文档创建', 'document:create:api', 'api', 12, NULL, NULL, NULL, 2, '创建文档', TRUE, CURRENT_TIMESTAMP),
('文档编辑', 'document:edit', 'api', 11, NULL, NULL, NULL, 3, '编辑文档', TRUE, CURRENT_TIMESTAMP),
('文档删除', 'document:delete', 'api', 11, NULL, NULL, NULL, 4, '删除文档', TRUE, CURRENT_TIMESTAMP),
('文档下载', 'document:download', 'api', 11, NULL, NULL, NULL, 5, '下载文档', TRUE, CURRENT_TIMESTAMP),

('审批管理', 'approval', 'menu', NULL, '/approval', 'Layout', 'check', 3, '审批管理菜单', TRUE, CURRENT_TIMESTAMP),
('待我审批', 'approval:todo', 'menu', 19, '/approval/todo', 'approval/todo/index', 'clock', 1, '待我审批', TRUE, CURRENT_TIMESTAMP),
('我发起的', 'approval:my', 'menu', 19, '/approval/my', 'approval/my/index', 'form', 2, '我发起的', TRUE, CURRENT_TIMESTAMP),
('已审批', 'approval:done', 'menu', 19, '/approval/done', 'approval/done/index', 'finished', 3, '已审批', TRUE, CURRENT_TIMESTAMP),
('审批通过', 'approval:pass', 'api', 20, NULL, NULL, NULL, 1, '审批通过', TRUE, CURRENT_TIMESTAMP),
('审批驳回', 'approval:reject', 'api', 20, NULL, NULL, NULL, 2, '审批驳回', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 初始化标签数据
INSERT INTO doc_document_tag (name, pinyin, first_letter, color, sort_order, usage_count, created_at)
VALUES
('技术文档', 'jishuwendang', 'JSWD', '#1890ff', 1, 0, CURRENT_TIMESTAMP),
('产品文档', 'chanpinwendang', 'CPWD', '#52c41a', 2, 0, CURRENT_TIMESTAMP),
('运营方案', 'yunyingfangan', 'YYFA', '#fa8c16', 3, 0, CURRENT_TIMESTAMP),
('合同协议', 'hetongxieyi', 'HTXY', '#f5222d', 4, 0, CURRENT_TIMESTAMP),
('培训资料', 'peixunziliao', 'PXZL', '#722ed1', 5, 0, CURRENT_TIMESTAMP),
('规章制度', 'guizhangzhidu', 'GZZD', '#13c2c2', 6, 0, CURRENT_TIMESTAMP),
('会议纪要', 'huiyijiyao', 'HYJY', '#eb2f96', 7, 0, CURRENT_TIMESTAMP),
('工作总结', 'gongzuozongjie', 'GZZJ', '#faad14', 8, 0, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- 初始化模板数据
INSERT INTO doc_document_template (name, description, content, category_id, usage_count, sort_order, enabled, is_public, created_at, created_by)
VALUES
('产品需求文档模板', '标准产品需求文档（PRD）模板，包含需求背景、功能描述、交互设计等内容', '<h1>产品需求文档</h1><h2>1. 需求背景</h2><p>...</p>', 1, 0, 1, TRUE, TRUE, CURRENT_TIMESTAMP, 1),
('技术方案设计模板', '技术方案设计文档模板，包含架构设计、数据库设计、接口设计等', '<h1>技术方案设计</h1><h2>1. 背景介绍</h2><p>...</p>', 1, 0, 2, TRUE, TRUE, CURRENT_TIMESTAMP, 1),
('会议纪要模板', '通用会议纪要模板，记录会议时间、参会人员、议题、决议等', '<h1>会议纪要</h1><p><strong>会议时间：</strong></p><p><strong>参会人员：</strong></p>', 2, 0, 3, TRUE, TRUE, CURRENT_TIMESTAMP, 1),
('项目周报模板', '项目周报模板，记录本周进展、下周计划、问题风险等', '<h1>项目周报</h1><h2>本周进展</h2><p>...</p>', 2, 0, 4, TRUE, TRUE, CURRENT_TIMESTAMP, 1),
('岗位说明书模板', '岗位说明书模板，包含岗位职责、任职要求、考核标准等', '<h1>岗位说明书</h1><h2>岗位名称：</h2><p>...</p>', 3, 0, 5, TRUE, TRUE, CURRENT_TIMESTAMP, 1)
ON CONFLICT (id) DO NOTHING;
