/**
 * Water Tracker PWA - Main Application
 * Version 2.0.1 - Improved with better error handling, performance, and accessibility
 */

/**
 * @typedef {Object} DayData
 * @property {number} glasses - Number of glasses consumed
 * @property {number} goal - Daily goal
 * @property {number} goalMax - Maximum daily goal
 * @property {string} date - Date string
 * @property {number} [timestamp] - Unix timestamp
 */

/**
 * @typedef {Object} WeekData
 * @property {number} weekNumber - Week number in period
 * @property {string} dateRange - Date range string
 * @property {number} totalGlasses - Total glasses in week
 * @property {number} daysWithData - Days with data
 * @property {number} successDays - Days that met goal
 */

/**
 * @typedef {Object} MonthData
 * @property {string} monthName - Month name
 * @property {number} year - Year
 * @property {number} totalGlasses - Total glasses in month
 * @property {number} daysWithData - Days with data
 * @property {number} successDays - Days that met goal
 */

/**
 * Logger utility for development and production logging
 */
class Logger {
    static isDevelopment = window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1';

    static log(...args) {
        if (this.isDevelopment) console.log(...args);
    }

    static warn(...args) {
        if (this.isDevelopment) console.warn(...args);
    }

    static error(...args) {
        console.error(...args); // Always show errors
    }
}

class WaterTracker {
    // Constants
    static CONSTANTS = {
        MIN_DAILY_GOAL: 8,
        MAX_DAILY_GOAL: 10,
        ANIMATION_DURATION: 1200,
        MESSAGE_DURATION: 3000,
        UPDATE_CHECK_INTERVAL: 60000,
        WEEK_DAYS: 7,
        MONTH_DAYS: 30,
        YEAR_DAYS: 365,
        APP_VERSION: '2.0.1',
        ANIMATION_CLASS: 'water-popup-animation',
        TOAST_GOAL_CLASS: 'toast-goal',
        TOAST_PERFECT_CLASS: 'toast-perfect'
    };

    constructor() {
        this.currentGlasses = 0;
        this.dailyGoal = WaterTracker.CONSTANTS.MIN_DAILY_GOAL;
        this.maxGoal = WaterTracker.CONSTANTS.MAX_DAILY_GOAL;
        this.historicalData = {};
        this.currentPeriod = 'week';
        this.currentOffset = 0; // For date navigation
        this.lastHistoryHash = null; // For optimized rendering
        this.animationStyleInjected = false;
        this.escapeHandler = null;
        this._navigating = false; // For debouncing navigation

        try {
            this.initializeApp();
            this.loadData();
            this.setupEventListeners();
            this.updateDisplay();
            this.updateDate();
            this.updateHistory();
            this.handleURLParameters();
            this.setupOfflineDetection();
        } catch (error) {
            Logger.error('Failed to initialize app:', error);
            this.showMessage('Failed to start the app. Please refresh.', 'error');
            // Attempt minimal recovery
            try {
                this.initializeApp();
                this.setupEventListeners();
            } catch (recoveryError) {
                Logger.error('Recovery failed:', recoveryError);
            }
        }
    }

    /**
     * Initialize DOM elements with validation
     */
    initializeApp() {
        const elementIds = {
            currentGlasses: 'current-glasses',
            goalGlasses: 'goal-glasses',
            progressFill: 'progress-fill',
            progressBar: '.progress-bar',
            progressToastWrapper: '.progress-toast-wrapper',
            goalToast: 'goal-toast',
            perfectToast: 'perfect-toast',
            currentDate: 'current-date',
            historyList: 'history-list',
            avgGlasses: 'avg-glasses',
            goalDays: 'goal-days',
            dateRange: 'date-range',
            resetBtn: 'reset-btn',
            prevPeriod: 'prev-period',
            nextPeriod: 'next-period',
            settingsBtn: 'settings-btn',
            settingsModal: 'settings-modal',
            closeSettings: 'close-settings',
            closeSettingsFooter: 'close-settings-footer',
            exportData: 'export-data',
            importData: 'import-data',
            importFile: 'import-file',
            resetAllData: 'reset-all-data',
            checkUpdates: 'check-updates'
        };

        this.elements = {};

        for (const [key, selector] of Object.entries(elementIds)) {
            let element;
            if (selector.startsWith('.')) {
                element = document.querySelector(selector);
            } else {
                element = document.getElementById(selector);
            }

            if (!element) {
                Logger.error(`Required element not found: ${selector}`);
            }
            this.elements[key] = element;
        }
    }

    /**
     * Sanitize text for HTML insertion
     * @param {string} text - Text to sanitize
     * @returns {string} Sanitized text
     */
    sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get normalized date key for storage
     * @param {Date} date - Date object
     * @returns {string} Normalized date string
     */
    getDateKey(date = new Date()) {
        return date.toDateString();
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     */
    announceToScreenReader(message) {
        let announcer = document.getElementById('sr-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'sr-announcer';
            announcer.setAttribute('role', 'status');
            announcer.setAttribute('aria-live', 'polite');
            announcer.className = 'sr-only';
            document.body.appendChild(announcer);
        }
        announcer.textContent = message;

        // Clear after announcement
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    }

    /**
     * Setup offline/online detection
     */
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.showMessage('Back online', 'success');
        });

        window.addEventListener('offline', () => {
            this.showMessage('You are offline. Data will sync when connected.', 'info');
        });
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Glass buttons
        document.querySelectorAll('.glass-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const glasses = parseFloat(btn.dataset.glasses);
                this.addGlasses(glasses);
            });
        });

        // Reset button
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => {
                if (confirm(`Are you sure you want to reset today's progress?`)) {
                    this.resetDay();
                }
            });
        }

        // History tabs
        document.querySelectorAll('.history-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchPeriod(tab.dataset.period);
            });
        });

        // Date navigation
        if (this.elements.prevPeriod) {
            this.elements.prevPeriod.addEventListener('click', () => {
                this.navigatePeriod(-1);
            });
        }

        if (this.elements.nextPeriod) {
            this.elements.nextPeriod.addEventListener('click', () => {
                this.navigatePeriod(1);
            });
        }

        // Settings
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
        }

        if (this.elements.closeSettings) {
            this.elements.closeSettings.addEventListener('click', () => {
                this.closeSettings();
            });
        }

        if (this.elements.closeSettingsFooter) {
            this.elements.closeSettingsFooter.addEventListener('click', () => {
                this.closeSettings();
            });
        }

        if (this.elements.exportData) {
            this.elements.exportData.addEventListener('click', () => {
                this.exportData();
            });
        }

        if (this.elements.importData) {
            this.elements.importData.addEventListener('click', () => {
                this.elements.importFile.click();
            });
        }

        if (this.elements.importFile) {
            this.elements.importFile.addEventListener('change', (e) => {
                this.importData(e.target.files[0]);
            });
        }

        if (this.elements.resetAllData) {
            this.elements.resetAllData.addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete ALL your water tracking data? This cannot be undone!`)) {
                    this.resetAllData();
                }
            });
        }

        if (this.elements.checkUpdates) {
            this.elements.checkUpdates.addEventListener('click', () => {
                this.checkForUpdates();
            });
        }

        // Modal close on background click
        if (this.elements.settingsModal) {
            this.elements.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.elements.settingsModal) {
                    this.closeSettings();
                }
            });
        }
    }

    /**
     * Handle URL parameters for shortcuts
     */
    handleURLParameters() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const amount = params.get('amount');

        if (action === 'add' && amount) {
            const cups = parseInt(amount) / 250; // Convert ml to cups
            if (!isNaN(cups) && cups > 0) {
                this.addGlasses(cups);
                // Clear URL parameters after processing
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    /**
     * Add glasses to today's water intake
     * @param {number} amount - Number of glasses to add
     */
    addGlasses(amount) {
        const newTotal = Math.min(this.currentGlasses + amount, this.maxGoal);
        const actualAdded = newTotal - this.currentGlasses;

        if (actualAdded <= 0) {
            this.showMessage(`You've already reached the max of ${this.maxGoal} cups today!`, 'info');
            return;
        }

        this.currentGlasses = newTotal;
        this.saveToHistory();
        this.updateDisplay();
        this.saveData();
        this.animateAddition(actualAdded);

        if (actualAdded < amount) {
            this.showMessage(`Only part of that was recorded because ${this.maxGoal} cups is the daily max.`, 'info');
        }
    }

    /**
     * Reset today's water intake
     */
    resetDay() {
        this.currentGlasses = 0;
        this.saveToHistory();
        this.updateDisplay();
        this.saveData();
    }

    /**
     * Update the display with current data
     */
    updateDisplay() {
        if (!this.elements.currentGlasses || !this.elements.goalGlasses) return;

        // Update current glasses
        this.elements.currentGlasses.textContent = this.currentGlasses % 1 === 0 ?
            this.currentGlasses : this.currentGlasses.toFixed(1);

        this.elements.goalGlasses.textContent = `${this.dailyGoal}-${this.maxGoal}`;

        // Update progress bar
        const percentage = Math.min((this.currentGlasses / this.maxGoal) * 100, 100);

        const { progressBar, progressFill, progressToastWrapper, goalToast, perfectToast } = this.elements;

        if (progressBar && progressFill) {
            progressBar.style.display = '';
            progressFill.style.width = `${percentage}%`;
        }

        if (goalToast && perfectToast && progressToastWrapper) {
            goalToast.classList.remove('visible', 'toast-goal');
            goalToast.textContent = '';
            perfectToast.classList.remove('visible', 'toast-perfect');
            perfectToast.textContent = '';

            progressToastWrapper.classList.remove('visible', 'max-twin');

            if (this.currentGlasses >= this.dailyGoal) {
                progressToastWrapper.classList.add('visible');
                goalToast.textContent = '✅ Goal reached';
                goalToast.classList.add('visible', WaterTracker.CONSTANTS.TOAST_GOAL_CLASS);

                if (this.currentGlasses >= this.maxGoal) {
                    if (progressBar) progressBar.style.display = 'none';
                    perfectToast.textContent = '⭐ Perfect 10';
                    perfectToast.classList.add('visible', WaterTracker.CONSTANTS.TOAST_PERFECT_CLASS);
                    progressToastWrapper.classList.add('max-twin');
                    this.announceToScreenReader('Perfect! You reached 10 cups today!');
                } else {
                    this.announceToScreenReader('Great job! You reached your daily goal!');
                }
            } else if (this.currentGlasses < this.maxGoal) {
                if (progressBar) progressBar.style.display = '';
            }
        }
    }

    /**
     * Update the current date display
     */
    updateDate() {
        if (!this.elements.currentDate) return;

        const today = new Date();
        const options = {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        };
        this.elements.currentDate.textContent = today.toLocaleDateString('en-US', options);
    }

    /**
     * Animate the addition of water
     * @param {number} amount - Amount added
     */
    animateAddition(amount) {
        // Inject animation style only once
        if (!this.animationStyleInjected) {
            this.animationStyleInjected = true;
        }

        const popup = document.createElement('div');
        popup.textContent = `+${amount} cup${amount !== 1 ? 's' : ''}`;
        popup.className = WaterTracker.CONSTANTS.ANIMATION_CLASS;

        document.body.appendChild(popup);

        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
            }
        }, WaterTracker.CONSTANTS.ANIMATION_DURATION);
    }

    /**
     * Save current data to history
     */
    saveToHistory() {
        const today = this.getDateKey();
        this.historicalData[today] = {
            glasses: this.currentGlasses,
            goal: this.dailyGoal,
            goalMax: this.maxGoal,
            date: today,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem('waterTrackerHistory', JSON.stringify(this.historicalData));
        } catch (error) {
            Logger.error('Failed to save history:', error);
            this.showMessage('Failed to save data. Storage may be full.', 'error');
        }
    }

    /**
     * Load data from localStorage
     */
    loadData() {
        try {
            // Load historical data
            const savedHistory = localStorage.getItem('waterTrackerHistory');
            if (savedHistory) {
                this.historicalData = JSON.parse(savedHistory);
            }

            // Load today's data
            const today = this.getDateKey();
            if (this.historicalData[today]) {
                this.currentGlasses = this.historicalData[today].glasses;
                this.dailyGoal = this.historicalData[today].goal || this.dailyGoal;
                this.maxGoal = this.historicalData[today].goalMax || this.maxGoal;
            }

            // Load settings
            const savedSettings = localStorage.getItem('waterTrackerSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                if (typeof settings.dailyGoal === 'number') {
                    this.dailyGoal = settings.dailyGoal;
                }
                if (typeof settings.maxGoal === 'number') {
                    this.maxGoal = settings.maxGoal;
                }
            }

            // Enforce goal range
            this.maxGoal = WaterTracker.CONSTANTS.MAX_DAILY_GOAL;
            this.dailyGoal = Math.min(Math.max(this.dailyGoal, WaterTracker.CONSTANTS.MIN_DAILY_GOAL), this.maxGoal);
            this.currentGlasses = Math.min(this.currentGlasses, this.maxGoal);
        } catch (error) {
            Logger.error('Failed to load data:', error);
            this.showMessage('Failed to load saved data.', 'error');
        }
    }

    /**
     * Save data to localStorage
     */
    saveData() {
        try {
            const settings = {
                dailyGoal: this.dailyGoal,
                maxGoal: this.maxGoal,
                lastSaved: this.getDateKey()
            };
            localStorage.setItem('waterTrackerSettings', JSON.stringify(settings));
            this.saveToHistory();
        } catch (error) {
            Logger.error('Failed to save data:', error);
            this.showMessage('Failed to save data. Storage may be full.', 'error');
        }
    }

    /**
     * Switch between different time periods
     * @param {string} period - 'week', 'month', or 'year'
     */
    switchPeriod(period) {
        this.currentPeriod = period;
        this.currentOffset = 0; // Reset offset when switching periods

        // Update active tab with ARIA states
        document.querySelectorAll('.history-tab').forEach(tab => {
            const isActive = tab.dataset.period === period;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive.toString());
        });

        this.updateHistory();
    }

    /**
     * Update history display with optimization
     */
    updateHistory() {
        const days = this.getHistoryDays();

        // Only re-render if data has actually changed
        const newHash = JSON.stringify(days);
        if (this.lastHistoryHash === newHash) {
            return;
        }
        this.lastHistoryHash = newHash;

        this.renderHistoryList(days);
        this.updateHistorySummary(days);
        this.updateDateRange();
        this.updateNavigationButtons();
    }

    /**
     * Get history days based on current period and offset
     * @returns {Array} Array of day data objects
     */
    getHistoryDays() {
        const today = new Date();
        const days = [];

        let daysToShow = WaterTracker.CONSTANTS.WEEK_DAYS;
        if (this.currentPeriod === 'month') daysToShow = WaterTracker.CONSTANTS.MONTH_DAYS;
        if (this.currentPeriod === 'year') daysToShow = WaterTracker.CONSTANTS.YEAR_DAYS;

        // Calculate offset
        const offsetDays = Math.abs(this.currentOffset) * daysToShow;

        for (let i = 0; i < daysToShow; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i - offsetDays);
            const dateStr = date.toDateString();

            const dayData = this.historicalData[dateStr] || {
                glasses: 0,
                goal: this.dailyGoal,
                goalMax: this.maxGoal,
                date: dateStr
            };

            days.push({
                ...dayData,
                goalMax: dayData.goalMax || this.maxGoal,
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                dayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                isToday: i === 0 && this.currentOffset === 0
            });
        }

        return days;
    }

    /**
     * Render the history list
     * @param {DayData[]} days - Array of day data
     */
    renderHistoryList(days) {
        if (!this.elements.historyList) return;

        if (this.currentPeriod === 'week') {
            const displayDays = days.slice(0, WaterTracker.CONSTANTS.WEEK_DAYS);
            this.elements.historyList.innerHTML = displayDays.map(day => {
                const displayGoal = day.goalMax || day.goal;
                const progress = `${day.glasses}/${displayGoal}`;
                const isCompleted = day.glasses >= day.goal;

                return `
                    <div class="history-day">
                        <div class="day-info">
                            <div class="day-name">${this.sanitizeHTML(day.dayName)}</div>
                            <div class="day-date">${this.sanitizeHTML(day.dayDate)}</div>
                        </div>
                        <div class="day-progress ${isCompleted ? 'completed' : ''}">${this.sanitizeHTML(progress)}</div>
                    </div>
                `;
            }).join('');
        } else if (this.currentPeriod === 'month') {
            const weeks = this.groupDataByWeeks(days);
            this.elements.historyList.innerHTML = weeks.map(week => {
                const avgGlasses = week.daysWithData > 0 ? (week.totalGlasses / week.daysWithData).toFixed(1) : '0.0';
                const successRate = week.daysWithData > 0 ? Math.round((week.successDays / week.daysWithData) * 100) : 0;

                return `
                    <div class="history-day">
                        <div class="day-info">
                            <div class="day-name">Week ${week.weekNumber}</div>
                            <div class="day-date">${this.sanitizeHTML(week.dateRange)}</div>
                        </div>
                        <div class="day-progress ${successRate >= 80 ? 'completed' : ''}">${avgGlasses} avg (${successRate}%)</div>
                    </div>
                `;
            }).join('');
        } else { // year
            const months = this.groupDataByMonths(days);
            this.elements.historyList.innerHTML = months.map(month => {
                const avgGlasses = month.daysWithData > 0 ? (month.totalGlasses / month.daysWithData).toFixed(1) : '0.0';
                const successRate = month.daysWithData > 0 ? Math.round((month.successDays / month.daysWithData) * 100) : 0;

                return `
                    <div class="history-day">
                        <div class="day-info">
                            <div class="day-name">${this.sanitizeHTML(month.monthName)}</div>
                            <div class="day-date">${month.year}</div>
                        </div>
                        <div class="day-progress ${successRate >= 80 ? 'completed' : ''}">${avgGlasses} avg (${successRate}%)</div>
                    </div>
                `;
            }).join('');
        }
    }

    /**
     * Update history summary statistics
     * @param {Array} days - Array of day data
     */
    updateHistorySummary(days) {
        if (!this.elements.avgGlasses || !this.elements.goalDays) return;

        const validDays = days.filter(day => day.glasses > 0);
        const totalGlasses = validDays.reduce((sum, day) => sum + day.glasses, 0);
        const avgGlasses = validDays.length > 0 ? totalGlasses / validDays.length : 0;
        const goalDays = days.filter(day => day.glasses >= day.goal).length;

        this.elements.avgGlasses.textContent = `${avgGlasses.toFixed(1)} cups`;
        this.elements.goalDays.textContent = `${goalDays} days`;
    }

    /**
     * Update the date range display
     */
    updateDateRange() {
        if (!this.elements.dateRange) return;

        const today = new Date();
        let startDate, endDate;

        let daysToShow = WaterTracker.CONSTANTS.WEEK_DAYS;
        if (this.currentPeriod === 'month') daysToShow = WaterTracker.CONSTANTS.MONTH_DAYS;
        if (this.currentPeriod === 'year') daysToShow = WaterTracker.CONSTANTS.YEAR_DAYS;

        const offsetDays = Math.abs(this.currentOffset) * daysToShow;

        endDate = new Date(today);
        endDate.setDate(today.getDate() - offsetDays);

        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - (daysToShow - 1));

        const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        this.elements.dateRange.textContent = `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }

    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        if (!this.elements.nextPeriod) return;

        // Disable next button if at current period
        if (this.currentOffset === 0) {
            this.elements.nextPeriod.disabled = true;
        } else {
            this.elements.nextPeriod.disabled = false;
        }
    }

    /**
     * Navigate through different time periods with debouncing
     * @param {number} direction - -1 for previous, 1 for next
     */
    navigatePeriod(direction) {
        if (this._navigating) return;

        this._navigating = true;
        this.currentOffset += direction;

        // Prevent navigating into the future
        if (this.currentOffset > 0) {
            this.currentOffset = 0;
        }

        this.updateHistory();

        setTimeout(() => {
            this._navigating = false;
        }, 300);
    }

    /**
     * Group data by weeks for month view
     * @param {Array} days - Array of day data
     * @returns {Array} Array of week data
     */
    groupDataByWeeks(days) {
        const weeks = [];
        const monthDays = days.slice(0, WaterTracker.CONSTANTS.MONTH_DAYS);

        for (let i = 0; i < monthDays.length; i += WaterTracker.CONSTANTS.WEEK_DAYS) {
            const weekDays = monthDays.slice(i, i + WaterTracker.CONSTANTS.WEEK_DAYS);
            const daysWithData = weekDays.filter(day => day.glasses > 0);
            const totalGlasses = weekDays.reduce((sum, day) => sum + day.glasses, 0);
            const successDays = weekDays.filter(day => day.glasses >= day.goal).length;

            const startDate = weekDays[weekDays.length - 1];
            const endDate = weekDays[0];

            weeks.push({
                weekNumber: Math.floor(i / WaterTracker.CONSTANTS.WEEK_DAYS) + 1,
                dateRange: `${startDate.dayDate} - ${endDate.dayDate}`,
                totalGlasses,
                daysWithData: daysWithData.length || 1,
                successDays
            });
        }

        return weeks.slice(0, 4); // Show last 4 weeks
    }

    /**
     * Group data by months for year view
     * @param {Array} days - Array of day data
     * @returns {Array} Array of month data
     */
    groupDataByMonths(days) {
        const monthsData = {};

        days.forEach(day => {
            const date = new Date(day.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

            if (!monthsData[monthKey]) {
                monthsData[monthKey] = {
                    monthName: date.toLocaleDateString('en-US', { month: 'long' }),
                    year: date.getFullYear(),
                    totalGlasses: 0,
                    daysWithData: 0,
                    successDays: 0
                };
            }

            if (day.glasses > 0) {
                monthsData[monthKey].totalGlasses += day.glasses;
                monthsData[monthKey].daysWithData++;
                if (day.glasses >= day.goal) {
                    monthsData[monthKey].successDays++;
                }
            }
        });

        return Object.values(monthsData).slice(0, 12); // Last 12 months
    }

    /**
     * Open settings modal
     */
    openSettings() {
        if (!this.elements.settingsModal) return;

        this.elements.settingsModal.style.display = 'block';

        // Add escape key handler
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeSettings();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    /**
     * Close settings modal
     */
    closeSettings() {
        if (!this.elements.settingsModal) return;

        this.elements.settingsModal.style.display = 'none';

        // Remove escape key handler
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
    }

    /**
     * Export all data as JSON file
     */
    exportData() {
        const exportData = {
            historicalData: this.historicalData,
            settings: {
                dailyGoal: this.dailyGoal,
                maxGoal: this.maxGoal
            },
            exportDate: new Date().toISOString(),
            appVersion: WaterTracker.CONSTANTS.APP_VERSION
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `water-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(link.href);

        this.showMessage('Data exported successfully!', 'success');
    }

    /**
     * Validate import data structure
     * @param {Object} data - Data to validate
     * @returns {boolean} True if valid
     */
    validateImportData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid file format');
        }

        if (!data.historicalData || typeof data.historicalData !== 'object') {
            throw new Error('Missing historical data');
        }

        if (!data.appVersion || typeof data.appVersion !== 'string') {
            throw new Error('Missing app version');
        }

        // Validate historical data structure
        for (const [date, entry] of Object.entries(data.historicalData)) {
            if (typeof entry.glasses !== 'number' || entry.glasses < 0 || entry.glasses > 20) {
                throw new Error(`Invalid data for ${date}`);
            }
        }

        return true;
    }

    /**
     * Import data from JSON file
     * @param {File} file - The file to import
     */
    async importData(file) {
        if (!file) return;

        const button = this.elements.importData;
        const originalText = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = '📥 Importing...';
        }

        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            // Validate data structure
            this.validateImportData(importData);

            const dayCount = Object.keys(importData.historicalData).length;
            const confirmRestore = confirm(
                `This will restore ${dayCount} days of data from ${new Date(importData.exportDate).toLocaleDateString()}. This will overwrite your current history. Continue?`
            );

            if (!confirmRestore) return;

            this.historicalData = importData.historicalData;

            if (importData.settings) {
                if (typeof importData.settings.dailyGoal === 'number') {
                    this.dailyGoal = importData.settings.dailyGoal;
                }
                if (typeof importData.settings.maxGoal === 'number') {
                    this.maxGoal = Math.min(importData.settings.maxGoal, WaterTracker.CONSTANTS.MAX_DAILY_GOAL);
                }
            }

            // Reload today's data
            const today = new Date().toDateString();
            if (this.historicalData[today]) {
                this.currentGlasses = this.historicalData[today].glasses;
                this.maxGoal = this.historicalData[today].goalMax || this.maxGoal;
                this.dailyGoal = this.historicalData[today].goal || this.dailyGoal;
            }

            this.maxGoal = WaterTracker.CONSTANTS.MAX_DAILY_GOAL;
            this.dailyGoal = Math.min(Math.max(this.dailyGoal, WaterTracker.CONSTANTS.MIN_DAILY_GOAL), this.maxGoal);
            this.currentGlasses = Math.min(this.currentGlasses, this.maxGoal);

            this.saveData();
            this.updateDisplay();
            this.updateHistory();

            this.showMessage(`Successfully restored ${dayCount} days of data!`, 'success');

        } catch (error) {
            Logger.error('Import error:', error);
            this.showMessage('Failed to import data. Please check the file format.', 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = originalText;
            }
            if (this.elements.importFile) {
                this.elements.importFile.value = '';
            }
        }
    }

    /**
     * Reset all data
     */
    resetAllData() {
        this.currentGlasses = 0;
        this.historicalData = {};
        this.dailyGoal = WaterTracker.CONSTANTS.MIN_DAILY_GOAL;
        this.maxGoal = WaterTracker.CONSTANTS.MAX_DAILY_GOAL;

        try {
            localStorage.removeItem('waterTrackerHistory');
            localStorage.removeItem('waterTrackerSettings');
        } catch (error) {
            Logger.error('Failed to clear storage:', error);
        }

        this.updateDisplay();
        this.updateHistory();
        this.closeSettings();

        this.showMessage('All data has been reset', 'success');
    }

    /**
     * Show a message to the user
     * @param {string} message - Message text
     * @param {string} type - 'info', 'success', or 'error'
     */
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            z-index: 1002;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            max-width: 90%;
            text-align: center;
        `;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            if (document.body.contains(messageDiv)) {
                document.body.removeChild(messageDiv);
            }
        }, WaterTracker.CONSTANTS.MESSAGE_DURATION);
    }

    /**
     * Check for service worker updates
     */
    async checkForUpdates() {
        if (!this.elements.checkUpdates) return;

        const button = this.elements.checkUpdates;
        button.textContent = '🔄 Checking...';
        button.disabled = true;

        const resetButton = () => {
            button.textContent = '🔄 Check Updates';
            button.disabled = false;
        };

        if (!('serviceWorker' in navigator)) {
            setTimeout(() => {
                resetButton();
                this.showMessage('Please reload the page to check for updates', 'info');
            }, 500);
            return;
        }

        try {
            let registration = await navigator.serviceWorker.getRegistration();

            if (!registration) {
                try {
                    registration = await navigator.serviceWorker.ready;
                } catch (readyError) {
                    Logger.warn('Service worker ready promise failed:', readyError);
                }
            }

            if (!registration) {
                this.showMessage('No service worker found yet. Please reopen the app.', 'info');
                resetButton();
                return;
            }

            const showBannerIfWaiting = () => {
                const waitingWorker = registration.waiting;

                if (!waitingWorker) {
                    return false;
                }

                if (typeof window.WaterTrackerSW !== 'undefined' &&
                    typeof window.WaterTrackerSW.showUpdateNotification === 'function') {
                    window.WaterTrackerSW.showUpdateNotification();
                } else {
                    this.showMessage('Update ready - close and reopen to apply', 'info');
                }

                return true;
            };

            if (showBannerIfWaiting()) {
                resetButton();
                return;
            }

            const updateResult = await Promise.race([
                registration.update().then(() => 'updated'),
                new Promise((resolve) => setTimeout(() => resolve('timeout'), 6000))
            ]);

            if (updateResult === 'timeout') {
                Logger.warn('Service worker update() timed out');
            }

            if (showBannerIfWaiting()) {
                resetButton();
                return;
            }

            const installingWorker = registration.installing;
            if (installingWorker) {
                const onStateChange = () => {
                    if (installingWorker.state === 'installed') {
                        installingWorker.removeEventListener('statechange', onStateChange);
                        showBannerIfWaiting();
                    }
                };

                installingWorker.addEventListener('statechange', onStateChange);
                if (updateResult === 'timeout') {
                    this.showMessage('Update is still downloading… keep the app open', 'info');
                } else {
                    this.showMessage('Update found. Preparing install…', 'info');
                }
            } else {
                this.showMessage('Already running the latest version', 'info');
            }
        } catch (error) {
            Logger.error('Manual update check failed:', error);
            this.showMessage('Update check failed. Try again later.', 'error');
        } finally {
            resetButton();
        }
    }
}

// Initialize the app
let waterTracker;

document.addEventListener('DOMContentLoaded', () => {
    waterTracker = new WaterTracker();
});
