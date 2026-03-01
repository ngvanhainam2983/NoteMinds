import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, Sparkles, History, Trash2, Save, X, Lock, Volume2 } from 'lucide-react';
import { chatWithDocument, getConversationHistory, getConversationMessages, saveConversation, deleteConversation } from '../api';
import MarkdownRenderer from './MarkdownRenderer';

export default function ChatView({ docId, messages, setMessages, chatLimit: initialLimit, chatFn, shareMode, readOnly }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [chatLimit, setChatLimit] = useState(initialLimit || 10);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [savingChat, setSavingChat] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isUnlimited = chatLimit === '∞' || chatLimit === -1;
  const isChatLimitReached = !isUnlimited && chatCount >= chatLimit;

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const convs = await getConversationHistory(docId);
      setHistory(convs || []);
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  };

  const handleLoadConversation = async (convId) => {
    try {
      const msgs = await getConversationMessages(convId);
      if (msgs?.length) {
        setMessages(msgs.map(m => ({ role: m.role, content: m.message || m.content })));
      }
      setShowHistory(false);
    } catch (err) {
      console.error('Load conversation failed:', err);
    }
  };

  const handleSaveChat = async () => {
    if (messages.length <= 1 || savingChat) return;
    setSavingChat(true);
    try {
      const title = `Chat ${new Date().toLocaleString('vi')}`;
      await saveConversation(docId, messages.slice(1).map(m => ({ role: m.role, content: m.content })), title);
    } catch (err) {
      console.error('Save chat failed:', err);
    } finally {
      setSavingChat(false);
    }
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await deleteConversation(convId);
      setHistory(prev => prev.filter(c => c.id !== convId));
    } catch (err) {
      console.error('Delete conversation failed:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialLimit !== undefined) setChatLimit(initialLimit);
  }, [initialLimit]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    if (isChatLimitReached) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Đã đạt giới hạn ${chatLimit} tin nhắn cho tài liệu này. Nâng cấp gói để chat nhiều hơn!`
      }]);
      return;
    }

    const userMessage = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter((m, i) => i > 0)
        .map(m => ({ role: m.role, content: m.content }));

      const response = chatFn
        ? await chatFn(msg, history)
        : await chatWithDocument(docId, msg, history);
      setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
      if (response.chatCount !== undefined) setChatCount(response.chatCount);
      if (response.chatLimit !== undefined) setChatLimit(response.chatLimit);
    } catch (err) {
      if (err.response?.status === 429 && err.response.data?.chatLimitReached) {
        if (err.response.data.chatLimit) setChatLimit(err.response.data.chatLimit);
        setChatCount(err.response.data.chatCount || chatLimit);
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Xin lỗi, đã xảy ra lỗi: ${err.response?.data?.error || err.message}. Vui lòng thử lại.`
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    'Tóm tắt nội dung chính của tài liệu',
    'Liệt kê các khái niệm quan trọng',
    'Giải thích ý tưởng cốt lõi',
  ];

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any currently playing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Trình duyệt của bạn không hỗ trợ tính năng đọc văn bản.");
    }
  };

  return (
    <div className="flex flex-col h-[600px] relative">
      {/* History sidebar */}
      {showHistory && (
        <div className="absolute inset-0 z-20 flex">
          <div className="w-72 bg-surface border-r border-line flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <span className="text-sm font-medium flex items-center gap-2"><History size={14} /> Lịch sử chat</span>
              <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-line rounded"><X size={14} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {historyLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-400" /></div>
              ) : history.length > 0 ? (
                history.map(conv => (
                  <div key={conv.id} className="flex items-center gap-1 group">
                    <button
                      onClick={() => handleLoadConversation(conv.id)}
                      className="flex-1 text-left px-3 py-2 rounded-lg text-xs hover:bg-surface-2 transition-colors truncate"
                    >
                      <p className="truncate">{conv.title || 'Hội thoại'}</p>
                      <p className="text-[10px] text-muted">{conv.messageCount || 0} tin nhắn</p>
                    </button>
                    <button
                      onClick={() => handleDeleteConversation(conv.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all"
                    >
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted text-xs py-8">Chưa có lịch sử</p>
              )}
            </div>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setShowHistory(false)} />
        </div>
      )}

      {/* Chat toolbar */}
      {!shareMode && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-line">
          <button
            onClick={() => { setShowHistory(true); loadHistory(); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted hover:text-txt hover:bg-surface-2 rounded-lg transition-colors"
          >
            <History size={13} /> Lịch sử
          </button>
          <button
            onClick={handleSaveChat}
            disabled={messages.length <= 1 || savingChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted hover:text-txt hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-40"
          >
            {savingChat ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Lưu chat
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-primary-400" />
              </div>
            )}
            <div
              className={`
                max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative group
                ${msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-md whitespace-pre-wrap'
                  : 'bg-surface-2 text-txt rounded-bl-md border border-line pr-12'
                }
              `}
            >
              {msg.role === 'assistant'
                ? (
                  <>
                    <button
                      onClick={() => speakText(msg.content)}
                      className="absolute top-2 right-2 p-1.5 text-muted hover:text-primary-400 bg-surface rounded-md opacity-0 group-hover:opacity-100 transition-all border border-line"
                      title="Đọc văn bản"
                    >
                      <Volume2 size={14} />
                    </button>
                    <MarkdownRenderer content={msg.content} />
                  </>
                )
                : msg.content
              }
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 bg-accent-500/20 rounded-lg flex items-center justify-center shrink-0 mt-1">
                <User size={16} className="text-accent-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center shrink-0">
              <Bot size={16} className="text-primary-400" />
            </div>
            <div className="bg-surface-2 border border-line rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 size={16} className="text-primary-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions (only show at start) */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => { setInput(q); inputRef.current?.focus(); }}
              className="text-xs bg-surface-2 border border-line rounded-full px-3 py-1.5 text-muted hover:text-txt hover:border-primary-500/30 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Chat counter */}
      <div className="px-4 pt-2 flex items-center gap-1.5">
        <MessageSquare size={12} className={isChatLimitReached ? 'text-red-400' : 'text-muted'} />
        <span className={`text-xs ${isChatLimitReached ? 'text-red-400' : 'text-muted'}`}>
          {isUnlimited ? (
            <>{chatCount} tin nhắn <Sparkles size={10} className="inline text-primary-400" /> không giới hạn</>
          ) : (
            <>{chatCount}/{chatLimit} tin nhắn</>
          )}
        </span>
      </div>

      {/* Input area */}
      {readOnly ? (
        <div className="border-t border-line px-4 py-3 flex items-center gap-2">
          <Lock size={14} className="text-muted" />
          <span className="text-xs text-muted">Chế độ chỉ xem — không thể gửi tin nhắn</span>
        </div>
      ) : (
        <div className="border-t border-line p-4">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isChatLimitReached ? `Đã hết ${chatLimit} tin nhắn — nâng cấp gói để tiếp tục` : 'Hỏi về tài liệu...'}
              disabled={isChatLimitReached}
              rows={1}
              className="flex-1 bg-surface-2 border border-line rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary-500/50 transition-colors placeholder:text-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ maxHeight: '120px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || isChatLimitReached}
              className="p-3 bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
