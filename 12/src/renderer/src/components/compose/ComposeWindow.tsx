import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { RichTextEditor } from './RichTextEditor';
import { MarkdownEditor } from './MarkdownEditor';
import { AttachmentUploader } from './AttachmentUploader';
import type { EmailContact, Attachment, Email, EmailSignature } from '@shared/types';

type EditorMode = 'richtext' | 'markdown' | 'plain';

const parseContacts = (input: string): EmailContact[] => {
  return input.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const match = s.match(/^(.*?)\s*<([^>]+)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: '', email: s };
  });
};

const contactsToString = (contacts: EmailContact[]): string => {
  return contacts.map(c => c.name ? `${c.name} <${c.email}>` : c.email).join(', ');
};

export const ComposeWindow: React.FC = () => {
  const {
    showCompose,
    composeData,
    setShowCompose,
    accounts,
    signatures,
    selectedAccountId
  } = useStore();

  const [accountId, setAccountId] = useState<string>('');
  const [to, setTo] = useState<EmailContact[]>([]);
  const [cc, setCc] = useState<EmailContact[]>([]);
  const [bcc, setBcc] = useState<EmailContact[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [bodyType, setBodyType] = useState<'html' | 'markdown' | 'plain'>('html');
  const [editorMode, setEditorMode] = useState<EditorMode>('richtext');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [signatureId, setSignatureId] = useState<string | undefined>();
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const currentAccount = accounts.find(a => a.id === accountId) || accounts[0];
  const accountSignatures = signatures.filter(s => s.accountId === accountId);
  const selectedSignature = accountSignatures.find(s => s.id === signatureId) 
    || accountSignatures.find(s => s.isDefault);

  useEffect(() => {
    if (showCompose) {
      const defaultAccountId = selectedAccountId || accounts[0]?.id || '';
      setAccountId(defaultAccountId);

      if (composeData) {
        setTo(composeData.to || []);
        setCc(composeData.cc || []);
        setBcc(composeData.bcc || []);
        setSubject(composeData.subject || '');
        setAttachments(composeData.attachments || []);
        setShowCc((composeData.cc?.length || 0) > 0);
        setShowBcc((composeData.bcc?.length || 0) > 0);
      } else {
        setTo([]);
        setCc([]);
        setBcc([]);
        setSubject('');
        setAttachments([]);
        setShowCc(false);
        setShowBcc(false);
      }
      
      setBody('');
      setBodyType('html');
      setEditorMode('richtext');
      setIsMinimized(false);
    }
  }, [showCompose, composeData, accounts, selectedAccountId]);

  useEffect(() => {
    if (currentAccount?.signatureId) {
      setSignatureId(currentAccount.signatureId);
    } else {
      const defaultSig = accountSignatures.find(s => s.isDefault);
      setSignatureId(defaultSig?.id);
    }
  }, [accountId, currentAccount, accountSignatures]);

  const handleClose = () => {
    setShowCompose(false);
  };

  const handleSend = async () => {
    if (!currentAccount || to.length === 0 || !subject.trim()) {
      return;
    }

    setIsSending(true);
    try {
      const emailData: Partial<Email> = {
        accountId,
        to,
        cc,
        bcc,
        subject: subject.trim(),
        body: {
          html: bodyType === 'html' ? body : undefined,
          markdown: bodyType === 'markdown' ? body : undefined,
          plain: bodyType === 'plain' ? body : body
        },
        attachments,
        inReplyTo: composeData?.inReplyTo,
        references: composeData?.references
      };

      if (selectedSignature) {
        if (bodyType === 'html') {
          emailData.body = {
            ...emailData.body,
            html: body + selectedSignature.html
          };
        } else {
          emailData.body = {
            ...emailData.body,
            plain: body + '\n\n' + selectedSignature.plain
          };
        }
      }

      await window.api.email.send(emailData);
      
      setShowCompose(false);
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!currentAccount) return;

    try {
      const emailData: Partial<Email> = {
        accountId,
        to,
        cc,
        bcc,
        subject: subject.trim(),
        body: {
          html: bodyType === 'html' ? body : undefined,
          markdown: bodyType === 'markdown' ? body : undefined,
          plain: bodyType === 'plain' ? body : body
        },
        attachments
      };

      await window.api.email.saveDraft(emailData);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const handleAddContact = (type: 'to' | 'cc' | 'bcc', email: string) => {
    const contact: EmailContact = { name: '', email };
    if (type === 'to') setTo([...to, contact]);
    else if (type === 'cc') setCc([...cc, contact]);
    else setBcc([...bcc, contact]);
  };

  const handleRemoveContact = (type: 'to' | 'cc' | 'bcc', index: number) => {
    if (type === 'to') setTo(to.filter((_, i) => i !== index));
    else if (type === 'cc') setCc(cc.filter((_, i) => i !== index));
    else setBcc(bcc.filter((_, i) => i !== index));
  };

  if (!showCompose) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <div
        className={`
          pointer-events-auto bg-white dark:bg-gray-900 rounded-t-xl shadow-2xl
          border border-gray-200 dark:border-gray-700
          transition-all duration-300 ease-out
          flex flex-col
          ${isMinimized ? 'w-96 h-14' : 'w-full max-w-3xl h-[80vh] max-h-[800px]'}
        `}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-xl cursor-pointer"
          onDoubleClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {subject || '新邮件'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMinimized ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                )}
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">发件人</label>
                <Select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  options={accounts.map(a => ({
                    value: a.id,
                    label: `${a.name} <${a.email}>`
                  }))}
                  className="flex-1"
                />
              </div>

              <div className="flex items-start gap-2">
                <label className="text-sm text-gray-500 dark:text-gray-400 w-16 flex-shrink-0 pt-2">收件人</label>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[42px]">
                    {to.map((contact, index) => (
                      <Badge key={index} variant="secondary" size="sm">
                        {contact.name || contact.email}
                        <button
                          onClick={() => handleRemoveContact('to', index)}
                          className="ml-1 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    <input
                      type="email"
                      placeholder={to.length === 0 ? '收件人' : ''}
                      className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
                      onKeyDown={(e) => {
                        if (e.key === ',' || e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          if (input.value.trim()) {
                            handleAddContact('to', input.value.trim());
                            input.value = '';
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          handleAddContact('to', e.target.value.trim());
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
                {!showCc && (
                  <button
                    onClick={() => setShowCc(true)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 pt-2"
                  >
                    抄送
                  </button>
                )}
                {!showBcc && (
                  <button
                    onClick={() => setShowBcc(true)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 pt-2"
                  >
                    密送
                  </button>
                )}
              </div>

              {showCc && (
                <div className="flex items-start gap-2">
                  <label className="text-sm text-gray-500 dark:text-gray-400 w-16 flex-shrink-0 pt-2">抄送</label>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[42px]">
                      {cc.map((contact, index) => (
                        <Badge key={index} variant="secondary" size="sm">
                          {contact.name || contact.email}
                          <button
                            onClick={() => handleRemoveContact('cc', index)}
                            className="ml-1 hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                      <input
                        type="email"
                        placeholder={cc.length === 0 ? '抄送' : ''}
                        className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        onKeyDown={(e) => {
                          if (e.key === ',' || e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.currentTarget;
                            if (input.value.trim()) {
                              handleAddContact('cc', input.value.trim());
                              input.value = '';
                            }
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            handleAddContact('cc', e.target.value.trim());
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {showBcc && (
                <div className="flex items-start gap-2">
                  <label className="text-sm text-gray-500 dark:text-gray-400 w-16 flex-shrink-0 pt-2">密送</label>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[42px]">
                      {bcc.map((contact, index) => (
                        <Badge key={index} variant="secondary" size="sm">
                          {contact.name || contact.email}
                          <button
                            onClick={() => handleRemoveContact('bcc', index)}
                            className="ml-1 hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                      <input
                        type="email"
                        placeholder={bcc.length === 0 ? '密送' : ''}
                        className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        onKeyDown={(e) => {
                          if (e.key === ',' || e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.currentTarget;
                            if (input.value.trim()) {
                              handleAddContact('bcc', input.value.trim());
                              input.value = '';
                            }
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            handleAddContact('bcc', e.target.value.trim());
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <Input
                type="text"
                placeholder="主题"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">编辑器</span>
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                    {[
                      { key: 'richtext', label: '富文本' },
                      { key: 'markdown', label: 'Markdown' },
                      { key: 'plain', label: '纯文本' }
                    ].map(mode => (
                      <button
                        key={mode.key}
                        onClick={() => {
                          setEditorMode(mode.key as EditorMode);
                          setBodyType(mode.key === 'markdown' ? 'markdown' : mode.key === 'plain' ? 'plain' : 'html');
                        }}
                        className={`
                          px-2 py-1 text-xs font-medium rounded
                          transition-colors
                          ${editorMode === mode.key
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }
                        `}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {accountSignatures.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">签名</span>
                    <Select
                      value={signatureId || ''}
                      onChange={(e) => setSignatureId(e.target.value || undefined)}
                      options={[
                        { value: '', label: '无' },
                        ...accountSignatures.map(s => ({
                          value: s.id,
                          label: s.name
                        }))
                      ]}
                      className="w-32"
                    />
                  </div>
                )}
              </div>

              {editorMode === 'richtext' && (
                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  placeholder="写点什么..."
                />
              )}
              {editorMode === 'markdown' && (
                <MarkdownEditor
                  value={body}
                  onChange={setBody}
                  placeholder="使用 Markdown 编写..."
                />
              )}
              {editorMode === 'plain' && (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="写点什么..."
                  className="w-full min-h-[250px] p-4 resize-none border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                />
              )}

              <AttachmentUploader
                attachments={attachments}
                onChange={setAttachments}
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <Dropdown
                  trigger={
                    <Button variant="ghost" size="icon" title="更多选项">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </Button>
                  }
                  items={[
                    {
                      key: 'priority-high',
                      label: '高优先级',
                      onClick: () => {}
                    },
                    {
                      key: 'priority-normal',
                      label: '普通优先级',
                      onClick: () => {}
                    },
                    {
                      key: 'priority-low',
                      label: '低优先级',
                      onClick: () => {}
                    },
                    { key: 'divider', label: '', divider: true },
                    {
                      key: 'request-read-receipt',
                      label: '请求已读回执',
                      onClick: () => {}
                    },
                    {
                      key: 'encrypt',
                      label: '加密发送',
                      onClick: () => {}
                    },
                    {
                      key: 'sign',
                      label: '签名发送',
                      onClick: () => {}
                    }
                  ]}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleSaveDraft}
                  disabled={isSending}
                >
                  保存草稿
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isSending}
                >
                  丢弃
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSend}
                  loading={isSending}
                  disabled={to.length === 0 || !subject.trim()}
                  rightIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  }
                >
                  发送
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ComposeWindow;
