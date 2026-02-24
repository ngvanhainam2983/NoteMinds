import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { chatWithDocument } from '../api';
import MarkdownRenderer from './MarkdownRenderer';

export default function ChatView({ docId, messages, setMessages, chatLimit: initialLimit }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [chatLimit, setChatLimit] = useState(initialLimit || 10);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isUnlimited = chatLimit === '∞' || chatLimit === -1;
  const isChatLimitReached = !isUnlimited && chatCount >= chatLimit;

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

      const response = await chatWithDocument(docId, msg, history);
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

  return (
    <div className="flex flex-col h-[600px]">
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
                max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-md whitespace-pre-wrap'
                  : 'bg-[#242736] text-[#e4e5e9] rounded-bl-md border border-[#2e3144]'
                }
              `}
            >
              {msg.role === 'assistant'
                ? <MarkdownRenderer content={msg.content} />
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
            <div className="bg-[#242736] border border-[#2e3144] rounded-2xl rounded-bl-md px-4 py-3">
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
              className="text-xs bg-[#242736] border border-[#2e3144] rounded-full px-3 py-1.5 text-[#9496a1] hover:text-white hover:border-primary-500/30 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Chat counter */}
      <div className="px-4 pt-2 flex items-center gap-1.5">
        <MessageSquare size={12} className={isChatLimitReached ? 'text-red-400' : 'text-[#9496a1]'} />
        <span className={`text-xs ${isChatLimitReached ? 'text-red-400' : 'text-[#9496a1]'}`}>
          {isUnlimited ? (
            <>{chatCount} tin nhắn <Sparkles size={10} className="inline text-primary-400" /> không giới hạn</>
          ) : (
            <>{chatCount}/{chatLimit} tin nhắn</>
          )}
        </span>
      </div>

      {/* Input area */}
      <div className="border-t border-[#2e3144] p-4">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isChatLimitReached ? `Đã hết ${chatLimit} tin nhắn — nâng cấp gói để tiếp tục` : 'Hỏi về tài liệu...'}
            disabled={isChatLimitReached}
            rows={1}
            className="flex-1 bg-[#242736] border border-[#2e3144] rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary-500/50 transition-colors placeholder:text-[#9496a1]/50 disabled:opacity-40 disabled:cursor-not-allowed"
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
    </div>
  );
}
