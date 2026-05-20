-- 抽奖系统数据库初始化脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS lottery DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE lottery;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    UNIQUE KEY idx_phone (phone),
    KEY idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 奖品表
CREATE TABLE IF NOT EXISTS prizes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT '',
    image_url VARCHAR(500) DEFAULT '',
    stock INT NOT NULL DEFAULT 0,
    probability DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    is_enabled TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    KEY idx_is_enabled (is_enabled),
    KEY idx_sort_order (sort_order),
    KEY idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 抽奖记录表
CREATE TABLE IF NOT EXISTS records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    user_phone VARCHAR(20) NOT NULL,
    prize_id BIGINT UNSIGNED NOT NULL,
    prize_name VARCHAR(100) NOT NULL,
    is_win TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    KEY idx_user_id (user_id),
    KEY idx_user_phone (user_phone),
    KEY idx_prize_id (prize_id),
    KEY idx_is_win (is_win),
    KEY idx_created_at (created_at),
    KEY idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 验证码表
CREATE TABLE IF NOT EXISTS sms_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    UNIQUE KEY idx_phone (phone),
    KEY idx_expires_at (expires_at),
    KEY idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化奖品数据
INSERT INTO prizes (name, description, image_url, stock, probability, is_enabled, sort_order) VALUES
('一等奖 iPhone 15', '最新款iPhone手机', 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=200', 1, 0.0100, 1, 1),
('二等奖 AirPods Pro', '苹果无线耳机', 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=200', 5, 0.0500, 1, 2),
('三等奖 100元优惠券', '全场通用优惠券', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200', 50, 0.1400, 1, 3),
('四等奖 10元优惠券', '满50可用', 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=200', 200, 0.3000, 1, 4),
('谢谢参与', '感谢您的参与', 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=200', 10000, 0.5000, 1, 5);
