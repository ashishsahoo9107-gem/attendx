import React, { useRef, useState } from "react";
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { User, createUserWithEmailAndPassword, GoogleAuthProvider, RecaptchaVerifier, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPhoneNumber, signInWithPopup, updateProfile, ConfirmationResult } from "firebase/auth";
import { auth } from "./firebase";

type Props = { configured: boolean; user: User | null; onSignOut: () => void };
const message = (title: string, body: string) => Platform.OS === "web" ? window.alert(`${title}\n\n${body}`) : Alert.alert(title, body);

export default function AuthScreen({ configured, user, onSignOut }: Props) {
  const [mode, setMode] = useState<"signin" | "signup" | "phone">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const recaptcha = useRef<RecaptchaVerifier | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const signInGoogle = async () => {
    if (!auth) return;
    if (Platform.OS !== "web") { message("Google sign-in setup", "Google sign-in is enabled on the website. Android Google OAuth needs Android OAuth client IDs; use email/password in the APK for now."); return; }
    setBusy(true);
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e: any) { message("Google sign-in failed", e?.message || "Please try again."); }
    finally { setBusy(false); }
  };

  const submitEmail = async () => {
    if (!auth) return;
    if (!email.trim() || !password) { message("Missing details", "Enter your email and password."); return; }
    if (mode === "signup" && !name.trim()) { message("Name required", "Enter your name to create your student account."); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e: any) {
      const friendly: Record<string, string> = {
        "auth/email-already-in-use": "This email already has an account. Try signing in.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Choose a stronger password with at least 6 characters.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/user-not-found": "No account found. Create an account first.",
        "auth/wrong-password": "Email or password is incorrect."
      };
      message("Account error", friendly[e?.code] || e?.message || "Please try again.");
    } finally { setBusy(false); }
  };

  const resetPassword = async () => {
    if (!auth || !email.trim()) { message("Email needed", "Enter your email above first, then tap Forgot password."); return; }
    try { await sendPasswordResetEmail(auth, email.trim()); message("Reset email sent", "Check your inbox and spam folder for the password reset link."); }
    catch (e: any) { message("Could not reset password", e?.message || "Please try again."); }
  };

  const sendOtp = async () => {
    if (!auth) return;
    if (Platform.OS !== "web") { message("Phone sign-in", "Phone number sign-in uses an OTP and needs native Firebase phone-auth setup for the APK. Use email/password in the APK for now; phone OTP is available on the website after Firebase is configured."); return; }
    if (!phone.trim().startsWith("+")) { message("Include country code", "Enter your number with country code, for example +91XXXXXXXXXX."); return; }
    setBusy(true);
    try {
      if (!recaptcha.current) recaptcha.current = new RecaptchaVerifier(auth, "attendx-recaptcha", { size: "invisible" });
      const result = await signInWithPhoneNumber(auth, phone.trim(), recaptcha.current);
      setConfirmation(result);
      message("OTP sent", "Enter the verification code sent to your phone.");
    } catch (e: any) {
      recaptcha.current?.clear(); recaptcha.current = null;
      message("Could not send OTP", e?.message || "Check the phone number and Firebase phone-auth settings.");
    } finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    if (!confirmation || !otp.trim()) { message("OTP required", "Enter the verification code first."); return; }
    setBusy(true);
    try { await confirmation.confirm(otp.trim()); }
    catch (e: any) { message("Invalid OTP", e?.message || "Check the code and try again."); }
    finally { setBusy(false); }
  };

  if (user) return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.logo}>A</Text><Text style={styles.title}>You're signed in</Text><Text style={styles.subtitle}>{user.email || user.phoneNumber || user.displayName}</Text><Pressable style={styles.primary} onPress={onSignOut}><Text style={styles.primaryText}>Sign out</Text></Pressable></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <View style={styles.brandRow}><View style={styles.logo}><Text style={styles.logoText}>A</Text></View><Text style={styles.brand}>Attend<Text style={{ color: "#A78BFA" }}>X</Text></Text><View style={styles.securePill}><Text style={styles.secureText}>PRIVATE STUDENT SPACE</Text></View></View>
        <Text style={styles.eyebrow}>YOUR SEMESTER. YOUR CONTROL.</Text>
        <Text style={styles.heroTitle}>Every class counts.</Text>
        <Text style={styles.heroCopy}>Keep your timetable, attendance targets and daily class records in one beautifully organised space.</Text>
        <View style={styles.featureRow}><View style={styles.feature}><Text style={styles.featureIcon}>◷</Text><Text style={styles.featureTitle}>Smart tracking</Text><Text style={styles.featureCopy}>Daily class status</Text></View><View style={styles.feature}><Text style={styles.featureIcon}>▦</Text><Text style={styles.featureTitle}>Weekly plan</Text><Text style={styles.featureCopy}>Timetable at a glance</Text></View><View style={styles.feature}><Text style={styles.featureIcon}>⌁</Text><Text style={styles.featureTitle}>Private sync</Text><Text style={styles.featureCopy}>Your account only</Text></View></View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{mode === "signup" ? "Create your account" : mode === "phone" ? "Continue with phone" : "Welcome back"}</Text>
        <Text style={styles.cardSub}>{mode === "signup" ? "Start your personal attendance workspace." : mode === "phone" ? "We'll send a one-time verification code." : "Sign in to open your personal workspace."}</Text>
        {!configured ? <View style={styles.setupBox}><Text style={styles.setupTitle}>One-time Firebase setup needed</Text><Text style={styles.setupCopy}>Secure sign-in and private cloud sync need your own Firebase project. Follow the README: create a Firebase project, enable Email/Password, Google and Phone providers, then add the EXPO_PUBLIC_FIREBASE_* values to a .env file and restart Expo.</Text></View> : null}
        {mode === "signup" ? <><Text style={styles.label}>Full name</Text><TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#77839B" style={styles.input} autoCapitalize="words" /></> : null}
        {mode !== "phone" ? <><Text style={styles.label}>Email address</Text><TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#77839B" style={styles.input} autoCapitalize="none" keyboardType="email-address" autoComplete="email" /><Text style={styles.label}>Password</Text><View style={styles.passwordRow}><TextInput value={password} onChangeText={setPassword} placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"} placeholderTextColor="#77839B" style={[styles.input, { flex: 1, marginBottom: 0 }]} secureTextEntry={!showPassword} autoCapitalize="none" /><Pressable onPress={() => setShowPassword(v => !v)} style={styles.showPass}><Text style={styles.showPassText}>{showPassword ? "Hide" : "Show"}</Text></Pressable></View></> : <><Text style={styles.label}>Mobile number with country code</Text><TextInput value={phone} onChangeText={setPhone} placeholder="+91XXXXXXXXXX" placeholderTextColor="#77839B" style={styles.input} keyboardType="phone-pad" />{confirmation ? <><Text style={styles.label}>Verification code</Text><TextInput value={otp} onChangeText={setOtp} placeholder="6-digit OTP" placeholderTextColor="#77839B" style={styles.input} keyboardType="number-pad" /></> : null}</>}
        {Platform.OS === "web" ? <View nativeID="attendx-recaptcha" style={{ height: 1, overflow: "hidden" }} /> : null}
        {mode === "phone" ? <Pressable disabled={busy || !configured} onPress={confirmation ? verifyOtp : sendOtp} style={[styles.primary, (busy || !configured) && styles.disabled]}><Text style={styles.primaryText}>{busy ? "Please wait…" : confirmation ? "Verify & continue" : "Send verification code"}</Text></Pressable> : <Pressable disabled={busy || !configured} onPress={submitEmail} style={[styles.primary, (busy || !configured) && styles.disabled]}><Text style={styles.primaryText}>{busy ? "Please wait…" : mode === "signup" ? "Create account  →" : "Sign in  →"}</Text></Pressable>}
        {mode === "signin" ? <Pressable onPress={resetPassword} style={styles.forgot}><Text style={styles.forgotText}>Forgot password?</Text></Pressable> : null}
        {mode !== "phone" && Platform.OS === "web" ? <><View style={styles.orRow}><View style={styles.line} /><Text style={styles.orText}>OR CONTINUE WITH</Text><View style={styles.line} /></View><Pressable disabled={busy || !configured} onPress={signInGoogle} style={[styles.googleButton, (busy || !configured) && styles.disabled]}><Text style={styles.googleG}>G</Text><Text style={styles.googleText}>Continue with Google</Text></Pressable></> : null}
        <View style={styles.switchRow}><Text style={styles.switchCopy}>{mode === "signup" ? "Already have an account?" : mode === "phone" ? "Prefer email instead?" : "New to AttendX?"}</Text><Pressable onPress={() => { setMode(mode === "signup" ? "signin" : mode === "phone" ? "signin" : "signup"); setConfirmation(null); }}><Text style={styles.switchLink}>{mode === "signup" ? "Sign in" : mode === "phone" ? "Use email" : "Create account"}</Text></Pressable></View>
        {mode === "signin" ? <Pressable onPress={() => { setMode("phone"); setConfirmation(null); }} style={styles.phoneLink}><Text style={styles.phoneLinkText}>Use mobile number and OTP instead</Text></Pressable> : null}
        {mode === "signin" ? <Pressable onPress={() => setMode("signup")} style={{ display: "none" }}><Text>Create account</Text></Pressable> : null}
        <Text style={styles.privacy}>By continuing, your attendance data is stored under your account. Never share your password or OTP.</Text>
      </View>
      <Text style={styles.footer}>ATTENDX  •  BUILT FOR EVERY STUDENT</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#070B16" }, page: { flexGrow: 1, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", padding: 22, gap: 26, maxWidth: 1180, alignSelf: "center", width: "100%" },
  hero: { flex: 1, minWidth: 290, maxWidth: 540, paddingVertical: 28, gap: 20 }, brandRow: { flexDirection: "row", alignItems: "center", gap: 11, flexWrap: "wrap" }, logo: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#744BFF", alignItems: "center", justifyContent: "center", shadowColor: "#8B5CF6", shadowOpacity: 0.45, shadowRadius: 18 }, logoText: { color: "#FFFFFF", fontSize: 25, fontWeight: "900" }, brand: { color: "#F8FAFC", fontSize: 27, fontWeight: "900", letterSpacing: -1 }, securePill: { borderWidth: 1, borderColor: "#2D3553", backgroundColor: "#10182B", borderRadius: 99, paddingVertical: 7, paddingHorizontal: 10 }, secureText: { color: "#B7A6FF", fontSize: 9, fontWeight: "800", letterSpacing: 1 }, eyebrow: { color: "#A78BFA", fontSize: 10, fontWeight: "900", letterSpacing: 2.2, marginTop: 22 }, heroTitle: { color: "#F8FAFC", fontSize: 42, fontWeight: "900", letterSpacing: -1.8, lineHeight: 48 }, heroCopy: { color: "#9BA8C0", fontSize: 15, lineHeight: 24, maxWidth: 440 },
  featureRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 12 }, feature: { flex: 1, minWidth: 110, borderWidth: 1, borderColor: "#202A43", backgroundColor: "#0D1425", borderRadius: 16, padding: 13, gap: 7 }, featureIcon: { color: "#B9A7FF", fontSize: 21, fontWeight: "800" }, featureTitle: { color: "#E2E8F0", fontSize: 11, fontWeight: "800" }, featureCopy: { color: "#718096", fontSize: 10 },
  card: { width: "100%", maxWidth: 430, minWidth: 290, backgroundColor: "#0D1425", borderWidth: 1, borderColor: "#27324D", borderRadius: 24, padding: 23, gap: 11, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 25 }, cardTitle: { color: "#F8FAFC", fontSize: 24, fontWeight: "900", letterSpacing: -0.5 }, cardSub: { color: "#8997B0", fontSize: 12, lineHeight: 18, marginBottom: 5 }, label: { color: "#C8D2E3", fontSize: 11, fontWeight: "800", marginTop: 4 }, input: { backgroundColor: "#080E1C", borderColor: "#2B3652", borderWidth: 1, borderRadius: 12, color: "#F8FAFC", paddingHorizontal: 13, paddingVertical: 13, fontSize: 13, marginBottom: 3 }, passwordRow: { flexDirection: "row", alignItems: "center", gap: 8 }, showPass: { padding: 9 }, showPassText: { color: "#B7A6FF", fontSize: 11, fontWeight: "800" }, primary: { alignItems: "center", justifyContent: "center", backgroundColor: "#7047FF", borderRadius: 12, paddingVertical: 14, marginTop: 5 }, primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" }, disabled: { opacity: 0.45 }, forgot: { alignSelf: "flex-end", paddingVertical: 4 }, forgotText: { color: "#B7A6FF", fontSize: 11, fontWeight: "700" }, orRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 6 }, line: { flex: 1, height: 1, backgroundColor: "#26314A" }, orText: { color: "#718096", fontSize: 9, fontWeight: "800", letterSpacing: 1 }, googleButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderColor: "#34405D", backgroundColor: "#121C31", borderRadius: 12, paddingVertical: 12 }, googleG: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" }, googleText: { color: "#E2E8F0", fontSize: 12, fontWeight: "800" }, switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", marginTop: 7 }, switchCopy: { color: "#8997B0", fontSize: 11 }, switchLink: { color: "#B7A6FF", fontSize: 11, fontWeight: "900" }, phoneLink: { alignItems: "center", paddingVertical: 3 }, phoneLinkText: { color: "#A5B4FC", fontSize: 11, fontWeight: "700" }, privacy: { color: "#63718B", fontSize: 9, lineHeight: 14, textAlign: "center", marginTop: 6 }, setupBox: { backgroundColor: "#2A1F13", borderColor: "#8B5E22", borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 }, setupTitle: { color: "#FCD34D", fontSize: 12, fontWeight: "900" }, setupCopy: { color: "#FDE68A", fontSize: 10, lineHeight: 16 }, footer: { width: "100%", textAlign: "center", color: "#46536B", fontSize: 9, fontWeight: "900", letterSpacing: 1.8, paddingVertical: 12 }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 30 }, title: { color: "#F8FAFC", fontSize: 25, fontWeight: "900" }, subtitle: { color: "#94A3B8", fontSize: 13 }
});
