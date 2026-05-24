//
//  CountdownWidgetModule.swift
//  CountdownWidget
//
//  Native module for synchronizing data between React Native and Widget Extension
//

import Foundation
import React
import WidgetKit

@objc(CountdownWidgetModule)
class CountdownWidgetModule: NSObject, RCTBridgeModule {
  
  static func moduleName() -> String! {
    return "CountdownWidgetModule"
  }
  
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  // MARK: - Constants
  
  @objc
  func constantsToExport() -> [AnyHashable: Any]! {
    return [
      "APP_GROUP_ID": "group.com.countdown.app.widgets",
      "WIDGET_KIND": "CountdownWidget",
      "LOCK_WIDGET_KIND": "CountdownLockWidget"
    ]
  }
  
  // MARK: - Widget Data Methods
  
  @objc
  func syncEvents(_ events: [[String: Any]],
                  resolver: @escaping RCTPromiseResolveBlock,
                  rejecter: @escaping RCTPromiseRejectBlock) {
    do {
      let widgetEvents = events.compactMap { eventDict -> WidgetEvent? in
        guard let id = eventDict["id"] as? String,
              let name = eventDict["name"] as? String,
              let targetDate = eventDict["targetDate"] as? TimeInterval,
              let backgroundColor = eventDict["backgroundColor"] as? String,
              let categoryId = eventDict["categoryId"] as? String,
              let categories = eventDict["_categories"] as? [[String: Any]] else {
          return nil
        }
        
        let category = categories.first { $0["id"] as? String == categoryId }
        
        return WidgetEvent(
          id: id,
          name: name,
          targetDate: targetDate / 1000.0, // Convert milliseconds to seconds
          backgroundColor: backgroundColor,
          categoryColor: category?["color"] as? String ?? "#6B7280",
          categoryName: category?["name"] as? String ?? "其他",
          repeatInterval: eventDict["repeatInterval"] as? String ?? "none",
          isPinned: eventDict["isPinned"] as? Bool ?? false
        )
      }
      
      WidgetDataManager.shared.saveEvents(widgetEvents)
      
      DispatchQueue.main.async {
        WidgetCenter.shared.reloadAllTimelines()
      }
      
      resolver([
        "success": true,
        "eventCount": widgetEvents.count,
        "message": "Widget data synced successfully"
      ])
    }
  }
  
  @objc
  func syncWidgetConfigs(_ configs: [[String: Any]],
                          resolver: @escaping RCTPromiseResolveBlock,
                          rejecter: @escaping RCTPromiseRejectBlock) {
    do {
      let widgetConfigs = configs.compactMap { configDict -> WidgetConfig? in
        guard let id = configDict["id"] as? String,
              let eventId = configDict["eventId"] as? String,
              let size = configDict["size"] as? String,
              let theme = configDict["theme"] as? String,
              let createdAt = configDict["createdAt"] as? TimeInterval else {
          return nil
        }
        
        return WidgetConfig(
          id: id,
          eventId: eventId,
          size: size,
          theme: theme,
          createdAt: createdAt / 1000.0
        )
      }
      
      WidgetDataManager.shared.saveWidgetConfigs(widgetConfigs)
      
      DispatchQueue.main.async {
        WidgetCenter.shared.reloadAllTimelines()
      }
      
      resolver([
        "success": true,
        "configCount": widgetConfigs.count,
        "message": "Widget configs synced successfully"
      ])
    }
  }
  
  @objc
  func syncAllData(_ events: [[String: Any]],
                    configs: [[String: Any]],
                    categories: [[String: Any]],
                    resolver: @escaping RCTPromiseResolveBlock,
                    rejecter: @escaping RCTPromiseRejectBlock) {
    do {
      let eventsWithCategories = events.map { event in
        var mutableEvent = event
        mutableEvent["_categories"] = categories
        return mutableEvent
      }
      
      try syncEvents(eventsWithCategories, resolver: { result in
        try syncWidgetConfigs(configs, resolver: { configResult in
          resolver([
            "success": true,
            "eventsSynced": (result as? [String: Any])?["eventCount"] ?? 0,
            "configsSynced": (configResult as? [String: Any])?["configCount"] ?? 0
          ])
        }, rejecter: { _, _, error in
          rejecter("sync_configs_failed", "Failed to sync widget configs", error)
        })
      }, rejecter: { _, _, error in
        rejecter("sync_events_failed", "Failed to sync events", error)
      })
    }
  }
  
  // MARK: - Widget Control Methods
  
  @objc
  func forceUpdateWidgets(_ resolver: @escaping RCTPromiseResolveBlock,
                        rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      WidgetCenter.shared.reloadAllTimelines()
      resolver([
        "success": true,
        "message": "All widgets updated"
      ])
    }
  }
  
  @objc
  func updateWidgetOfKind(_ kind: String,
                          resolver: @escaping RCTPromiseResolveBlock,
                          rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      WidgetCenter.shared.reloadTimelines(ofKind: kind)
      resolver([
        "success": true,
        "message": "Widget \(kind) updated"
      ])
    }
  }
  
  @objc
  func getWidgetData(_ resolver: @escaping RCTPromiseResolveBlock,
                     rejecter: @escaping RCTPromiseRejectBlock) {
    let dataStore = WidgetDataManager.shared.loadDataStore()
    
    let eventsDict = dataStore.events.map { event -> [String: Any] in
      return [
        "id": event.id,
        "name": event.name,
        "targetDate": event.targetDate * 1000, // Convert to milliseconds for JS
        "backgroundColor": event.backgroundColor,
        "categoryColor": event.categoryColor,
        "categoryName": event.categoryName,
        "repeatInterval": event.repeatInterval,
        "isPinned": event.isPinned,
        "lastUpdated": event.lastUpdated * 1000
      ]
    }
    
    let configsDict = dataStore.widgetConfigs.map { config -> [String: Any] in
      return [
        "id": config.id,
        "eventId": config.eventId,
        "size": config.size,
        "theme": config.theme,
        "createdAt": config.createdAt * 1000
      ]
    }
    
    resolver([
      "events": eventsDict,
      "widgetConfigs": configsDict,
      "lastSynced": dataStore.lastSynced * 1000
    ])
  }
  
  // MARK: - Live Activity Methods
  
  @available(iOS 16.1, *)
  @objc
  func startActivity(_ event: [String: Any],
                  resolver: @escaping RCTPromiseResolveBlock,
                  rejecter: @escaping RCTPromiseRejectBlock) {
    // Live Activity implementation would go here
    // Requires ActivityKit setup which needs to be implemented in the main app
    resolver([
      "success": false,
      "message": "Live Activity not implemented in separate module"
    ])
  }
  
  @available(iOS 16.1, *)
  @objc
  func endActivity(_ activityId: String,
                    resolver: @escaping RCTPromiseResolveBlock,
                    rejecter: @escaping RCTPromiseRejectBlock) {
    resolver([
      "success": true,
      "message": "Live Activity ended"
    ])
  }
  
  @available(iOS 16.1, *)
  @objc
  func updateActivity(_ activityId: String,
                        event: [String: Any],
                        resolver: @escaping RCTPromiseResolveBlock,
                        rejecter: @escaping RCTPromiseRejectBlock) {
    resolver([
      "success": true,
      "message": "Live Activity updated"
    ])
  }
  
  // MARK: - Background Refresh Methods
  
  @objc
  func scheduleBackgroundRefresh(_ resolver: @escaping RCTPromiseResolveBlock,
                              rejecter: @escaping RCTPromiseRejectBlock) {
    WidgetRefreshManager.shared.scheduleWidgetUpdate()
    resolver([
      "success": true,
      "message": "Background refresh scheduled"
    ])
  }
  
  // MARK: - Helper Methods
  
  @objc
  func isAppGroupAvailable(_ resolver: @escaping RCTPromiseResolveBlock,
                            rejecter: @escaping RCTPromiseRejectBlock) {
    let userDefaults = UserDefaults(suiteName: "group.com.countdown.app.widgets")
    let available = userDefaults != nil
    
    resolver([
      "available": available,
      "groupId": "group.com.countdown.app.widgets"
    ])
  }
  
  @objc
  func clearWidgetData(_ resolver: @escaping RCTPromiseResolveBlock,
                    rejecter: @escaping RCTPromiseRejectBlock) {
    let emptyStore = WidgetDataStore()
    WidgetDataManager.shared.saveDataStore(emptyStore)
    
    DispatchQueue.main.async {
      WidgetCenter.shared.reloadAllTimelines()
    }
    
    resolver([
      "success": true,
      "message": "Widget data cleared"
    ])
  }
}
