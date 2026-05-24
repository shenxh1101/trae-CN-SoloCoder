//
//  CountdownLockWidgetView.swift
//  CountdownWidget
//
//  Lock screen widget views for iOS 16+
//

import WidgetKit
import SwiftUI

struct CountdownLockWidgetView: View {
    var entry: CountdownEntry
    
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .accessoryInline:
            InlineLockWidgetView(entry: entry)
        case .accessoryCircular:
            CircularLockWidgetView(entry: entry)
        case .accessoryRectangular:
            RectangularLockWidgetView(entry: entry)
        default:
            RectangularLockWidgetView(entry: entry)
        }
    }
}

// MARK: - Inline Widget (for lock screen top/bottom)

struct InlineLockWidgetView: View {
    var entry: CountdownEntry
    
    var body: some View {
        let theme = WidgetTheme(rawValue: entry.config?.theme ?? "colorful") ?? .colorful
        let accentColor = Color(hex: entry.event?.backgroundColor ?? "#6366F1")
        
        if let event = entry.event {
            HStack(spacing: 6) {
                Image(systemName: "timer")
                    .foregroundStyle(accentColor)
                
                Text("\(event.name): ")
                    .font(.system(size: 14, weight: .medium))
                
                if entry.timeRemaining.days > 0 {
                    Text("\(abs(entry.timeRemaining.days))天 \(String(format: "%02d", entry.timeRemaining.hours)):\(String(format: "%02d", entry.timeRemaining.minutes))")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(accentColor)
                        .monospacedDigit()
                } else {
                    Text("\(String(format: "%02d", entry.timeRemaining.hours)):\(String(format: "%02d", entry.timeRemaining.minutes)):\(String(format: "%02d", entry.timeRemaining.seconds))")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(accentColor)
                        .monospacedDigit()
                }
            }
            .widgetAccentable()
        } else {
            HStack(spacing: 6) {
                Image(systemName: "calendar")
                    .foregroundStyle(.gray)
                
                Text("暂无倒计时事件")
                    .font(.system(size: 14))
                    .foregroundStyle(.gray)
            }
        }
    }
}

// MARK: - Circular Widget (for lock screen circular widgets)

struct CircularLockWidgetView: View {
    var entry: CountdownEntry
    
    var body: some View {
        let accentColor = Color(hex: entry.event?.backgroundColor ?? "#6366F1")
        let totalDays = max(1, abs(entry.timeRemaining.days) + 1)
        let progress = min(1.0, Double(abs(entry.timeRemaining.days)) / Double(totalDays))
        
        ZStack {
            AccessoryWidgetBackground()
            
            if entry.event != nil {
                // Progress ring
                ZStack {
                    Circle()
                        .stroke(lineWidth: 3)
                        .opacity(0.3)
                    
                    Circle()
                        .trim(from: 0, to: CGFloat(progress))
                        .stroke(style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
                        .rotationEffect(Angle(degrees: -90))
                        .foregroundStyle(accentColor)
                        .animation(.linear(duration: 1), value: progress)
                    
                    // Center content
                    VStack(spacing: 0) {
                        Text("\(abs(entry.timeRemaining.days))")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundStyle(accentColor)
                            .minimumScaleFactor(0.6)
                        
                        Text("天")
                            .font(.system(size: 8))
                            .foregroundStyle(.gray)
                    }
                }
                .padding(4)
            } else {
                Image(systemName: "calendar")
                    .font(.system(size: 16))
                    .foregroundStyle(.gray)
            }
        }
        .widgetAccentable()
    }
}

// MARK: - Rectangular Widget (for lock screen rectangular area)

struct RectangularLockWidgetView: View {
    var entry: CountdownEntry
    
    var body: some View {
        let theme = WidgetTheme(rawValue: entry.config?.theme ?? "colorful") ?? .colorful
        let accentColor = Color(hex: entry.event?.backgroundColor ?? "#6366F1")
        
        if let event = entry.event {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Circle()
                        .fill(accentColor)
                        .frame(width: 6, height: 6)
                    
                    Text(event.name)
                        .font(.system(size: 14, weight: .semibold))
                        .lineLimit(1)
                }
                
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(abs(entry.timeRemaining.days))")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(accentColor)
                        .monospacedDigit()
                        .minimumScaleFactor(0.6)
                    
                    Text("天")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(accentColor.opacity(0.7))
                    
                    Text(String(format: " %02d:%02d:%02d",
                                abs(entry.timeRemaining.hours),
                                abs(entry.timeRemaining.minutes),
                                abs(entry.timeRemaining.seconds)))
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                        .minimumScaleFactor(0.8)
                }
                
                HStack {
                    Text(entry.timeRemaining.isPast ? "已过去" : "距离目标还有")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                    
                    Spacer()
                    
                    if event.repeatInterval != "none" {
                        Image(systemName: "repeat")
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }
                    
                    Text(event.categoryName)
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
            }
            .widgetAccentable()
        } else {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 14))
                    
                    Text("暂无倒计时")
                        .font(.system(size: 14, weight: .medium))
                }
                .foregroundStyle(.gray)
                
                Text("在App中添加事件")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
            .widgetAccentable()
        }
    }
}

// MARK: - Live Activity (Dynamic Island) Support

@available(iOSApplicationExtension 16.1, *)
struct CountdownLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CountdownActivityAttributes.self) { context in
            // Lock screen/banner UI
            LiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Image(systemName: "timer")
                            .foregroundStyle(.orange)
                        Text(context.state.eventName)
                            .font(.system(size: 14, weight: .semibold))
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(abs(context.state.timeRemaining.days))天")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.orange)
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 4) {
                        Text("\(String(format: "%02d:%02d:%02d",
                                 abs(context.state.timeRemaining.hours),
                                 abs(context.state.timeRemaining.minutes),
                                 abs(context.state.timeRemaining.seconds)))")
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .monospacedDigit()
                        
                        ProgressView(timerInterval: context.state.startDate...context.state.targetDate)
                            .tint(.orange)
                    }
                    .padding(.vertical, 8)
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundStyle(.orange)
            } compactTrailing: {
                Text("\(abs(context.state.timeRemaining.days))天")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.orange)
            } minimal: {
                Image(systemName: "timer")
                    .foregroundStyle(.orange)
            }
        }
    }
}

// MARK: - Live Activity Attributes

@available(iOSApplicationExtension 16.1, *)
struct CountdownActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var eventName: String
        var targetDate: Date
        var timeRemaining: TimeRemaining
        var startDate: Date
    }
    
    var eventId: String
    var backgroundColor: String
    var categoryName: String
}

@available(iOSApplicationExtension 16.1, *)
struct LiveActivityView: View {
    let context: ActivityViewContext<CountdownActivityAttributes>
    
    var body: some View {
        let accentColor = Color(hex: context.attributes.backgroundColor)
        
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "timer")
                    .foregroundStyle(accentColor)
                
                Text(context.state.eventName)
                    .font(.system(size: 16, weight: .semibold))
                
                Spacer()
                
                Text("\(abs(context.state.timeRemaining.days))天")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(accentColor)
            }
            
            HStack(spacing: 8) {
                TimeUnitView(value: context.state.timeRemaining.hours, label: "时", textColor: accentColor)
                TimeUnitView(value: context.state.timeRemaining.minutes, label: "分", textColor: accentColor)
                TimeUnitView(value: context.state.timeRemaining.seconds, label: "秒", textColor: accentColor)
            }
            
            ProgressView(timerInterval: context.state.startDate...context.state.targetDate)
                .tint(accentColor)
        }
        .padding(16)
        .background(Color(UIColor.systemBackground))
    }
}
