//
//  CountdownWidgetView.swift
//  CountdownWidget
//
//  Widget views for small, medium, and large sizes
//

import WidgetKit
import SwiftUI

struct CountdownWidgetView: View {
    var entry: CountdownEntry
    
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        case .systemExtraLarge:
            LargeWidgetView(entry: entry)
        default:
            MediumWidgetView(entry: entry)
        }
    }
}

// MARK: - Small Widget

struct SmallWidgetView: View {
    var entry: CountdownEntry
    
    var body: some View {
        let theme = WidgetTheme(rawValue: entry.config?.theme ?? "colorful") ?? .colorful
        let bgColor = Color(hex: entry.event?.backgroundColor ?? "#6366F1")
        let textColor = theme.textColor(for: bgColor)
        
        ZStack {
            switch theme {
            case .light:
                Color.white
            case .dark:
                Color(UIColor.systemBackground)
            case .colorful:
                LinearGradient(
                    colors: [bgColor, bgColor.opacity(0.7)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            case .minimal:
                Color.clear
            }
            
            VStack(alignment: .center, spacing: 4) {
                if let event = entry.event {
                    // Category indicator
                    Circle()
                        .fill(Color(hex: event.categoryColor))
                        .frame(width: 8, height: 8)
                    
                    Spacer(minLength: 4)
                    
                    // Days
                    Text("\(abs(entry.timeRemaining.days))")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(textColor)
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                    
                    Text("天")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(textColor.opacity(0.7))
                    
                    Spacer(minLength: 4)
                    
                    // Event name
                    Text(event.name)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(textColor)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                        .minimumScaleFactor(0.8)
                } else {
                    Text("无事件")
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                }
            }
            .padding(8)
        }
    }
}

// MARK: - Medium Widget

struct MediumWidgetView: View {
    var entry: CountdownEntry
    
    var body: some View {
        let theme = WidgetTheme(rawValue: entry.config?.theme ?? "colorful") ?? .colorful
        let bgColor = Color(hex: entry.event?.backgroundColor ?? "#6366F1")
        let textColor = theme.textColor(for: bgColor)
        
        ZStack {
            switch theme {
            case .light:
                Color.white
            case .dark:
                Color(UIColor.systemBackground)
            case .colorful:
                LinearGradient(
                    colors: [bgColor, bgColor.opacity(0.8)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            case .minimal:
                Color.clear
            }
            
            HStack {
                if let event = entry.event {
                    VStack(alignment: .leading, spacing: 4) {
                        // Category
                        HStack(spacing: 4) {
                            Circle()
                                .fill(Color(hex: event.categoryColor))
                                .frame(width: 8, height: 8)
                            Text(event.categoryName)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(textColor.opacity(0.7))
                        }
                        
                        Spacer(minLength: 4)
                        
                        // Event name
                        Text(event.name)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(textColor)
                            .lineLimit(2)
                        
                        Spacer(minLength: 4)
                        
                        // Status
                        Text(entry.timeRemaining.isPast ? "已过去" : "距离还有")
                            .font(.system(size: 12))
                            .foregroundColor(textColor.opacity(0.7))
                        
                        // Time
                        Text(entry.timeRemaining.displayText)
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundColor(textColor)
                    }
                    
                    Spacer()
                    
                    // Days display
                    VStack(spacing: 2) {
                        Text("\(abs(entry.timeRemaining.days))")
                            .font(.system(size: 48, weight: .bold, design: .rounded))
                            .foregroundColor(textColor)
                            .minimumScaleFactor(0.5)
                            .lineLimit(1)
                        
                        Text("天")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(textColor.opacity(0.7))
                    }
                } else {
                    VStack {
                        Image(systemName: "calendar")
                            .font(.system(size: 32))
                            .foregroundColor(.gray)
                        Text("无事件")
                            .font(.system(size: 16))
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .padding(16)
        }
    }
}

// MARK: - Large Widget

struct LargeWidgetView: View {
    var entry: CountdownEntry
    
    var body: some View {
        let theme = WidgetTheme(rawValue: entry.config?.theme ?? "colorful") ?? .colorful
        let bgColor = Color(hex: entry.event?.backgroundColor ?? "#6366F1")
        let textColor = theme.textColor(for: bgColor)
        
        ZStack {
            switch theme {
            case .light:
                Color.white
            case .dark:
                Color(UIColor.systemBackground)
            case .colorful:
                LinearGradient(
                    colors: [bgColor, bgColor.opacity(0.8), bgColor.opacity(0.6)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            case .minimal:
                Color.clear
            }
            
            VStack(spacing: 16) {
                if let event = entry.event {
                    // Header
                    HStack {
                        Label(event.categoryName, systemImage: "tag")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(textColor.opacity(0.7))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color(hex: event.categoryColor).opacity(0.2))
                            .clipShape(Capsule())
                        
                        Spacer()
                        
                        if entry.timeRemaining.isPast {
                            Label("已过去", systemImage: "clock.badge.checkmark")
                                .font(.system(size: 12))
                                .foregroundColor(.orange)
                        }
                    }
                    
                    // Event name
                    Text(event.name)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(textColor)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                    
                    // Days
                    VStack(spacing: 4) {
                        Text("\(abs(entry.timeRemaining.days))")
                            .font(.system(size: 72, weight: .bold, design: .rounded))
                            .foregroundColor(textColor)
                            .minimumScaleFactor(0.5)
                            .lineLimit(1)
                        
                        Text("天")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(textColor.opacity(0.7))
                    }
                    .padding(.vertical, 8)
                    
                    // Time breakdown
                    HStack(spacing: 12) {
                        TimeUnitView(value: entry.timeRemaining.hours, label: "时", textColor: textColor)
                        TimeUnitView(value: entry.timeRemaining.minutes, label: "分", textColor: textColor)
                        TimeUnitView(value: entry.timeRemaining.seconds, label: "秒", textColor: textColor)
                    }
                    
                    Spacer(minLength: 8)
                    
                    // Target date
                    Text(formatDate(entry.event?.targetDate ?? 0))
                        .font(.system(size: 14))
                        .foregroundColor(textColor.opacity(0.6))
                    
                    // Repeat indicator
                    if event.repeatInterval != "none" {
                        HStack(spacing: 4) {
                            Image(systemName: "repeat")
                                .font(.system(size: 12))
                            Text(repeatLabel(for: event.repeatInterval))
                                .font(.system(size: 12))
                        }
                        .foregroundColor(textColor.opacity(0.5))
                    }
                } else {
                    VStack(spacing: 16) {
                        Image(systemName: "calendar.badge.plus")
                            .font(.system(size: 48))
                            .foregroundColor(.gray)
                        
                        Text("暂无倒计时事件")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.gray)
                        
                        Text("在倒计时App中添加事件以显示在这里")
                            .font(.system(size: 14))
                            .foregroundColor(.gray.opacity(0.8))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }
                }
            }
            .padding(20)
        }
    }
    
    private func formatDate(_ timestamp: TimeInterval) -> String {
        let date = Date(timeIntervalSince1970: timestamp)
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateStyle = .full
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    private func repeatLabel(for interval: String) -> String {
        switch interval {
        case "daily": return "每天重复"
        case "weekly": return "每周重复"
        case "monthly": return "每月重复"
        case "yearly": return "每年重复"
        default: return ""
        }
    }
}

// MARK: - Time Unit View

struct TimeUnitView: View {
    let value: Int
    let label: String
    let textColor: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(String(format: "%02d", abs(value)))
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundColor(textColor)
                .monospacedDigit()
            
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(textColor.opacity(0.6))
        }
        .frame(minWidth: 60)
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color.white.opacity(0.15))
        .cornerRadius(8)
    }
}

// MARK: - Widget Theme

enum WidgetTheme: String {
    case light
    case dark
    case colorful
    case minimal
    
    func textColor(for bgColor: Color) -> Color {
        switch self {
        case .light:
            return .primary
        case .dark:
            return .white
        case .colorful:
            return bgColor.contrastingTextColor
        case .minimal:
            return .primary
        }
    }
}
