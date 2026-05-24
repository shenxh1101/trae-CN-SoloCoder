//
//  WidgetData.swift
//  CountdownWidget
//
//  Shared data model for countdown widget
//

import Foundation
import SwiftUI
import WidgetKit

// MARK: - App Group Configuration
public struct AppGroupConfig {
    static let groupIdentifier = "group.com.countdown.app.widgets"
    static let widgetKind = "CountdownWidget"
    static let lockScreenWidgetKind = "CountdownLockWidget"
}

// MARK: - Data Models

public struct WidgetEvent: Codable, Identifiable, Hashable {
    public let id: String
    public let name: String
    public let targetDate: TimeInterval
    public let backgroundColor: String
    public let categoryColor: String
    public let categoryName: String
    public let repeatInterval: String
    public let isPinned: Bool
    public let lastUpdated: TimeInterval
    
    public init(id: String,
                name: String,
                targetDate: TimeInterval,
                backgroundColor: String,
                categoryColor: String,
                categoryName: String,
                repeatInterval: String,
                isPinned: Bool,
                lastUpdated: TimeInterval = Date().timeIntervalSince1970) {
        self.id = id
        self.name = name
        self.targetDate = targetDate
        self.backgroundColor = backgroundColor
        self.categoryColor = categoryColor
        self.categoryName = categoryName
        self.repeatInterval = repeatInterval
        self.isPinned = isPinned
        self.lastUpdated = lastUpdated
    }
}

public struct WidgetConfig: Codable, Identifiable, Hashable {
    public let id: String
    public let eventId: String
    public let size: String // small, medium, large
    public let theme: String // light, dark, colorful, minimal
    public let createdAt: TimeInterval
    
    public init(id: String, eventId: String, size: String, theme: String, createdAt: TimeInterval) {
        self.id = id
        self.eventId = eventId
        self.size = size
        self.theme = theme
        self.createdAt = createdAt
    }
}

public struct WidgetDataStore: Codable {
    public var events: [WidgetEvent]
    public var widgetConfigs: [WidgetConfig]
    public var lastSynced: TimeInterval
    
    public init(events: [WidgetEvent] = [], widgetConfigs: [WidgetConfig] = [], lastSynced: TimeInterval = 0) {
        self.events = events
        self.widgetConfigs = widgetConfigs
        self.lastSynced = lastSynced
    }
}

// MARK: - Data Manager

public class WidgetDataManager {
    public static let shared = WidgetDataManager()
    
    private let userDefaults: UserDefaults?
    
    private init() {
        self.userDefaults = UserDefaults(suiteName: AppGroupConfig.groupIdentifier)
    }
    
    // MARK: - Save/Load
    
    public func saveDataStore(_ dataStore: WidgetDataStore) {
        guard let userDefaults = userDefaults else { return }
        
        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(dataStore)
            userDefaults.set(data, forKey: "widgetDataStore")
            userDefaults.synchronize()
            
            // Reload all widget timelines
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            print("Failed to save widget data: \(error)")
        }
    }
    
    public func loadDataStore() -> WidgetDataStore {
        guard let userDefaults = userDefaults,
              let data = userDefaults.data(forKey: "widgetDataStore") else {
            return WidgetDataStore()
        }
        
        do {
            let decoder = JSONDecoder()
            return try decoder.decode(WidgetDataStore.self, from: data)
        } catch {
            print("Failed to load widget data: \(error)")
            return WidgetDataStore()
        }
    }
    
    // MARK: - Convenience Methods
    
    public func getEvent(for config: WidgetConfig) -> WidgetEvent? {
        let dataStore = loadDataStore()
        return dataStore.events.first { $0.id == config.eventId }
    }
    
    public func getDefaultEvent() -> WidgetEvent? {
        let dataStore = loadDataStore()
        return dataStore.events
            .sorted { event1, event2 in
                if event1.isPinned && !event2.isPinned { return true }
                if !event1.isPinned && event2.isPinned { return false }
                return abs(event1.targetDate - Date().timeIntervalSince1970) < abs(event2.targetDate - Date().timeIntervalSince1970)
            }
            .first
    }
    
    public func getNextEvent() -> WidgetEvent? {
        let dataStore = loadDataStore()
        let now = Date().timeIntervalSince1970
        
        return dataStore.events
            .filter { $0.targetDate > now }
            .sorted { $0.targetDate < $1.targetDate }
            .first
    }
    
    public func saveEvents(_ events: [WidgetEvent]) {
        var dataStore = loadDataStore()
        dataStore.events = events
        dataStore.lastSynced = Date().timeIntervalSince1970
        saveDataStore(dataStore)
    }
    
    public func saveWidgetConfigs(_ configs: [WidgetConfig]) {
        var dataStore = loadDataStore()
        dataStore.widgetConfigs = configs
        saveDataStore(dataStore)
    }
}

// MARK: - Time Calculations

public struct TimeRemaining {
    public let days: Int
    public let hours: Int
    public let minutes: Int
    public let seconds: Int
    public let totalSeconds: Int
    public let isPast: Bool
    
    public init(targetDate: TimeInterval) {
        let now = Date().timeIntervalSince1970
        let diff = targetDate - now
        let isPast = diff < 0
        let absDiff = abs(diff)
        
        self.days = Int(absDiff / 86400)
        self.hours = Int((absDiff.truncatingRemainder(dividingBy: 86400)) / 3600)
        self.minutes = Int((absDiff.truncatingRemainder(dividingBy: 3600)) / 60)
        self.seconds = Int(absDiff.truncatingRemainder(dividingBy: 60))
        self.totalSeconds = Int(diff)
        self.isPast = isPast
    }
    
    public var displayText: String {
        if days > 0 {
            return "\(days)天 \(String(format: "%02d", hours)):\(String(format: "%02d", minutes))"
        }
        return "\(String(format: "%02d", hours)):\(String(format: "%02d", minutes)):\(String(format: "%02d", seconds))"
    }
}

// MARK: - Color Helpers

public extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 99, 102, 241)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
    
    func isDark() -> Bool {
        let components = UIColor(self).cgColor.components ?? [0.5, 0.5, 0.5, 1]
        let brightness = (components[0] * 299 + components[1] * 587 + components[2] * 114) / 1000
        return brightness < 0.5
    }
    
    var contrastingTextColor: Color {
        self.isDark() ? .white : .black
    }
}
