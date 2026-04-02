const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, dbAll, dbGet, dbRun } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// Service email désactivé temporairement
console.log('⚠️ Service email désactivé temporairement');
const sendEmail = null;
const createReplyHTML = null;
