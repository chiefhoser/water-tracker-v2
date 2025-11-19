# 💧 Water Tracker PWA v2.0

A Progressive Web App (PWA) for tracking daily water intake with native installation capabilities on iOS and Android devices.

## 🆕 What's New in v2.0

### Code Quality Improvements
- **CSS Custom Properties**: All colors, spacing, and design tokens are now centralized using CSS variables for easy theming
- **Constants**: Magic numbers extracted to a centralized `CONSTANTS` object for better maintainability
- **JSDoc Comments**: Key methods now have comprehensive documentation
- **Error Handling**: All localStorage operations wrapped in try-catch blocks with user-friendly error messages
- **No Duplicate Code**: Removed duplicate service worker registration and event listeners

### Performance Optimizations
- **Optimized Rendering**: History list only re-renders when data actually changes
- **CSS Animations**: Animation styles moved to CSS instead of being injected dynamically
- **Better Caching**: Network-first strategy for HTML, cache-first for assets

### Accessibility Enhancements
- **ARIA Labels**: All interactive elements have proper aria-label attributes
- **Keyboard Navigation**: Modal supports Escape key to close
- **Focus Styles**: Visible focus indicators for all interactive elements
- **Semantic HTML**: Proper role attributes for tabs and dialogs

### Security
- **Content Security Policy**: CSP meta tag added to prevent XSS attacks
- **Input Validation**: Better validation of user inputs and imported data

### New Features
- **URL Shortcuts**: App now handles URL parameters from manifest shortcuts
- **Date Navigation**: Navigate through previous weeks/months/years of data
- **Disabled States**: Navigation buttons properly disabled when at current period

## Features

- 📊 **Progress Tracking**: Visual progress ring showing daily hydration goals
- ⚡ **Quick Add Buttons**: Fast entry for common drink sizes (1 cup, 2 cups)
- 🎯 **Fixed Goals**: Track between 8-10 cups per day
- 📱 **Native Installation**: Install as a native app on iOS/Android
- 📈 **Daily History**: Track all water intake throughout the day with week/month/year views
- 🌙 **Offline Support**: Works without internet connection
- 🎉 **Goal Celebrations**: Fun animations when reaching daily targets
- 💾 **Backup & Restore**: Export and import your data
- 🔄 **Auto Updates**: Automatic service worker updates with user notification

## Installation on iPhone

### Method 1: Safari Installation
1. Open Safari on your iPhone
2. Navigate to your app's URL
3. Tap the share button (□↑) at the bottom
4. Scroll down and tap "Add to Home Screen"
5. Customize the name if desired
6. Tap "Add" to install

### Method 2: Local Development
1. Serve the files using a local web server:
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```
2. Access via your phone's browser at your computer's IP address
3. Follow the Safari installation steps above

## Installation on Android

1. Open Chrome on your Android device
2. Navigate to your app's URL
3. Tap the menu button (⋮)
4. Select "Add to Home screen" or "Install app"
5. Confirm the installation

## Local Development

1. Clone or download the project files
2. Serve the files using any web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in your browser

## File Structure

```
Water_Tracker_2/
├── index.html          # Main HTML file with ARIA labels and CSP
├── styles.css          # Stylesheet with CSS custom properties
├── app.js              # Main JavaScript with improved error handling
├── manifest.json       # PWA manifest for installation
├── sw.js              # Service Worker with optimized caching
├── icons/             # PWA icons (various sizes)
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
└── README.md          # This file
```

## Features Overview

### Water Tracking
- Add water intake with preset amounts (1 or 2 cups)
- Visual progress indicator with color-coded feedback
- Fixed daily goal of 8-10 cups
- Historical log with week/month/year views
- Navigate through past periods

### Progressive Web App
- Offline functionality via Service Worker
- Native app-like experience when installed
- Responsive design for all screen sizes
- Fast loading and caching
- Automatic updates with user notification

### Data Management
- Local storage saves all data between sessions
- Export data as JSON backup
- Import data from backup files
- Reset all data option
- Settings and preferences preserved

### Accessibility
- Full keyboard navigation support
- ARIA labels on all interactive elements
- Focus indicators for keyboard users
- Semantic HTML structure
- Screen reader friendly

## Browser Support

- **iOS Safari**: Full PWA support including installation
- **Android Chrome**: Full PWA support including installation
- **Desktop Chrome/Edge**: Full functionality, PWA installation available
- **Firefox**: Full functionality, limited PWA support

## Privacy

All data is stored locally on your device. No personal information is sent to external servers. The app works completely offline after initial installation.

## Technical Improvements in v2.0

### Code Quality
- Centralized constants for all magic numbers
- Comprehensive error handling with try-catch blocks
- JSDoc comments for better code documentation
- Removed all code duplication
- Standardized string formatting with template literals

### Performance
- Optimized history rendering with change detection
- CSS-based animations instead of dynamic style injection
- Better service worker caching strategies
- Reduced memory leaks

### Security
- Content Security Policy implemented
- Input validation on all user inputs
- Safe handling of imported data

### Accessibility
- ARIA labels on all buttons and interactive elements
- Keyboard navigation (Escape to close modal)
- Focus styles for keyboard users
- Proper semantic HTML with roles

## Contributing

This is a standalone PWA project. To contribute:
1. Make your changes
2. Test on multiple devices
3. Ensure PWA functionality remains intact
4. Update documentation as needed

## License

Open source project - feel free to modify and distribute.
