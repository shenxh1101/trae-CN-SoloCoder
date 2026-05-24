//
//  CountdownProvider.swift
//  CountdownWidget
//
//  Timeline provider for widget data updates
//

import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Timeline Entry

struct CountdownEntry: TimelineEntry {
    let date: Date
    let event: WidgetEvent?
    let config: WidgetConfig?
    let timeRemaining: TimeRemaining
    
    init(date: Date, event: WidgetEvent?, config: WidgetConfig?) {
        self.date = date
        self.event = event
        self.config = config
        self.timeRemaining = TimeRemaining(targetDate: event?.targetDate ?? Date().timeIntervalSince1970 + 3600)
    }
}

// MARK: - Select Event Intent

@available(iOSApplicationExtension 17.0, *)
struct SelectCountdownIntent: AppIntent {
    static let title: LocalizedStringResource = "选择倒计时"
    static let description = IntentDescription("选择要显示在小组件上的倒计时事件")
    
    @Parameter(title: "倒计时事件")
    var event: EventEntity?
    
    init() {}
    
    init(event: EventEntity) {
        self.event = event
    }
    
    func perform() async throws -> some IntentResult {
        return .result()
    }
}

@available(iOSApplicationExtension 17.0, *)
struct EventEntity: AppEntity {
    static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "倒计时事件")
    static let defaultQuery = EventQuery()
    
    let id: String
    let name: String
    let targetDate: TimeInterval
    
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

@available(iOSApplicationExtension 17.0, *)
struct EventQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [EventEntity] {
        let dataStore = WidgetDataManager.shared.loadDataStore()
        return dataStore.events
            .filter { identifiers.contains($0.id) }
            .map { EventEntity(id: $0.id, name: $0.name, targetDate: $0.targetDate) }
    }
    
    func suggestedEntities() async throws -> [EventEntity] {
        let dataStore = WidgetDataManager.shared.loadDataStore()
        return dataStore.events
            .prefix(5)
            .map { EventEntity(id: $0.id, name: $0.name, targetDate: $0.targetDate) }
    }
    
    func defaultResult() async -> EventEntity? {
        let event = WidgetDataManager.shared.getDefaultEvent()
        guard let event else { return nil }
        return EventEntity(id: event.id, name: event.name, targetDate: event.targetDate)
    }
}

// MARK: - Timeline Provider

struct CountdownProvider: AppIntentTimelineProvider {
    typealias Entry = CountdownEntry
    typealias Intent = SelectCountdownIntent
    
    func placeholder(in context: Context) -> CountdownEntry {
        let sampleEvent = WidgetEvent(
            id: "sample",
            name: "新年倒计时",
            targetDate: Date().timeIntervalSince1970 + 86400 * 30,
            backgroundColor: "#6366F1",
            categoryColor: "#8B5CF6",
            categoryName: "节日",
            repeatInterval: "yearly",
            isPinned: true
        )
        return CountdownEntry(date: Date(), event: sampleEvent, config: nil)
    }
    
    func snapshot(for configuration: SelectCountdownIntent, in context: Context) async -> CountdownEntry {
        let event = getSelectedEvent(for: configuration)
        let config = getConfig(for: configuration)
        return CountdownEntry(date: Date(), event: event, config: config)
    }
    
    func timeline(for configuration: SelectCountdownIntent, in context: Context) async -> Timeline<CountdownEntry> {
        let event = getSelectedEvent(for: configuration)
        let config = getConfig(for: configuration)
        
        var entries: [CountdownEntry] = []
        let currentDate = Date()
        
        // Generate timeline entries for next 24 hours, updating every minute
        for minuteOffset in 0..<1440 { // 24 hours * 60 minutes
            let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: currentDate)!
            let entry = CountdownEntry(date: entryDate, event: event, config: config)
            entries.append(entry)
        }
        
        // Reload after 1 hour to ensure data freshness
        let reloadDate = Calendar.current.date(byAdding: .hour, value: 1, to: currentDate)!
        return Timeline(entries: entries, policy: .after(reloadDate))
    }
    
    // MARK: - Helper Methods
    
    private func getSelectedEvent(for configuration: SelectCountdownIntent) -> WidgetEvent? {
        if let eventId = configuration.event?.id {
            let dataStore = WidgetDataManager.shared.loadDataStore()
            return dataStore.events.first { $0.id == eventId }
        }
        return WidgetDataManager.shared.getDefaultEvent()
    }
    
    private func getConfig(for configuration: SelectCountdownIntent) -> WidgetConfig? {
        if let eventId = configuration.event?.id {
            let dataStore = WidgetDataManager.shared.loadDataStore()
            return dataStore.widgetConfigs.first { $0.eventId == eventId }
        }
        return nil
    }
}

// MARK: - Background Refresh Handler

class WidgetRefreshManager {
    static let shared = WidgetRefreshManager()
    
    func scheduleWidgetUpdate() {
        let center = UNUserNotificationCenter.current()
        
        // Remove existing pending requests
        center.removePendingNotificationRequests(withIdentifiers: ["widgetUpdate"])
        
        // Create a new background refresh trigger
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 300, repeats: true)
        let content = UNMutableNotificationContent()
        content.title = "更新倒计时"
        content.body = "正在更新小组件数据..."
        content.sound = .default
        
        let request = UNNotificationRequest(
            identifier: "widgetUpdate",
            content: content,
            trigger: trigger
        )
        
        center.add(request) { error in
            if let error = error {
                print("Failed to schedule widget update: \(error)")
            }
        }
    }
    
    func forceWidgetUpdate() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}
