# Notification Sounds

This directory should contain a `notification.mp3` file for browser notification sounds.

## Requirements

- File name: `notification.mp3`
- Format: MP3
- Duration: 1-2 seconds recommended
- Volume: Low to medium (will be played at 30% volume)

## Free Sound Sources

You can use free notification sounds from:
- [Zapsplat](https://www.zapsplat.com/) (free account required)
- [Freesound](https://freesound.org/) (search for "notification")
- [Mixkit](https://mixkit.co/free-sound-effects/notification/)

## Implementation

The notification sound is automatically played when:
1. User is subscribed to Supabase Realtime
2. A HIGH priority notification is received
3. Browser has granted notification permission

See: `lib/hooks/useRealtimeNotifications.ts` line 198-206
