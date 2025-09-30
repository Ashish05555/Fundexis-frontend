import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Platform, Button } from 'react-native';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Use this for granular error handling
  const handleSignUp = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError('All fields are required!');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match!');
      return;
    }
    setLoading(true);
    try {
      // 1. Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = userCredential.user;

      // 2. Save to Firestore (with granular error handling)
      try {
        await setDoc(doc(db, "users", user.uid), {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          createdAt: new Date()
        });
      } catch (err) {
        console.error("Firestore setDoc error:", err);
        setError("Failed to save user data. Please check your Firestore connection.");
        setLoading(false);
        return;
      }

      // 3. Send email verification
      try {
        await sendEmailVerification(user);
      } catch (err) {
        console.error("sendEmailVerification error:", err);
        setError("Failed to send verification email. Please try again.");
        setLoading(false);
        return;
      }

      // 4. Sign out user
      try {
        await signOut(auth);
      } catch (err) {
        console.error("signOut error:", err);
        setError("Sign out failed. Please try again.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setShowVerifyModal(true); // SHOW MODAL, DO NOT NAVIGATE YET
    } catch (error) {
      console.error("Signup error:", error); // <-- Show error in console!
      setLoading(false);
      let msg = error.message;
      if (error.code === "auth/email-already-in-use") {
        msg = "Email is already registered. Please sign in or use another email.";
      } else if (error.code === "auth/invalid-email") {
        msg = "Invalid email address!";
      } else if (error.code === "auth/weak-password") {
        msg = "Password is too weak!";
      }
      setError("Sign Up failed! " + msg);
    }
  };

  // Only navigate when OK is pressed in modal
  const handleVerifyModalOk = () => {
    setShowVerifyModal(false);
    navigation.replace('SignIn');
  };

  // Fallback modal for web if Modal fails
  const ModalPopup = ({ visible, children }) => {
    if (Platform.OS === 'web') {
      return visible ? (
        <View style={styles.webModalBg}>
          <View style={styles.modalBox}>
            {children}
          </View>
        </View>
      ) : null;
    } else {
      // Native mobile
      return (
        <Modal
          visible={visible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowVerifyModal(false)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalBox}>
              {children}
            </View>
          </View>
        </Modal>
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoWrapper}>
        <Image
          source={require('../assets/app-icon.png')}
          style={styles.logoImg}
          resizeMode="contain"
        />
        <Text style={styles.appName}>FUNDEXIS</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.header}>Create Account</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeBtn}>
            <Ionicons
              name={showPassword ? "eye" : "eye-off"}
              size={22}
              color="#007AFF"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Re-enter password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowConfirm((prev) => !prev)} style={styles.eyeBtn}>
            <Ionicons
              name={showConfirm ? "eye" : "eye-off"}
              size={22}
              color="#007AFF"
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Signing Up..." : "Sign Up"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.replace('SignIn')}>
          <Text style={styles.signInLink}>
            Already have an account? <Text style={styles.signInLinkBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
      <ModalPopup visible={showVerifyModal}>
        <Text style={styles.modalText}>
          A verification email has been sent to your email address. Please check your inbox and click the verification link before signing in.
        </Text>
        <Button title="OK" onPress={handleVerifyModalOk} />
      </ModalPopup>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#e1f5fe',
    paddingTop: 40,
    paddingBottom: 20,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 0,
    width: '100%',
  },
  logoImg: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 2,
    marginBottom: 6,
    textTransform: 'uppercase',
    textAlign: 'center',
    textShadowColor: '#7cc7fa',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  error: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
    fontSize: 15,
  },
  label: {
    fontSize: 15,
    color: '#555',
    marginLeft: 2,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ececec',
    borderRadius: 9,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f7faff',
    color: '#000',
    width: '100%',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 9,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  signInLink: {
    color: '#555',
    textAlign: 'center',
    fontSize: 15,
    marginTop: 8,
    paddingBottom: 14,
    width: '100%',
  },
  signInLinkBold: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  eyeBtn: {
    padding: 8,
    marginLeft: -40,
    zIndex: 2,
  },
  modalBg: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)"
  },
  webModalBg: {
    position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
    backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center", zIndex: 9999
  },
  modalBox: {
    backgroundColor: "#fff", padding: 24, borderRadius: 16, minWidth: 280,
    alignItems: "center"
  },
  modalText: { fontSize: 16, marginBottom: 18, textAlign: "center" }
});