// ===== Focus Timer — Legacy Module =====
// All focus timer code has been split into:
//   focus-engine.js — Core timer engine (FocusTimer IIFE, constants, audio, helpers)
//   focus-stats.js  — Statistics and weekly summary
//   focus-ui.js     — UI rendering and overlay
//
// This file remains for backward compatibility.
// All functions are already exported on window by their respective modules.
//
// Global exposure (window aliases for globalThis compatibility):
if (typeof globalThis !== 'undefined') {
    globalThis.FocusTimer = window.FocusTimer;
    globalThis.renderFocusTimerCard = window.renderFocusTimerCard;
    globalThis.openFocusOverlay = window.openFocusOverlay;
    globalThis.closeFocusOverlay = window.closeFocusOverlay;
    globalThis.updateFocusTimerHeaderIndicator = window.updateFocusTimerHeaderIndicator;
    globalThis.getFocusTimerRemainingSeconds = window.getFocusTimerRemainingSeconds;
    globalThis.setFocusWeeklyGoalMinutes = window.setFocusWeeklyGoalMinutes;
    globalThis.queuePersistFocusWeeklyGoal = window.queuePersistFocusWeeklyGoal;
    globalThis.refreshFocusWeeklySummaryIfVisible = window.refreshFocusWeeklySummaryIfVisible;
    globalThis.renderFocusWeeklySummary = window.renderFocusWeeklySummary;
    globalThis.renderFocusPastWeeksSummary = window.renderFocusPastWeeksSummary;
    globalThis.formatFocusWeekRange = window.formatFocusWeekRange;
    globalThis.stopFocusWithNote = window.stopFocusWithNote;
    globalThis.FOCUS_WEEKLY_HISTORY_WEEKS = window.FOCUS_WEEKLY_HISTORY_WEEKS;
    globalThis.clampFocusWeeklyGoalMinutes = window.clampFocusWeeklyGoalMinutes;
    globalThis.pickMostRecentFocusSessions = window.pickMostRecentFocusSessions;
    globalThis.focusSessionOverlapsRange = window.focusSessionOverlapsRange;
    globalThis.renderFocusSessionRow = window.renderFocusSessionRow;
    globalThis.formatFocusSessionWhen = window.formatFocusSessionWhen;
    globalThis.getFocusSessionBadgeText = window.getFocusSessionBadgeText;
    globalThis.getFocusSessionSortTime = window.getFocusSessionSortTime;
    globalThis.refreshFocusHistoryPreview = window.refreshFocusHistoryPreview;
    globalThis.FOCUS_POMODORO_PRESETS = window.FOCUS_POMODORO_PRESETS;
    globalThis.FOCUS_SESSION_MIN_SAVE_SEC = window.FOCUS_SESSION_MIN_SAVE_SEC;
    globalThis.FOCUS_POMODORO_CYCLES_BEFORE_LONG_BREAK = window.FOCUS_POMODORO_CYCLES_BEFORE_LONG_BREAK;
}
