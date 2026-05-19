import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Pressable,
  SafeAreaView,
  Platform,
} from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

const API_URL = Constants.expoConfig?.extra?.apiUrl || "http://localhost:5180";
const SESSION_KEY = "dispatch.session";

const COLORS = {
  ink: "#0d0c0a",
  paper: "#f4ecdc",
  paperDim: "#d9cfba",
  muted: "#a89c84",
  gold: "#c9a14a",
  rule: "#3a3530",
};

const SOURCE_LABELS = {
  hackernews: "HackerNews",
  github_trending: "GitHub",
  lobsters: "Lobsters",
  reddit: "Reddit",
  arxiv: "arXiv",
  show_hn: "Show HN",
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function apiFetch(path, opts = {}) {
  return AsyncStorage.getItem(SESSION_KEY).then((session) =>
    fetch(`${API_URL}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Cookie: `dispatch_session=${session}` } : {}),
        ...(opts.headers || {}),
      },
    })
  );
}

function LoginScreen({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [tokenInput, setTokenInput] = useState("");
  const [devLink, setDevLink] = useState(null);
  const [sent, setSent] = useState(false);

  const requestLink = async () => {
    if (!email.includes("@")) return;
    setBusy(true);
    setError(null);
    setDevLink(null);
    try {
      const r = await fetch(`${API_URL}/api/auth/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      if (data.dev_link) setDevLink(data.dev_link);
      setSent(true);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  };

  const verifyToken = async () => {
    const token = tokenInput.trim();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`${API_URL}/api/auth/verify?token=${encodeURIComponent(token)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      // The server sets an HTTP-only cookie. RN fetch doesn't expose it.
      // We stash the verify token as a session marker; future auth'd requests pass it as the
      // dispatch_session cookie. (A v2 cleanup: backend returns the JWT in the response body.)
      await AsyncStorage.setItem(SESSION_KEY, token);
      onSignedIn();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.dateLine}>SIGN IN</Text>
      <Text style={styles.masthead}>Dispatch</Text>
      <View style={styles.ruleDouble} />
      <Text style={styles.tagline}>"All the bits fit to print"</Text>

      <View style={{ marginTop: 40 }}>
        <Text style={styles.eyebrow}>MAGIC LINK SIGN-IN</Text>
        <Text style={styles.intro}>
          Drop your email. We'll send a one-click link. No password.
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@domain.com"
          placeholderTextColor={COLORS.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <Pressable
          onPress={requestLink}
          disabled={busy || !email.includes("@")}
          style={[styles.primaryBtn, (busy || !email.includes("@")) && { opacity: 0.5 }]}
        >
          <Text style={styles.primaryBtnText}>{busy ? "Sending…" : sent ? "Resend link" : "Send my magic link"}</Text>
        </Pressable>

        {sent && (
          <Text style={[styles.intro, { marginTop: 16 }]}>
            ✓ Check your inbox. Open the link in your phone's browser, then come back and paste the
            token (everything after `?token=` in the link) below.
          </Text>
        )}

        {devLink && (
          <View style={styles.devLinkBox}>
            <Text style={styles.kicker}>DEV MODE LINK</Text>
            <Text style={styles.devLinkText} selectable>{devLink}</Text>
          </View>
        )}

        <View style={{ marginTop: 36 }}>
          <Text style={styles.eyebrow}>ALREADY HAVE THE LINK?</Text>
          <Text style={styles.intro}>Paste the token below.</Text>
          <TextInput
            value={tokenInput}
            onChangeText={setTokenInput}
            placeholder="paste token here"
            placeholderTextColor={COLORS.muted}
            autoCapitalize="none"
            style={styles.input}
          />
          <Pressable
            onPress={verifyToken}
            disabled={busy || !tokenInput.trim()}
            style={[styles.ghostBtn, (busy || !tokenInput.trim()) && { opacity: 0.5 }]}
          >
            <Text style={styles.ghostBtnText}>Sign in</Text>
          </Pressable>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </ScrollView>
  );
}

function BriefScreen({ onSignOut }) {
  const [brief, setBrief] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(`${API_URL}/api/sample`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setBrief(data);
    } catch (err) {
      setError(String(err.message || err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (error && !brief) {
    return (
      <View style={styles.errorWrap}>
        <Text style={styles.kicker}>Couldn't load Dispatch</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={load} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>RETRY</Text>
        </Pressable>
      </View>
    );
  }

  if (!brief) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={COLORS.gold} />
        <Text style={[styles.kicker, { marginTop: 16 }]}>Composing today's edition…</Text>
      </View>
    );
  }

  const pickRef = brief?.editor_pick;
  const allStories = (brief?.sections || []).flatMap((s) => s.stories || []);
  const pick = pickRef ? allStories.find((st) => st.ref === pickRef) : null;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.dateLine}>
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
        </Text>
        <Pressable onPress={onSignOut}>
          <Text style={[styles.kicker, { color: COLORS.gold }]}>SIGN OUT</Text>
        </Pressable>
      </View>
      <Text style={styles.masthead}>Dispatch</Text>
      <View style={styles.ruleDouble} />
      <Text style={styles.tagline}>"The wire, edited."</Text>

      {brief.headline ? (
        <View style={styles.lede}>
          <Text style={styles.eyebrow}>TODAY'S LEDE</Text>
          <Text style={styles.headline}>{brief.headline}</Text>
          {brief.editor_note ? <Text style={styles.editorNote}>{brief.editor_note}</Text> : null}
          {brief.take ? (
            <View style={styles.takeBlock}>
              <Text style={styles.eyebrow}>THE EDITOR'S TAKE</Text>
              <Text style={styles.takeText}>{brief.take}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.ruleGold} />

      {pick ? (
        <View style={styles.pickBanner}>
          <Text style={styles.pickLabel}>TODAY'S EDITOR'S PICK</Text>
          <Story story={pick} isPick />
        </View>
      ) : null}

      {(brief.sections || []).map((sec) => {
        const stories = (sec.stories || []).filter((st) => st.ref !== pickRef);
        if (!stories.length) return null;
        return (
          <View key={sec.topic} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.topic}</Text>
            <View style={styles.sectionRule} />
            {stories.map((st) => <Story key={st.ref} story={st} />)}
          </View>
        );
      })}

      <Text style={styles.colophon}>Pull to refresh. Your full edition lives on the web.</Text>
    </ScrollView>
  );
}

function Story({ story, isPick }) {
  const open = () => Linking.openURL(story.url).catch(() => {});
  const meta = (() => {
    const m = story.meta || {};
    if (story.source === "hackernews") return `▲ ${m.score ?? 0} · ${m.comments ?? 0} comments`;
    if (story.source === "github_trending") return `${m.language || "Repo"} · +${m.stars_today ?? 0} stars`;
    if (story.source === "lobsters") return `▲ ${m.score ?? 0} · ${m.comments ?? 0} comments`;
    if (story.source === "reddit") return `r/${m.subreddit ?? "?"} · ${m.score ?? 0} upvotes`;
    return "";
  })();
  return (
    <Pressable onPress={open} style={styles.story}>
      <Text style={styles.storyMeta}>
        {(SOURCE_LABELS[story.source] || "Source").toUpperCase()}  ·  {meta}
        {isPick ? "  ·  ★ EDITOR'S PICK" : ""}
      </Text>
      <Text style={[styles.storyTitle, isPick && styles.storyTitlePick]}>{story.title}</Text>
      {story.tldr ? <Text style={styles.storyTldr}>{story.tldr}</Text> : null}
      {story.why_it_matters ? <Text style={styles.storyWhy}>— {story.why_it_matters}</Text> : null}
    </Pressable>
  );
}

async function registerForPushAndSave() {
  if (!Device.isDevice) return null;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;

  try {
    await apiFetch("/api/push/register", {
      method: "POST",
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        app_version: Constants.expoConfig?.version || "0.1.0",
      }),
    });
  } catch (err) {
    console.warn("push register failed (non-fatal):", err.message);
  }
  return token;
}

export default function App() {
  const [authed, setAuthed] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY).then((v) => setAuthed(!!v));
  }, []);

  useEffect(() => {
    if (authed) registerForPushAndSave();
  }, [authed]);

  const onSignOut = async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  };

  if (authed === null) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.gold} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      {authed ? <BriefScreen onSignOut={onSignOut} /> : <LoginScreen onSignedIn={() => setAuthed(true)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  scroll: { padding: 20, paddingTop: 40, paddingBottom: 64 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorWrap: { flex: 1, padding: 32, alignItems: "center", justifyContent: "center" },
  errorText: { color: COLORS.muted, fontFamily: "monospace", marginTop: 12, textAlign: "center" },
  kicker: { color: COLORS.muted, fontSize: 10, letterSpacing: 2.2, fontWeight: "600" },
  intro: { color: COLORS.paperDim, fontSize: 15, lineHeight: 22, marginBottom: 18, marginTop: 8 },
  dateLine: { color: COLORS.muted, fontSize: 10, letterSpacing: 2.2 },
  masthead: { color: COLORS.paper, fontSize: 64, fontFamily: "Georgia", textAlign: "center", marginTop: 8 },
  ruleDouble: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.rule, height: 5, marginVertical: 6 },
  tagline: { color: COLORS.muted, fontSize: 9, letterSpacing: 2.4, textAlign: "center", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: COLORS.rule, color: COLORS.paper, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, fontFamily: "monospace" },
  primaryBtn: { backgroundColor: COLORS.paper, paddingVertical: 14, marginTop: 14, alignItems: "center" },
  primaryBtnText: { color: COLORS.ink, fontWeight: "600", letterSpacing: 1.5, fontSize: 13 },
  ghostBtn: { borderWidth: 1, borderColor: COLORS.rule, paddingVertical: 14, marginTop: 14, alignItems: "center" },
  ghostBtnText: { color: COLORS.paper, fontWeight: "500", letterSpacing: 1.5, fontSize: 13 },
  devLinkBox: { borderWidth: 1, borderColor: COLORS.rule, padding: 12, marginTop: 16 },
  devLinkText: { color: COLORS.gold, fontFamily: "monospace", fontSize: 11, marginTop: 6 },
  eyebrow: { color: COLORS.gold, fontSize: 10, letterSpacing: 2.4, fontWeight: "600" },
  lede: { marginTop: 32, alignItems: "center" },
  headline: { color: COLORS.paper, fontSize: 28, fontFamily: "Georgia", lineHeight: 32, textAlign: "center" },
  editorNote: { color: COLORS.paperDim, fontStyle: "italic", marginTop: 14, textAlign: "center", fontSize: 16, lineHeight: 24 },
  takeBlock: { marginTop: 18, paddingVertical: 12, paddingHorizontal: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.gold },
  takeText: { color: COLORS.paper, fontSize: 17, lineHeight: 23, textAlign: "center", marginTop: 6 },
  ruleGold: { borderTopWidth: 2, borderColor: COLORS.gold, marginVertical: 28 },
  pickBanner: { borderTopWidth: 2, borderBottomWidth: 2, borderColor: COLORS.gold, paddingVertical: 16, marginBottom: 24 },
  pickLabel: { color: COLORS.gold, fontSize: 9, letterSpacing: 2.8, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  section: { marginTop: 28 },
  sectionTitle: { color: COLORS.gold, fontSize: 11, letterSpacing: 2.4, fontWeight: "600", textTransform: "uppercase" },
  sectionRule: { borderTopWidth: 1, borderColor: COLORS.rule, marginTop: 6, marginBottom: 16 },
  story: { paddingVertical: 12, borderBottomWidth: 1, borderColor: COLORS.rule },
  storyMeta: { color: COLORS.muted, fontSize: 10, letterSpacing: 1.6 },
  storyTitle: { color: COLORS.paper, fontSize: 18, fontFamily: "Georgia", lineHeight: 23, marginTop: 6 },
  storyTitlePick: { fontSize: 24, lineHeight: 28 },
  storyTldr: { color: COLORS.paperDim, fontSize: 15, lineHeight: 22, marginTop: 6 },
  storyWhy: { color: COLORS.muted, fontStyle: "italic", marginTop: 4, fontSize: 13 },
  colophon: { color: COLORS.muted, fontStyle: "italic", textAlign: "center", marginTop: 48, fontSize: 12 },
});
