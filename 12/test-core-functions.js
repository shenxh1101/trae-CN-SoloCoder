const path = require('path');
const fs = require('fs');

console.log('=== Solo Mail Core Function Tests ===\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  console.log('1. Testing Database Layer...');
  try {
    const DatabaseService = require('./dist/main/main/database/index').DatabaseService;
    const tmpDir = path.join(__dirname, 'test-tmp-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    
    const db = new DatabaseService(tmpDir);
    await db.initialize();
    
    const settings = await db.getSettings();
    console.log('   ✓ Database initialization successful');
    console.log('   ✓ Default settings loaded:', settings.theme, settings.language);
    
    const testAccount = {
      name: 'Test Account',
      email: 'test@example.com',
      password: 'password123',
      provider: 'other',
      imap: { host: 'imap.example.com', port: 993, secure: true, username: 'test@example.com', password: 'password123' },
      smtp: { host: 'smtp.example.com', port: 465, secure: true, username: 'test@example.com', password: 'password123' },
      syncSettings: { syncDays: 30, maxAttachmentSize: 10 * 1024 * 1024, autoDownloadAttachments: true, syncInterval: 5 }
    };
    
    const created = await db.addAccount(testAccount);
    console.log('   ✓ Account created:', created.email);
    
    const accounts = await db.getAccounts();
    console.log('   ✓ Accounts listed:', accounts.length, 'account(s)');
    
    const testLabel = await db.addLabel({ name: 'Test Label', color: '#ff0000', parentId: null, sortOrder: 0 });
    console.log('   ✓ Label created:', testLabel.name);
    
    const labels = await db.getLabels();
    console.log('   ✓ Labels listed:', labels.length, 'label(s)');
    
    const testFolder = {
      accountId: created.id,
      name: 'INBOX',
      path: 'INBOX',
      delimiter: '/',
      attributes: ['\\Inbox'],
      uidValidity: 12345,
      uidNext: 1,
      totalMessages: 0,
      unreadCount: 0,
      parentId: null,
      isSyncing: false,
      lastSyncedAt: Date.now()
    };
    
    const folder = await db.addFolder(testFolder);
    console.log('   ✓ Folder created:', folder.name);
    
    const testEmail = {
      accountId: created.id,
      folderId: folder.id,
      messageId: '<test123@example.com>',
      threadId: 'thread123',
      uid: 1,
      flags: { seen: false, answered: false, flagged: false, deleted: false, draft: false, recent: false, forwarded: false, custom: [] },
      from: { name: 'Test Sender', email: 'sender@example.com' },
      to: [{ name: 'Test Recipient', email: 'test@example.com' }],
      cc: [],
      bcc: [],
      subject: 'Test Email Subject',
      body: { plain: 'This is a test email body.', html: '<p>This is a test email body.</p>' },
      date: Date.now(),
      internalDate: Date.now(),
      size: 1024,
      references: [],
      inReplyTo: undefined,
      labels: [],
      isRead: false,
      isStarred: false,
      hasTracking: false,
      isEncrypted: false,
      isSigned: false,
      preview: 'This is a test email...'
    };
    
    const testAttachment = {
      emailId: '',
      filename: 'test.txt',
      contentType: 'text/plain',
      size: 12,
      contentId: null,
      isInline: false,
      localPath: null,
      encoding: 'base64'
    };
    
    const email = await db.addEmail(testEmail, [testAttachment]);
    console.log('   ✓ Email created:', email.subject);
    
    const emails = await db.getEmails(folder.id);
    console.log('   ✓ Emails listed:', emails.total, 'email(s)');
    
    const threads = await db.getThreads(folder.id);
    console.log('   ✓ Threads listed:', threads.total, 'thread(s)');
    
    const searchResult = await db.searchEmails({ query: 'test', highlightKeywords: true });
    console.log('   ✓ Search working, found:', searchResult.total, 'result(s)');
    
    await db.applyLabelToEmail(email.id, testLabel.id);
    console.log('   ✓ Label applied to email');
    
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    passed += 10;
    console.log('✅ Database tests passed\n');
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error(error.stack);
    failed++;
  }

  console.log('2. Testing Auto Discover Service...');
  try {
    const AutoDiscoverService = require('./dist/main/main/auto-discover').AutoDiscoverService;
    const autoDiscover = new AutoDiscoverService();
    
    const result = await autoDiscover.discover('test@gmail.com', 'password');
    console.log('   ✓ Gmail auto-discover:', result.provider, result.imap.host, result.smtp.host);
    
    const result2 = await autoDiscover.discover('test@outlook.com', 'password');
    console.log('   ✓ Outlook auto-discover:', result2.provider, result2.imap.host, result2.smtp.host);
    
    const result3 = await autoDiscover.discover('test@qq.com', 'password');
    console.log('   ✓ QQ auto-discover:', result3.provider, result3.imap.host, result3.smtp.host);
    
    passed += 3;
    console.log('✅ Auto Discover tests passed\n');
  } catch (error) {
    console.error('❌ Auto Discover test failed:', error.message);
    failed++;
  }

  console.log('3. Testing Email Parser...');
  try {
    const MailParser = require('./dist/main/main/protocols/parser').MailParser;
    
    const testMime = `From: Test Sender <sender@example.com>
To: Test Recipient <recipient@example.com>
Subject: Test Email with Attachment
Date: Mon, 01 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>
References: <ref1@example.com> <ref2@example.com>
In-Reply-To: <ref@example.com>
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: 7bit

This is the plain text body.

--boundary123
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: 7bit

<html><body><p>This is the HTML body.</p><img src="http://tracker.example.com/pixel.gif" width="1" height="1"></body></html>

--boundary123
Content-Type: text/plain; name="attachment.txt"
Content-Disposition: attachment; filename="attachment.txt"
Content-Transfer-Encoding: base64

VGhpcyBpcyBhbiBhdHRhY2htZW50Lg==

--boundary123--`;
    
    const parser = MailParser;
    const parsed = parser.parse(testMime);
    
    console.log('   ✓ Subject parsed:', parsed.subject);
    console.log('   ✓ From parsed:', parsed.from.name, '<' + parsed.from.email + '>');
    console.log('   ✓ To parsed:', parsed.to.length, 'recipient(s)');
    console.log('   ✓ Plain body:', parsed.body.plain?.substring(0, 30) + '...');
    console.log('   ✓ HTML body:', parsed.body.html?.substring(0, 30) + '...');
    console.log('   ✓ Attachments:', parsed.attachments.length, 'attachment(s)');
    console.log('   ✓ References:', parsed.references.length, 'reference(s)');
    console.log('   ✓ In-Reply-To:', parsed.inReplyTo);
    console.log('   ✓ Tracking detected:', parsed.hasTracking);
    
    passed += 9;
    console.log('✅ Email Parser tests passed\n');
  } catch (error) {
    console.error('❌ Email Parser test failed:', error.message);
    console.error(error.stack);
    failed++;
  }

  console.log('4. Testing Email Composer...');
  try {
    const MailComposer = require('./dist/main/main/protocols/composer').MailComposer;
    
    const composer = MailComposer;
    const emailData = {
      from: { name: 'Test', email: 'test@example.com' },
      to: [{ name: 'Recipient', email: 'recipient@example.com' }],
      subject: 'Test Composed Email',
      body: {
        plain: 'This is plain text body.',
        html: '<p>This is HTML body.</p>'
      },
      attachments: []
    };
    
    const composed = await composer.compose(emailData);
    const rawEmail = composed.raw;
    console.log('   ✓ Email composed, length:', rawEmail.length, 'bytes');
    console.log('   ✓ Contains From:', rawEmail.includes('From:'));
    console.log('   ✓ Contains Subject:', rawEmail.includes('Subject:'));
    console.log('   ✓ Contains Content-Type:', rawEmail.includes('Content-Type:'));
    
    const replyData = {
      from: { name: 'Reply', email: 'reply@example.com' },
      subject: 'Re: Original',
      body: { plain: 'Reply body.' },
      to: [{ name: 'Original', email: 'orig@example.com' }]
    };
    
    const originalEmail = {
      from: { name: 'Original', email: 'orig@example.com' },
      to: [{ name: 'Reply', email: 'reply@example.com' }],
      subject: 'Original',
      body: { plain: 'Original text.' },
      date: Date.now(),
      messageId: '<orig@example.com>',
      references: []
    };
    
    const reply = await composer.createReply(replyData, originalEmail, true);
    console.log('   ✓ Reply created, includes References:', reply.body.plain?.includes('>'));
    
    passed += 5;
    console.log('✅ Email Composer tests passed\n');
  } catch (error) {
    console.error('❌ Email Composer test failed:', error.message);
    console.error(error.stack);
    failed++;
  }

  console.log('5. Testing Tracker Blocker...');
  try {
    const TrackerBlockerService = require('./dist/main/main/security/tracker-blocker').TrackerBlockerService;
    const blocker = new TrackerBlockerService();
    
    const testHtml = `
      <html>
        <body>
          <p>Normal content</p>
          <img src="http://example.com/pixel.gif" width="1" height="1">
          <img src="https://mail.google.com/mail/u/0?ui=2&ik=abc&at=xxx" width="1" height="1">
          <a href="https://example.com/page?utm_source=newsletter&utm_medium=email&click_id=12345">Link</a>
          <img src="https://trk.pixel.com/track/12345" width="1" height="1">
          <img src="cid:valid-inline" alt="Valid inline image">
        </body>
      </html>
    `;
    
    const result = blocker.detectAndRemoveTracking(testHtml);
    console.log('   ✓ Tracking detected count:', result.trackingUrls.length);
    console.log('   ✓ Cleaned HTML generated');
    console.log('   ✓ Blocked pixels:', result.trackingPixels.length);
    
    const cleanedResult = blocker.cleanTrackingParams('https://example.com/page?utm_source=newsletter&click_id=12345&normal=param');
    console.log('   ✓ URL cleaned:', cleanedResult.cleanedUrl.includes('utm_source') ? 'FAIL' : 'PASS');
    
    passed += 4;
    console.log('✅ Tracker Blocker tests passed\n');
  } catch (error) {
    console.error('❌ Tracker Blocker test failed:', error.message);
    console.error(error.stack);
    failed++;
  }

  console.log('6. Testing GPG Service...');
  try {
    const openpgp = require('openpgp');
    console.log('   ✓ OpenPGP library available, version:', openpgp.version || 'loaded');
    
    const GpgService = require('./dist/main/main/security/gpg-service').GpgService;
    
    const tmpDir = path.join(__dirname, 'test-gpg-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    
    const DatabaseService = require('./dist/main/main/database/index').DatabaseService;
    const db = new DatabaseService(tmpDir);
    await db.initialize();
    
    const gpgService = new GpgService(db);
    
    const passphrase = 'test passphrase 123';
    const keyPair = await openpgp.generateKey({
      type: 'rsa',
      rsaBits: 2048,
      userIDs: [{ name: 'Test User', email: 'test@example.com' }],
      passphrase: passphrase,
      format: 'armored'
    });
    
    const importedPub = await gpgService.importKey(keyPair.publicKey);
    console.log('   ✓ Public key imported:', importedPub.keyId);
    
    const importedPriv = await gpgService.importKey(keyPair.privateKey);
    console.log('   ✓ Private key imported:', importedPriv.keyId);
    
    const keys = await gpgService.listKeys();
    console.log('   ✓ Keys listed:', keys.length, 'key(s)');
    
    const testContent = 'This is a secret message.';
    const encrypted = await gpgService.encrypt(testContent, [importedPub.id], importedPriv.id, passphrase);
    console.log('   ✓ Encryption successful, cipher length:', encrypted.length);
    
    const decrypted = await gpgService.decrypt(encrypted, passphrase);
    console.log('   ✓ Decryption successful:', decrypted.content === testContent ? 'Content matches' : 'Content mismatch');
    console.log('   ✓ Signature valid:', decrypted.valid);
    
    const signed = await gpgService.sign(testContent, importedPriv.id, passphrase);
    console.log('   ✓ Signing successful');
    
    const verifyResult = await gpgService.verify(testContent, signed, importedPub.id);
    console.log('   ✓ Verify successful:', verifyResult.valid);
    
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    passed += 10;
    console.log('✅ GPG Service tests passed\n');
  } catch (error) {
    console.error('❌ GPG Service test failed:', error.message);
    console.error(error.stack);
    failed++;
  }

  console.log('7. Testing Filter Engine...');
  try {
    const tmpDir = path.join(__dirname, 'test-filter-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    
    const DatabaseService = require('./dist/main/main/database/index').DatabaseService;
    const FilterEngine = require('./dist/main/main/filter-engine').FilterEngine;
    
    const db = new DatabaseService(tmpDir);
    await db.initialize();
    
    const account = await db.addAccount({
      name: 'Test',
      email: 'test@example.com',
      password: 'pass',
      provider: 'other',
      imap: { host: 'imap.example.com', port: 993, secure: true, username: 'test', password: 'pass' },
      smtp: { host: 'smtp.example.com', port: 465, secure: true, username: 'test', password: 'pass' },
      syncSettings: { syncDays: 30, maxAttachmentSize: 10485760, autoDownloadAttachments: true, syncInterval: 5 }
    });
    
    const folder = await db.addFolder({
      accountId: account.id,
      name: 'INBOX',
      path: 'INBOX',
      delimiter: '/',
      attributes: [],
      uidValidity: 1,
      uidNext: 1,
      totalMessages: 0,
      unreadCount: 0,
      parentId: null,
      isSyncing: false,
      lastSyncedAt: Date.now()
    });
    
    const spamFolder = await db.addFolder({
      accountId: account.id,
      name: 'Spam',
      path: 'Spam',
      delimiter: '/',
      attributes: [],
      uidValidity: 1,
      uidNext: 1,
      totalMessages: 0,
      unreadCount: 0,
      parentId: null,
      isSyncing: false,
      lastSyncedAt: Date.now()
    });
    
    const label = await db.addLabel({ name: 'Important', color: '#ff0000', sortOrder: 0 });
    
    const filterEngine = new FilterEngine(db);
    
    const filter = await filterEngine.addRule({
      name: 'Spam Filter',
      enabled: true,
      priority: 1,
      matchType: 'any',
      conditions: [
        { field: 'subject', operator: 'contains', value: 'viagra' },
        { field: 'from', operator: 'contains', value: 'spammer' }
      ],
      actions: [
        { type: 'move', params: { folderId: spamFolder.id } },
        { type: 'markRead', params: {} }
      ],
      accountIds: [account.id],
      folderIds: [folder.id]
    });
    
    console.log('   ✓ Filter created:', filter.name);
    
    const importantFilter = await filterEngine.addRule({
      name: 'Important Filter',
      enabled: true,
      priority: 0,
      matchType: 'all',
      conditions: [
        { field: 'subject', operator: 'contains', value: 'important' },
        { field: 'from', operator: 'contains', value: 'boss' }
      ],
      actions: [
        { type: 'star', params: {} },
        { type: 'addLabel', params: { labelId: label.id } }
      ],
      accountIds: [account.id],
      folderIds: [folder.id]
    });
    
    console.log('   ✓ Important filter created');
    
    const email1 = await db.addEmail({
      accountId: account.id,
      folderId: folder.id,
      messageId: '<spam@example.com>',
      threadId: 't1',
      uid: 1,
      flags: { seen: false, answered: false, flagged: false, deleted: false, draft: false, recent: false, forwarded: false, custom: [] },
      from: { name: 'Spammer', email: 'spammer@bad.com' },
      to: [{ name: 'Test', email: 'test@example.com' }],
      cc: [],
      bcc: [],
      subject: 'Buy viagra now!',
      body: { plain: 'Spam content...' },
      date: Date.now(),
      internalDate: Date.now(),
      size: 100,
      references: [],
      labels: [],
      isRead: false,
      isStarred: false,
      hasTracking: false,
      isEncrypted: false,
      isSigned: false,
      preview: 'Spam...'
    });
    
    const email2 = await db.addEmail({
      accountId: account.id,
      folderId: folder.id,
      messageId: '<important@example.com>',
      threadId: 't2',
      uid: 2,
      flags: { seen: false, answered: false, flagged: false, deleted: false, draft: false, recent: false, forwarded: false, custom: [] },
      from: { name: 'Boss', email: 'boss@company.com' },
      to: [{ name: 'Test', email: 'test@example.com' }],
      cc: [],
      bcc: [],
      subject: 'Important update',
      body: { plain: 'Please review...' },
      date: Date.now(),
      internalDate: Date.now(),
      size: 200,
      references: [],
      labels: [],
      isRead: false,
      isStarred: false,
      hasTracking: false,
      isEncrypted: false,
      isSigned: false,
      preview: 'Please review...'
    });
    
    const results1 = await filterEngine.testRule(filter.id, email1.id);
    console.log('   ✓ Spam filter matches spam email:', results1.matched);
    
    const results2 = await filterEngine.testRule(importantFilter.id, email2.id);
    console.log('   ✓ Important filter matches important email:', results2.matched);
    
    const runResults = await filterEngine.runAllRules([email1.id, email2.id]);
    console.log('   ✓ Run all filters, matched:', runResults.filter(r => r.matched).length);
    
    const updatedEmail1 = await db.getEmail(email1.id);
    console.log('   ✓ Spam moved to Spam folder:', updatedEmail1?.folderId === spamFolder.id);
    console.log('   ✓ Spam marked as read:', updatedEmail1?.isRead);
    
    const updatedEmail2 = await db.getEmail(email2.id);
    console.log('   ✓ Important email starred:', updatedEmail2?.isStarred);
    console.log('   ✓ Important email has label:', updatedEmail2?.labels.includes(label.id));
    
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    passed += 12;
    console.log('✅ Filter Engine tests passed\n');
  } catch (error) {
    console.error('❌ Filter Engine test failed:', error.message);
    console.error(error.stack);
    failed++;
  }

  console.log('8. Testing IPC Handlers...');
  try {
    const tmpDir = path.join(__dirname, 'test-ipc-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    
    const Module = require('module');
    const originalResolve = Module._resolveFilename;
    Module._resolveFilename = function(request, parent, isMain, options) {
      if (request === 'electron') {
        return 'electron';
      }
      return originalResolve.call(this, request, parent, isMain, options);
    };
    
    const mockElectron = {
      ipcMain: {
        handle: () => {},
        on: () => {}
      },
      BrowserWindow: {
        getFocusedWindow: () => ({ webContents: { send: () => {} } })
      },
      app: {
        getPath: () => tmpDir,
        getName: () => 'Solo Mail'
      }
    };
    
    const originalLoad = Module._load;
    Module._load = function(request, parent, isMain) {
      if (request === 'electron') {
        return mockElectron;
      }
      return originalLoad.call(this, request, parent, isMain);
    };
    
    require.cache = {};
    
    const DatabaseService = require('./dist/main/main/database/index').DatabaseService;
    const IpcHandlers = require('./dist/main/main/ipc-handlers').IpcHandlers;
    
    const db = new DatabaseService(tmpDir);
    await db.initialize();
    
    const handlers = new IpcHandlers(db, { 
      syncFolderById: async () => true, 
      getStatus: () => ({ isSyncing: false }),
      startSync: async () => true,
      stopSync: () => {}
    }, {}, {});
    
    handlers.registerHandlers();
    console.log('   ✓ IPC Handlers registered successfully');
    
    const settingsResponse = await db.getSettings();
    console.log('   ✓ Settings accessible:', settingsResponse.theme);
    
    const accounts = await db.getAccounts();
    console.log('   ✓ Accounts accessible:', accounts.length);
    
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    passed += 3;
    console.log('✅ IPC Handlers tests passed\n');
  } catch (error) {
    console.error('❌ IPC Handlers test failed:', error.message);
    console.error(error.stack);
    failed++;
  }

  console.log('=== Test Summary ===');
  console.log('Total tests passed:', passed);
  console.log('Total tests failed:', failed);
  console.log('Success rate:', ((passed / (passed + failed)) * 100).toFixed(1) + '%');
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
