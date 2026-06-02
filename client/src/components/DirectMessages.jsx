import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth';
import {
  fetchConversationMessages,
  fetchMessageConversations,
  fetchMessageUsers,
  fetchUnreadMessageCount,
  markConversationRead,
  sendDirectMessage,
} from '../utils/messages';
import '../styles/direct-messages.css';

function getInitials(user) {
  const label = user?.name || user?.email || 'User';
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function formatMessageTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase();
}

function UserAvatar({ person }) {
  return (
    <span className="direct-message-avatar">
      {person?.avatarUrl ? (
        <img src={person.avatarUrl} alt="" />
      ) : (
        getInitials(person)
      )}
    </span>
  );
}

export default function DirectMessages() {
  const { user } = useAuth();
  const threadRef = useRef(null);
  const selectedUserRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [draft, setDraft] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerSearchTerm, setComposerSearchTerm] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const refreshUnreadCount = useCallback(async () => {
    const result = await fetchUnreadMessageCount();
    setUnreadCount(result.unreadCount || 0);
  }, []);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const openConversation = useCallback(async (nextUser) => {
    setSelectedUser(nextUser);
    setLoadingMessages(true);
    setError('');

    try {
      const loadedMessages = await fetchConversationMessages(nextUser.id);
      setMessages(loadedMessages);
      await markConversationRead(nextUser.id);
      await refreshUnreadCount();
      setConversations((current) => current.map((conversation) => (
        conversation.user.id === nextUser.id
          ? { ...conversation, unreadCount: 0 }
          : conversation
      )));
    } catch (err) {
      setError(err.message || 'Could not load this conversation.');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [refreshUnreadCount]);

  const loadInbox = useCallback(async () => {
    setLoadingInbox(true);
    setError('');

    try {
      const [loadedUsers, loadedConversations, unread] = await Promise.all([
        fetchMessageUsers(),
        fetchMessageConversations(),
        fetchUnreadMessageCount(),
      ]);

      setUsers(loadedUsers);
      setConversations(loadedConversations);
      setUnreadCount(unread.unreadCount || 0);

      if (!selectedUserRef.current && loadedConversations.length > 0) {
        await openConversation(loadedConversations[0].user);
      }
    } catch (err) {
      setError(err.message || 'Could not load messages.');
      setUsers([]);
      setConversations([]);
    } finally {
      setLoadingInbox(false);
    }
  }, [openConversation]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialUnreadCount() {
      try {
        const result = await fetchUnreadMessageCount();
        if (isMounted) setUnreadCount(result.unreadCount || 0);
      } catch (err) {
        if (isMounted) setUnreadCount(0);
      }
    }

    loadInitialUnreadCount();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isOpen) loadInbox();
  }, [isOpen, loadInbox]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread || loadingMessages) return;
    const scrollToBottom = () => {
      thread.scrollTop = thread.scrollHeight;
    };

    window.requestAnimationFrame(scrollToBottom);
    window.setTimeout(scrollToBottom, 50);
    window.setTimeout(scrollToBottom, 150);
  }, [loadingMessages, messages, selectedUser?.id]);

  useEffect(() => {
    let isMounted = true;

    async function refreshDirectMessages() {
      try {
        const unread = await fetchUnreadMessageCount();
        if (!isMounted) return;
        setUnreadCount(unread.unreadCount || 0);

        if (!isOpen) return;

        const loadedConversations = await fetchMessageConversations();
        if (!isMounted) return;
        setConversations(loadedConversations);

        if (!selectedUser) return;

        const loadedMessages = await fetchConversationMessages(selectedUser.id);
        if (!isMounted) return;
        setMessages(loadedMessages);
        await markConversationRead(selectedUser.id);

        const nextUnread = await fetchUnreadMessageCount();
        if (!isMounted) return;
        setUnreadCount(nextUnread.unreadCount || 0);
        setConversations((current) => current.map((conversation) => (
          conversation.user.id === selectedUser.id
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )));
      } catch (err) {
        // Polling should stay quiet. Manual actions still show user-facing errors.
      }
    }

    const intervalId = window.setInterval(refreshDirectMessages, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isOpen, selectedUser]);

  const conversationPeople = useMemo(() => {
    const term = normalizeSearch(searchTerm);
    return conversations.map((conversation) => ({
      user: conversation.user,
      conversation,
      preview: conversation.lastMessage?.messageText || 'No messages yet.',
      unreadCount: conversation.unreadCount || 0,
    })).filter(({ user: person }) => {
      if (!term) return true;
      return [
        person.name,
        person.email,
        person.role,
      ].some((value) => normalizeSearch(value).includes(term));
    });
  }, [conversations, searchTerm]);

  const composerUsers = useMemo(() => {
    const term = normalizeSearch(composerSearchTerm);
    return users.filter((person) => {
      if (!term) return true;
      return [
        person.name,
        person.email,
        person.role,
      ].some((value) => normalizeSearch(value).includes(term));
    });
  }, [composerSearchTerm, users]);

  async function startConversation(person) {
    setIsComposerOpen(false);
    setComposerSearchTerm('');
    await openConversation(person);
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    const messageText = draft.trim();
    if (!selectedUser || !messageText || sending) return;

    setSending(true);
    setError('');

    try {
      const newMessage = await sendDirectMessage(selectedUser.id, messageText);
      setMessages((current) => [...current, newMessage]);
      setDraft('');
      const loadedConversations = await fetchMessageConversations();
      setConversations(loadedConversations);
    } catch (err) {
      setError(err.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="direct-messages">
      <button
        type="button"
        className="app-topbar-icon direct-messages-button"
        aria-label={isOpen ? 'Close direct messages' : 'Open direct messages'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.2 5.3A3.2 3.2 0 0 1 7.4 2h9.2a3.2 3.2 0 0 1 3.2 3.3v6.5a3.2 3.2 0 0 1-3.2 3.2H10l-4.4 4.1a.9.9 0 0 1-1.5-.7V15a3.2 3.2 0 0 1-2.1-3V5.3Zm3.2-1.4a1.4 1.4 0 0 0-1.4 1.4V12c0 .7.5 1.3 1.2 1.4.4.1.7.4.7.9v2.1l3.1-2.9c.2-.2.4-.2.6-.2h5a1.4 1.4 0 0 0 1.4-1.4V5.3a1.4 1.4 0 0 0-1.4-1.4H7.4Zm1.1 3.4h7a.9.9 0 1 1 0 1.8h-7a.9.9 0 0 1 0-1.8Zm0 3.3h4.8a.9.9 0 1 1 0 1.8H8.5a.9.9 0 0 1 0-1.8Z" />
        </svg>
        {unreadCount > 0 && <span className="direct-messages-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <section className="direct-messages-panel" aria-label="Direct messages">
          <div className="direct-messages-header">
            <div>
              <p>Direct Messages</p>
              <h2>Messages</h2>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close direct messages">
              x
            </button>
          </div>

          <div className="direct-messages-search">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search conversations..."
              aria-label="Search message conversations"
            />
            <button
              type="button"
              className="direct-messages-compose"
              onClick={() => setIsComposerOpen((current) => !current)}
              aria-expanded={isComposerOpen}
              aria-label="Start a new direct message"
            >
              +
            </button>
          </div>

          {error && <p className="direct-messages-error">{error}</p>}

          <div className="direct-messages-body">
            <aside className="direct-messages-list" aria-label="Conversations">
              {loadingInbox && <p className="direct-messages-empty">Loading messages...</p>}
              {!loadingInbox && conversationPeople.length === 0 && (
                <p className="direct-messages-empty">No conversations yet. Press + to start one.</p>
              )}
              {!loadingInbox && conversationPeople.map(({ user: person, preview, unreadCount: personUnread }) => (
                <button
                  type="button"
                  className={`direct-message-person ${selectedUser?.id === person.id ? 'is-active' : ''}`}
                  key={person.id}
                  onClick={() => openConversation(person)}
                >
                  <UserAvatar person={person} />
                  <span>
                    <strong>{person.name}</strong>
                    <small>{preview}</small>
                  </span>
                  {personUnread > 0 && (
                    <span className="direct-message-person-badge">{personUnread}</span>
                  )}
                </button>
              ))}
            </aside>

            <div className="direct-messages-chat">
              {selectedUser ? (
                <>
                  <div className="direct-messages-chat-header">
                    <strong>{selectedUser.name}</strong>
                    <span>{selectedUser.email}</span>
                  </div>

                  <div className="direct-messages-thread" ref={threadRef}>
                    {loadingMessages && <p className="direct-messages-empty">Loading conversation...</p>}
                    {!loadingMessages && messages.length === 0 && (
                      <p className="direct-messages-empty">No messages yet. Send the first one.</p>
                    )}
                    {!loadingMessages && messages.map((message) => {
                      const isSentByMe = message.senderUserId === user?.id;
                      return (
                        <div
                          className={`direct-message-bubble ${isSentByMe ? 'sent' : 'received'}`}
                          key={message.id}
                        >
                          <span>{message.messageText}</span>
                          <time>{formatMessageTime(message.createdAt)}</time>
                        </div>
                      );
                    })}
                  </div>

                  <form className="direct-messages-form" onSubmit={handleSendMessage}>
                    <input
                      type="text"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Write a message..."
                      aria-label="Direct message text"
                    />
                    <button type="submit" disabled={sending || !draft.trim()}>
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="direct-messages-no-chat">
                  <strong>Select a user</strong>
                  <span>Choose someone from the left to start messaging.</span>
                </div>
              )}
            </div>
          </div>

          {isComposerOpen && (
            <div className="direct-messages-composer-backdrop" onClick={() => setIsComposerOpen(false)}>
              <div className="direct-messages-composer-modal" onClick={(event) => event.stopPropagation()}>
                <div className="direct-messages-composer-header">
                  <div>
                    <p>New Message</p>
                    <h3>Select a user</h3>
                  </div>
                  <button type="button" onClick={() => setIsComposerOpen(false)} aria-label="Close new message">
                    x
                  </button>
                </div>

                <input
                  type="search"
                  value={composerSearchTerm}
                  onChange={(event) => setComposerSearchTerm(event.target.value)}
                  placeholder="Search users..."
                  aria-label="Search users to message"
                  autoFocus
                />

                <div className="direct-messages-composer-list">
                  {composerUsers.length === 0 && (
                    <p className="direct-messages-empty">No users found.</p>
                  )}
                  {composerUsers.map((person) => (
                    <button type="button" key={person.id} onClick={() => startConversation(person)}>
                      <UserAvatar person={person} />
                      <span>
                        <strong>{person.name}</strong>
                        <small>{person.email}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
