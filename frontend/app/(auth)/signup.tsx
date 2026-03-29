import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { COLORS, DEFAULT_PRIMARY_COLOR } from '@/constants';
import { StatusBar } from 'expo-status-bar';

export default function SignupScreen() {
  const { signup } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signup({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: 'owner',
      });
    } catch (err: any) {
      Alert.alert('Signup Failed', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS==='ios'?'padding':undefined}>
      <StatusBar style="dark"/>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Ko-nnect</Text>
        <Text style={styles.subtitle}>Create your owner account</Text>

        <View style={[styles.infoBanner]}>
          <Text style={styles.infoText}>
            This sign-up is for <Text style={{fontWeight:'700'}}>business owners only.</Text>{'\n'}
            Employees log in with credentials provided by their owner.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <TextInput style={[styles.input,{flex:1}]} placeholder="First name"
              placeholderTextColor={COLORS.textSecondary} value={firstName} onChangeText={setFirstName}/>
            <TextInput style={[styles.input,{flex:1}]} placeholder="Last name"
              placeholderTextColor={COLORS.textSecondary} value={lastName} onChangeText={setLastName}/>
          </View>
          <TextInput style={styles.input} placeholder="Email"
            placeholderTextColor={COLORS.textSecondary} value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address"/>
          <TextInput style={styles.input} placeholder="Password (min 6 characters)"
            placeholderTextColor={COLORS.textSecondary} value={password} onChangeText={setPassword}
            secureTextEntry/>

          <TouchableOpacity style={[styles.button,{backgroundColor:DEFAULT_PRIMARY_COLOR}]}
            onPress={handleSignup} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={()=>router.back()}>
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={{color:DEFAULT_PRIMARY_COLOR,fontWeight:'600'}}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:COLORS.background},
  inner:{flexGrow:1,justifyContent:'center',paddingHorizontal:28,paddingVertical:40},
  logo:{fontSize:36,fontWeight:'800',color:DEFAULT_PRIMARY_COLOR,textAlign:'center',marginBottom:6},
  subtitle:{fontSize:15,color:COLORS.textSecondary,textAlign:'center',marginBottom:20},
  infoBanner:{backgroundColor:'#EFF6FF',borderRadius:12,padding:14,marginBottom:24,borderWidth:1,borderColor:'#BFDBFE'},
  infoText:{fontSize:13,color:'#1E40AF',textAlign:'center',lineHeight:20},
  form:{gap:14},
  row:{flexDirection:'row',gap:10},
  input:{
    backgroundColor:COLORS.white,borderWidth:1,borderColor:COLORS.border,
    borderRadius:12,paddingHorizontal:16,paddingVertical:14,fontSize:16,color:COLORS.text,
  },
  button:{borderRadius:12,paddingVertical:16,alignItems:'center',marginTop:6},
  buttonText:{color:'#fff',fontSize:16,fontWeight:'700'},
  linkRow:{alignItems:'center',marginTop:4},
  linkText:{fontSize:14,color:COLORS.textSecondary},
});
