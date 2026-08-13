# Notification Icons (Browser Notifications)

This directory should contain notification icons for browser push notifications.

## Required Icons

### icon-192.png
- Size: 192x192 pixels
- Format: PNG with transparency
- Usage: Main notification icon
- Design: App logo or brand icon

### badge-72.png
- Size: 72x72 pixels
- Format: PNG with transparency (monochrome white/transparent preferred)
- Usage: Small badge icon on Android
- Design: Simplified version of app icon

## Design Guidelines

- Use your brand logo or app icon
- Keep it simple and recognizable at small sizes
- For badge: use white/transparent for best visibility on all backgrounds
- Square aspect ratio
- No text in icons

## Free Icon Tools

- [Canva](https://www.canva.com/) - Easy icon design
- [Figma](https://www.figma.com/) - Professional design
- [IconKitchen](https://icon.kitchen/) - Android icon generator

## Implementation

These icons are used in `lib/hooks/useRealtimeNotifications.ts` line 223-234
when displaying browser notifications for HIGH priority events.
