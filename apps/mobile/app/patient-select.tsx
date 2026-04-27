import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { patientsApi } from '@/lib/api'
import { authStorage } from '@/lib/auth'
import type { Patient } from '@repo/types'

export default function PatientSelectScreen() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [addMode, setAddMode] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const load = async () => {
      const current = await authStorage.getCurrentPatient()
      setCurrentId(current?.id ?? null)
      try {
        const list = await patientsApi.list()
        setPatients(list)
      } catch {
        Alert.alert('Error', 'Could not load patients.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSelect = async (patient: Patient) => {
    await authStorage.setCurrentPatient(patient.id, patient.nickname)
    router.back()
  }

  const handleAdd = async () => {
    if (!newNickname.trim()) return
    setAdding(true)
    try {
      const patient = await patientsApi.create({ nickname: newNickname.trim() })
      setPatients((prev) => [...prev, patient])
      await authStorage.setCurrentPatient(patient.id, patient.nickname)
      setAddMode(false)
      setNewNickname('')
      router.back()
    } catch {
      Alert.alert('Error', 'Could not add patient.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Patient</Text>
        <Text style={styles.subtitle}>All patients in your household</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.patientCard, item.id === currentId && styles.patientCardActive]}
              onPress={() => handleSelect(item)}
            >
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{item.nickname}</Text>
                {item.birthYear && (
                  <Text style={styles.patientAge}>
                    b. {item.birthYear} · Age {new Date().getFullYear() - item.birthYear}
                  </Text>
                )}
              </View>
              {item.id === currentId && (
                <Text style={styles.activeBadge}>Active</Text>
              )}
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <View style={styles.addSection}>
              {addMode ? (
                <View style={styles.addForm}>
                  <TextInput
                    style={styles.input}
                    value={newNickname}
                    onChangeText={setNewNickname}
                    placeholder="Nickname (e.g. Ate Mia)"
                    placeholderTextColor="#475569"
                    autoFocus
                    autoCapitalize="words"
                  />
                  <View style={styles.addButtons}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => { setAddMode(false); setNewNickname('') }}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, adding && { opacity: 0.6 }]}
                      onPress={handleAdd}
                      disabled={adding}
                    >
                      <Text style={styles.saveBtnText}>{adding ? 'Saving…' : 'Add Patient'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.addHint}>Nickname only — no legal name required</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setAddMode(true)}
                >
                  <Text style={styles.addButtonText}>+ Add another patient</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 2 },
  list: { padding: 16, gap: 10 },
  patientCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
  },
  patientCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#0d2c22',
  },
  patientInfo: { gap: 2 },
  patientName: { color: '#f1f5f9', fontSize: 16, fontWeight: '600' },
  patientAge: { color: '#64748b', fontSize: 12 },
  activeBadge: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: '#0d2c22',
    borderWidth: 1,
    borderColor: '#166534',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  addSection: { marginTop: 8 },
  addButton: {
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: { color: '#10b981', fontWeight: '600', fontSize: 14 },
  addForm: { gap: 10 },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#f1f5f9',
    fontSize: 16,
  },
  addButtons: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  saveBtn: {
    flex: 2,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  addHint: { color: '#475569', fontSize: 11, textAlign: 'center' },
})
