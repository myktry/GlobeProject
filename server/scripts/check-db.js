#!/usr/bin/env node
import { initDB, getAdmin, getSettings, getQuestions } from '../db.js';

(async () => {
  try {
    await initDB();
    const admin = getAdmin();
    const settings = getSettings();
    const questions = getQuestions();

    console.log('Admin:', admin);
    console.log('Settings:', settings);
    console.log('Questions count:', questions.length);
    console.log('First 5 questions:', questions.slice(0, 5));
  } catch (err) {
    console.error('Check DB failed:', err);
    process.exitCode = 1;
  }
})();
