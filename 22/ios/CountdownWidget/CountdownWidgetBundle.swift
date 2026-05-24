//
//  CountdownWidgetBundle.swift
//  CountdownWidget
//
//  Widget bundle containing all widget types
//

import WidgetKit
import SwiftUI

@main
struct CountdownWidgetBundle: WidgetBundle {
    var body: some Widget {
        CountdownWidget()
        CountdownLockWidget()
    }
}

// MARK: - Main Home Screen Widget

struct CountdownWidget: Widget {
    let kind: String = AppGroupConfig.widgetKind
    
    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: SelectCountdownIntent.self,
            provider: CountdownProvider()) { entry in
                CountdownWidgetView(entry: entry)
            }
            .configurationDisplayName("倒计时")
            .description("在桌面上显示重要事件的倒计时")
            .supportedFamilies([
                .systemSmall,
                .systemMedium,
                .systemLarge,
                .systemExtraLarge
            ])
    }
}

// MARK: - Lock Screen Widget

struct CountdownLockWidget: Widget {
    let kind: String = AppGroupConfig.lockScreenWidgetKind
    
    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: SelectCountdownIntent.self,
            provider: CountdownProvider()) { entry in
                CountdownLockWidgetView(entry: entry)
            }
            .configurationDisplayName("倒计时")
            .description("在锁屏上显示倒计时")
            .supportedFamilies([
                .accessoryInline,
                .accessoryCircular,
                .accessoryRectangular
            ])
    }
}
