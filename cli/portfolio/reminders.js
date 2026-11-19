const crypto = require('node:crypto');
const { readState, writeState } = require('./store');

function isoDate(value) {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw new Error('Due date must be an ISO datetime, e.g. 2026-12-01T09:00:00+07:00.');
  return parsed.toISOString();
}

function addReminder(title, dueAt, notes = '') {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new Error('Reminder title is required.');
  const state = readState();
  state.reminders.push({ id: crypto.randomUUID(), title: cleanTitle, dueAt: isoDate(dueAt), notes: String(notes || '').trim(), completedAt: null });
  return writeState(state);
}

function listReminders(includeCompleted = false) {
  const state = readState();
  const now = Date.now();
  return state.reminders
    .filter((reminder) => includeCompleted || !reminder.completedAt)
    .map((reminder) => ({
      ...reminder,
      status: reminder.completedAt ? 'completed' : new Date(reminder.dueAt).getTime() <= now ? 'due' : 'upcoming',
    }))
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
}

function findReminder(state, id) {
  const reminder = state.reminders.find((item) => item.id === id || item.id.startsWith(id));
  if (!reminder) throw new Error(`Reminder ${id} not found.`);
  return reminder;
}

function completeReminder(id) {
  const state = readState();
  findReminder(state, id).completedAt = new Date().toISOString();
  return writeState(state);
}

function deleteReminder(id) {
  const state = readState();
  const target = findReminder(state, id);
  state.reminders = state.reminders.filter((item) => item.id !== target.id);
  return writeState(state);
}

module.exports = { addReminder, listReminders, completeReminder, deleteReminder };
