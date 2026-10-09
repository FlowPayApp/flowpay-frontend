import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchInbox, type Inbox, type UnreadThread } from "../api";
import { useToast } from "./Toast";

/** Avísale a la bandeja que algo cambió (por ejemplo, se leyó un cobro) para que se actualice al tiro. */
export const INBOX_CHANGED = "geldflus:inbox-changed";

export function notifyInboxChanged() {
  window.dispatchEvent(new Event(INBOX_CHANGED));
}

const POLL_MS = 15_000;
const TITLE_COUNT = /^\(\d+\+?\)\s/;

type NotificationState = NotificationPermission | "unsupported";

type InboxContextValue = {
  inbox: Inbox;
  notifications: NotificationState;
  enableNotifications: () => Promise<void>;
};

const EMPTY: Inbox = { total: 0, threads: [] };

const InboxContext = createContext<InboxContextValue>({
  inbox: EMPTY,
  notifications: "unsupported",
  enableNotifications: async () => {},
});

function currentPermission(): NotificationState {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

export function threadPreview(thread: UnreadThread) {
  const text = thread.preview.trim();
  if (text) return text;
  return thread.has_media ? "Envió un archivo" : "Mensaje sin texto";
}

function chargeIdInPath(pathname: string) {
  const match = /^\/cobros\/(\d+)/.exec(pathname);
  return match ? Number(match[1]) : null;
}

export function InboxProvider({ children }: { children: ReactNode }) {
  const [inbox, setInbox] = useState<Inbox>(EMPTY);
  const [notifications, setNotifications] = useState<NotificationState>(currentPermission);
  const { show } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const seen = useRef<Map<number, string> | null>(null);
  const openCharge = useRef<number | null>(null);
  openCharge.current = chargeIdInPath(pathname);

  const announce = useCallback(
    (thread: UnreadThread) => {
      const visible = document.visibilityState === "visible";
      if (visible && openCharge.current === thread.charge_id) return;
      if (visible) {
        show({ text: `${thread.client_name}: ${threadPreview(thread)}`, tone: "info" });
        return;
      }
      if (currentPermission() !== "granted") return;
      const note = new Notification(`${thread.client_name} te respondió`, {
        body: threadPreview(thread),
        tag: `charge-${thread.charge_id}`,
        icon: "/favicon.png",
      });
      note.onclick = () => {
        window.focus();
        navigate(`/cobros/${thread.charge_id}`);
        note.close();
      };
    },
    [navigate, show],
  );

  const refresh = useCallback(async () => {
    let next: Inbox;
    try {
      next = await fetchInbox();
    } catch {
      return;
    }
    const threads = Array.isArray(next?.threads) ? next.threads : [];
    const previous = seen.current;
    if (previous) {
      for (const thread of threads) {
        const before = previous.get(thread.charge_id);
        if (!before || Date.parse(thread.last_at) > Date.parse(before)) announce(thread);
      }
    }
    seen.current = new Map(threads.map((t) => [t.charge_id, t.last_at]));
    setInbox({ total: next?.total ?? 0, threads });
  }, [announce]);

  useEffect(() => {
    void refresh();
    const tick = () => {
      if (document.visibilityState === "visible" || currentPermission() === "granted") void refresh();
    };
    const timer = window.setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onChanged = () => void refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(INBOX_CHANGED, onChanged);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(INBOX_CHANGED, onChanged);
    };
  }, [refresh]);

  useEffect(() => {
    const base = document.title.replace(TITLE_COUNT, "");
    document.title = inbox.total > 0 ? `(${inbox.total > 99 ? "99+" : inbox.total}) ${base}` : base;
  }, [inbox.total, pathname]);

  useEffect(
    () => () => {
      document.title = document.title.replace(TITLE_COUNT, "");
    },
    [],
  );

  const enableNotifications = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    setNotifications(await Notification.requestPermission());
  }, []);

  return <InboxContext.Provider value={{ inbox, notifications, enableNotifications }}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  return useContext(InboxContext);
}
