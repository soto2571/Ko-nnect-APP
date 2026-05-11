import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const REQS = [
  { key: 'len',    label: 'Mínimo 6 caracteres',              check: (v: string) => v.length >= 6 },
  { key: 'num',    label: 'Al menos 1 número (ej. 1 2 3)',    check: (v: string) => /\d/.test(v) },
  { key: 'symbol', label: 'Al menos 1 símbolo (ej. $ % & *)', check: (v: string) => /[^a-zA-Z0-9]/.test(v) },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  showRequirements?: boolean;
}

export function PasswordField({ value, onChange, placeholder = 'Contraseña', autoFocus, showRequirements = true }: Props) {
  const [show, setShow] = useState(false);

  return (
    <View style={s.wrap}>
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor="#C4C4CE"
          secureTextEntry={!show}
          value={value}
          onChangeText={onChange}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={s.eye} onPress={() => setShow(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {showRequirements && (
        <View style={s.reqs}>
          {REQS.map(r => {
            const met = r.check(value);
            return (
              <View key={r.key} style={s.reqRow}>
                <View style={[s.dot, { backgroundColor: met ? '#10B981' : '#D1D5DB' }]} />
                <Text style={[s.reqText, met && s.reqMet]}>{r.label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function passwordValid(value: string) {
  return REQS.every(r => r.check(value));
}

const s = StyleSheet.create({
  wrap: { gap: 8 },
  inputRow: { position: 'relative' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    paddingRight: 48, fontSize: 15, color: '#111827',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  eye: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  reqs: { gap: 5, paddingLeft: 4 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  reqText: { fontSize: 12, color: '#9CA3AF' },
  reqMet:  { color: '#10B981', fontWeight: '600' },
});
