# GPX Studio Mobile

A React Native mobile application for GPX file management, GPS tracking, and navigation.

## Features

- GPX file import, export, and management
- Interactive map display with multiple tile providers
- GPS track recording and real-time location tracking
- Elevation profile visualization
- Offline functionality with map caching
- Cross-platform support (iOS and Android)

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Maps**: React Native Maps
- **Database**: SQLite
- **Charts**: React Native Chart Kit
- **Language**: TypeScript

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components
│   ├── map/            # Map-related components
│   ├── file-list/      # File management components
│   └── elevation-profile/ # Elevation chart components
├── screens/            # Screen components
│   ├── MapScreen/      # Map and navigation screen
│   ├── FilesScreen/    # File management screen
│   ├── RecordScreen/   # GPS recording screen
│   └── SettingsScreen/ # App settings screen
├── services/           # Business logic and API services
│   ├── gpx/           # GPX file processing
│   ├── location/      # GPS and location services
│   ├── map/           # Map tile and caching services
│   └── database/      # SQLite database services
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── hooks/             # Custom React hooks
├── context/           # React context providers
└── constants/         # App constants
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

```bash
npm install
```

### Running the App

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

### Development Scripts

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format
npm run format:check
```

## Requirements

This project implements the requirements defined in the GPX Studio Mobile specification:

- **Core GPX File Management** (Req 1.1-1.6)
- **Interactive Map Display** (Req 2.1-2.7)
- **GPS Location and Navigation** (Req 3.1-3.7)
- **Elevation Profile Visualization** (Req 4.1-4.6)
- **Track Recording and Creation** (Req 5.1-5.7)
- **Offline Functionality** (Req 6.1-6.6)
- **GPX Editing and Modification** (Req 7.1-7.7)
- **File Import and Export** (Req 8.1-8.6)
- **Settings and Customization** (Req 9.1-9.6)
- **Performance and Battery Optimization** (Req 10.1-10.6)

## License

[License information to be added]
