# MediaHub Android App Design

## Overview

Package the existing React web app into an Android APK using Capacitor, enabling submission to Douyin Open Platform for app review (上线转正). This unlocks `video.list.bind` and `video.data.bind` capabilities.

## Product Positioning

**E-commerce Short Video Matrix Distribution Tool**

Help merchants and creators distribute product videos across multiple Douyin matrix accounts.

## Core Features

| Page | Function | Scope Required |
|------|----------|----------------|
| Account Management | Bind/unbind multiple Douyin accounts | `user_info` (approved) |
| Video Distribution | Upload video → select accounts → publish | `aweme.forward` (approved) |
| Content Management | View published video list per account | `video.list.bind` (after review) |
| Data Overview | Video stats: plays, likes, comments | `video.data.bind` (after review) |

## Technical Architecture

- **Framework**: Capacitor (wraps existing React/Vite web app)
- **Package name**: `com.heytime.mediahub`
- **Native features**: Douyin SDK login (future), video picker, push notifications
- **Web features**: All existing functionality via WebView

## Implementation Steps

1. Initialize Capacitor in frontend project
2. Configure Android project (package name, icons, splash screen)
3. Build APK and generate signing keystore
4. Fill in package info on Douyin platform
5. Complete app basic info (icon, description, screenshots)
6. Submit for review (上线转正)
