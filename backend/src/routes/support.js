const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const pool = require('../config/db');

const PREDEFINED_FAQS = {
  'How to earn minutes?': 'To get calling minutes, purchase coin packages from the Wallet / Coin store. Packages start from just ₹9! You can also win bonus coins and gifts on the Fortune Wheel! 🎯',
  'Send gifts during call': 'To send a gift during a call, tap the 🎁 Gift icon at the bottom of the call screen. Choose from Roses, Diamonds, Crowns, Cars, or Castles to send them instantly! ✨',
  'Fortune Wheel help': 'Go to the Fortune Wheel from the side menu (Lucky Spin). Spin to win exciting gifts, coin bonuses, and special rewards! 🎡',
  'Refund query': 'For payment and refund inquiries, our support team will review your account details. If you experienced a failed transaction, it is usually refunded within 24-48 hours. You can also chat with admin here! 💬',
};

function matchPredefinedFaq(text) {
  if (!text) return null;
  const t = text.trim().toLowerCase();
  for (const [question, answer] of Object.entries(PREDEFINED_FAQS)) {
    if (t === question.toLowerCase()) return { question, answer };
  }
  if (t.includes('earn minute') || t.includes('earn minutes') || t.includes('how to earn') || t.includes('how to get minutes')) {
    return { question: 'How to earn minutes?', answer: PREDEFINED_FAQS['How to earn minutes?'] };
  }
  if (t.includes('send gift') || t.includes('send gifts') || t.includes('gift during call')) {
    return { question: 'Send gifts during call', answer: PREDEFINED_FAQS['Send gifts during call'] };
  }
  if (t.includes('fortune wheel') || t.includes('lucky spin') || t.includes('wheel help') || t.includes('spin help')) {
    return { question: 'Fortune Wheel help', answer: PREDEFINED_FAQS['Fortune Wheel help'] };
  }
  if (t.includes('refund query') || t.includes('refund') || t.includes('money back')) {
    return { question: 'Refund query', answer: PREDEFINED_FAQS['Refund query'] };
  }
  return null;
}

// GET /support/messages — Fetch user's support chat history
router.get('/messages', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.query(
      `SELECT id, user_id, sender_type, message, status, is_quick_faq, created_at
       FROM support_messages
       WHERE user_id = ?
       ORDER BY created_at ASC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /support/messages — Send user message
router.post('/messages', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message, is_quick_faq } = req.body;
    const trimmed = (message || '').trim();

    if (!trimmed) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const faqMatch = matchPredefinedFaq(trimmed);
    const isFaq = !!is_quick_faq || !!faqMatch;

    const userMsgId = uuidv4();
    const botMsgId = uuidv4();

    if (isFaq && faqMatch) {
      // 1. Predefined FAQ: Auto reply immediately and mark as resolved/replied
      await pool.query(
        `INSERT INTO support_messages (id, user_id, sender_type, message, status, is_quick_faq, created_at)
         VALUES (?, ?, 'user', ?, 'replied', 1, NOW())`,
        [userMsgId, userId, trimmed]
      );

      await pool.query(
        `INSERT INTO support_messages (id, user_id, sender_type, message, status, is_quick_faq, created_at)
         VALUES (?, ?, 'bot', ?, 'replied', 1, DATE_ADD(NOW(), INTERVAL 1 SECOND))`,
        [botMsgId, userId, faqMatch.answer]
      );

      const [userMsgRows] = await pool.query('SELECT * FROM support_messages WHERE id = ?', [userMsgId]);
      const [botMsgRows] = await pool.query('SELECT * FROM support_messages WHERE id = ?', [botMsgId]);

      return res.json({
        userMessage: userMsgRows[0],
        botMessage: botMsgRows[0],
        isAutoReplied: true,
      });
    }

    // 2. Custom Question: Requires Admin Reply
    await pool.query(
      `INSERT INTO support_messages (id, user_id, sender_type, message, status, is_quick_faq, created_at)
       VALUES (?, ?, 'user', ?, 'pending', 0, NOW())`,
      [userMsgId, userId, trimmed]
    );

    const autoAck = 'Thanks for your message! 🍍 Your question has been forwarded to our support team. An admin will review and reply here shortly.';
    await pool.query(
      `INSERT INTO support_messages (id, user_id, sender_type, message, status, is_quick_faq, created_at)
       VALUES (?, ?, 'bot', ?, 'pending', 0, DATE_ADD(NOW(), INTERVAL 1 SECOND))`,
      [botMsgId, userId, autoAck]
    );

    // Fetch user details to broadcast to Admin
    const [uRows] = await pool.query('SELECT name, phone, gender FROM users WHERE id = ?', [userId]);
    const user = uRows[0] || {};

    const [userMsgRows] = await pool.query('SELECT * FROM support_messages WHERE id = ?', [userMsgId]);
    const [botMsgRows] = await pool.query('SELECT * FROM support_messages WHERE id = ?', [botMsgId]);

    // Emit live socket event to Admin
    const io = req.app.get('io');
    if (io) {
      io.emit('admin:new_support_query', {
        userId,
        userName: user.name || 'User',
        userPhone: user.phone,
        userGender: user.gender,
        message: trimmed,
        created_at: new Date(),
      });
    }

    return res.json({
      userMessage: userMsgRows[0],
      botMessage: botMsgRows[0],
      isAutoReplied: false,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
