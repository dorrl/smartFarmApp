import { Colors } from '@/constants/Colors';
import { ServerConfig, useServerAddress } from '@/hooks/useServerAddress';
import { useTheme } from '@/hooks/useTheme';
import { clearServerSnapshot } from '@/utils/localData';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

type RuntimeSettings = { measurementIntervalMinutes: number; syncIntervalMinutes: number; retentionMonths: number };

function ConfirmModal({ visible, title, message, onCancel, onConfirm, c }: {
    visible: boolean;
    title: string;
    message: string;
    onCancel: () => void;
    onConfirm: () => void;
    c: typeof Colors.dark;
}) {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            opacity.setValue(0);
            Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }).start();
        }
    }, [opacity, visible]);

    return <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
        <Animated.View style={[styles.modalBackdrop, { opacity }]}>
            <Pressable style={styles.modalBackdropPressable} onPress={onCancel}>
                <Pressable style={[styles.modalCard, { backgroundColor: c.main.cover }]} onPress={event => event.stopPropagation()}>
                    <Text style={[styles.modalTitle, { color: c.main.text }]}>{title}</Text>
                    <Text style={[styles.modalMessage, { color: c.subText }]}>{message}</Text>
                    <View style={styles.modalActions}>
                        <Pressable onPress={onCancel} style={[styles.modalButton, { borderColor: c.main.outline }]}>
                            <Text style={[styles.modalCancelText, { color: c.main.text }]}>취소</Text>
                        </Pressable>
                        <Pressable onPress={onConfirm} style={[styles.modalButton, { backgroundColor: c.red.text }]}>
                            <Text style={styles.modalConfirmText}>삭제</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Animated.View>
    </Modal>;
}

function ServerRuntimeSettings({ server, wide, c }: { server: ServerConfig; wide: number; c: typeof Colors.dark }) {
    const { getServerApiKey } = useServerAddress();
    const [settings, setSettings] = useState<RuntimeSettings>({ measurementIntervalMinutes: 1, syncIntervalMinutes: 5, retentionMonths: 6 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const baseUrl = server.address.startsWith('http') ? server.address : `http://${server.address}`;

    useEffect(() => {
        let active = true;
        Promise.all([fetch(`${baseUrl}/settings`, { headers: { Accept: 'application/json' } }), getServerApiKey(server.id)])
            .then(([response, savedKey]) => response.ok ? Promise.all([response.json(), savedKey]) : Promise.reject(new Error(`HTTP ${response.status}`)))
            .then(([json, savedKey]) => { if (active && json.settings) { setSettings(json.settings); setApiKey(savedKey); } })
            .catch(() => { if (active) setMessage('서버 설정을 불러올 수 없습니다.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [baseUrl, getServerApiKey, server.id]);

    const save = async () => {
        const measurementIntervalMinutes = Number(settings.measurementIntervalMinutes);
        const syncIntervalMinutes = Number(settings.syncIntervalMinutes);
        const retentionMonths = Number(settings.retentionMonths);
        if (measurementIntervalMinutes !== 1 || !Number.isInteger(syncIntervalMinutes) || syncIntervalMinutes < 1 || syncIntervalMinutes > 1440 || !Number.isInteger(retentionMonths) || retentionMonths < 1 || retentionMonths > 60) {
            setMessage('저장·앱 갱신 주기는 1~1440분, 보관 기간은 1~60개월로 입력하세요.');
            return;
        }
        setSaving(true); setMessage('');
        try {
            const response = await fetch(`${baseUrl}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey || process.env.EXPO_PUBLIC_SMARTFARM_API_KEY || '' },
                body: JSON.stringify({ measurementIntervalMinutes, syncIntervalMinutes, retentionMonths }),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            setMessage('저장·앱 갱신 주기와 보관 기간이 서버에 저장되었습니다.');
        } catch {
            setMessage('저장에 실패했습니다. 서버 주소와 API 키를 확인하세요.');
        } finally { setSaving(false); }
    };

    const deleteSavedData = async () => {
        setShowDeleteModal(false);
        setSaving(true); setMessage('');
        try {
            const response = await fetch(`${baseUrl}/data`, {
                method: 'DELETE',
                headers: { 'X-API-Key': apiKey || process.env.EXPO_PUBLIC_SMARTFARM_API_KEY || '' },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await clearServerSnapshot(server.id);
            setMessage('서버와 휴대폰에 저장된 측정 데이터가 삭제되었습니다.');
        } catch {
            setMessage('삭제에 실패했습니다. 서버 주소와 API 키를 확인하세요.');
        } finally { setSaving(false); }
    };

    return <View style={[styles.card, { backgroundColor: c.main.cover, borderColor: c.main.outline, padding: wide * 4, marginBottom: wide * 3, paddingTop: 0 }]}>
        {loading ? <ActivityIndicator color={c.accent} style={{ marginBottom: wide * 4 }} /> : <>
            <Text style={[styles.label, { color: c.subText, fontSize: wide * 3 }]}>센서 측정 주기</Text>
            <Text style={[styles.fixedValue, { color: c.main.text, borderColor: c.main.outline }]}>1분마다 측정 (고정)</Text>
            <Text style={[styles.label, { color: c.subText, fontSize: wide * 3 }]}>서버 저장·앱 갱신 주기 (분)</Text>
            <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={String(settings.syncIntervalMinutes)} keyboardType="number-pad" onChangeText={value => setSettings(current => ({ ...current, syncIntervalMinutes: Number(value) }))} />
            <Text style={[styles.label, { color: c.subText, fontSize: wide * 3 }]}>측정값 보관 기간 (개월)</Text>
            <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={String(settings.retentionMonths)} keyboardType="number-pad" onChangeText={value => setSettings(current => ({ ...current, retentionMonths: Number(value) }))} />
            <Pressable onPress={save} disabled={saving} style={[styles.saveButton, { backgroundColor: c.accent, opacity: saving ? 0.6 : 1 }]}>
                <Text style={styles.saveText}>{saving ? '저장 중...' : '서버 설정 저장'}</Text>
            </Pressable>
            <Pressable onPress={() => setShowDeleteModal(true)} disabled={saving} style={[styles.deleteButton, { borderColor: c.red.text, opacity: saving ? 0.6 : 1 }]}>
                <Text style={[styles.deleteText, { color: c.red.text }]}>저장된 측정 데이터 삭제</Text>
            </Pressable>
            {!!message && <Text style={{ color: c.subText, fontFamily: 'Pretendard-Regular', fontSize: wide * 2.7, marginTop: wide * 2 }}>{message}</Text>}
        </>}
        <ConfirmModal visible={showDeleteModal} title="서버 측정 데이터 삭제" message={`${server.name} 서버에 저장된 모든 측정값과 알림을 삭제합니다. 센서와 측정 주기 설정은 유지됩니다.`} onCancel={() => setShowDeleteModal(false)} onConfirm={() => void deleteSavedData()} c={c} />
    </View>;
}

function ServerAddressForm({ server, wide, c }: { server: ServerConfig; wide: number; c: typeof Colors.dark }) {
    const { updateServerConfig, getServerApiKey, setServerApiKey } = useServerAddress();
    const [name, setName] = useState(server.name); const [description, setDescription] = useState(server.description); const [address, setAddress] = useState(server.address); const [apiKey, setApiKey] = useState(''); const [saving, setSaving] = useState(false);
    useEffect(() => { setName(server.name); setDescription(server.description); setAddress(server.address); void getServerApiKey(server.id).then(setApiKey); }, [server, getServerApiKey]);
    return <View style={{ marginBottom: wide * 3 }}>
        <Text style={{ color: c.main.text, fontFamily: 'Pretendard-SemiBold', fontSize: wide * 3.5 }}>{server.id}</Text>
        <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={name} onChangeText={setName} placeholder="서버 이름" placeholderTextColor={c.subText} />
        <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={description} onChangeText={setDescription} placeholder="설명" placeholderTextColor={c.subText} />
        <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={address} onChangeText={setAddress} placeholder="http://192.168.0.10:3000" placeholderTextColor={c.subText} autoCapitalize="none" />
        <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={apiKey} onChangeText={setApiKey} placeholder="서버 API 키 (설정 변경·삭제용)" placeholderTextColor={c.subText} secureTextEntry autoCapitalize="none" />
        <Pressable style={[styles.saveButton, { backgroundColor: c.accent }]}
        onPress={async () => {
            setSaving(true)
            updateServerConfig(server.id, name.trim(), description.trim(), address.trim().replace(/\/$/, ''));
            void setServerApiKey(server.id, apiKey.trim()); 
            setSaving(false)
        }}
        ><Text style={styles.saveText}>서버 연결 정보 저장</Text></Pressable>
    </View>;
}

export default function Settings() {
    const { getServerById } = useServerAddress()
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { width, height } = useWindowDimensions(); const wide = Math.min(width, height) * 0.01;
    const { isDark, toggleTheme } = useTheme(); const c = isDark ? Colors.dark : Colors.light;
    const { servers, deleteServerConfig } = useServerAddress();
    const server = getServerById(id) as ServerConfig
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const deleteServer = () => {
        setShowDeleteModal(false);
        deleteServerConfig(server.id);
        router.back();
    };

    return <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: wide * 5, paddingBottom: wide * 22 }}>
        <Text style={{ fontFamily: 'Pretendard-Bold', fontSize: wide * 7, color: c.main.text, marginTop: wide * 7 }}>{server.name} 서버</Text>
        <Text style={[styles.heading, { color: c.subText, marginTop: wide * 3 }]}>센서 및 데이터 보관</Text>
        <ServerRuntimeSettings key={id} server={server} wide={wide} c={c} />
        <Text style={[styles.heading, { color: c.subText, marginTop: wide * 3 }]}>서버 연결</Text>
        <View style={[styles.card, { backgroundColor: c.main.cover, borderColor: c.main.outline, padding: wide * 4 }]}>{servers.map(server => <ServerAddressForm key={server.id} server={server} wide={wide} c={c} />)}</View>
        <Text style={[styles.heading, { color: c.subText, marginTop: wide * 3 }]}>주의 사항</Text>
        <View style={[styles.card, { backgroundColor: c.main.cover, borderColor: c.main.outline, padding: wide * 4 }]}>
            <Text style={[styles.guide, { color: c.subText }]}>1. 서버 주소는 포트까지 입력하세요. 예: http://192.168.0.10:3000</Text>
            <Text style={[styles.guide, { color: c.subText }]}>2. API 키는 서버의 SMARTFARM_API_KEY와 동일해야 설정 변경과 데이터 삭제가 가능합니다.</Text>
            <Text style={[styles.guide, { color: c.subText }]}>3. 최근 센서 상태는 휴대폰에도 저장되어, 연결이 끊겨도 마지막 동기화 값을 확인할 수 있습니다.</Text>
            <Text style={[styles.guide, { color: c.subText }]}>4. 제출·배포 전 실제 센서 측정, 앱 설정 변경, 서버 저장 파일을 한 번씩 확인하세요.</Text>
        </View>
        <Pressable onPress={() => setShowDeleteModal(true)} style={[styles.deleteButton, { backgroundColor: c.red.text }]}>
            <Text>서버 삭제</Text>
        </Pressable>
        <ConfirmModal visible={showDeleteModal} title="서버 삭제" message={`${server.name} 서버를 삭제하시겠습니까? 저장된 연결 정보도 이 기기에서 삭제됩니다.`} onCancel={() => setShowDeleteModal(false)} onConfirm={deleteServer} c={c} />
    </ScrollView>;
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 16, marginBottom: 12 }, heading: { fontFamily: 'Pretendard-SemiBold', fontSize: 14, marginBottom: 10 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }, modalBackdropPressable: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, modalCard: { width: '100%', maxWidth: 380, borderRadius: 16, padding: 20 }, modalTitle: { fontFamily: 'Pretendard-Bold', fontSize: 18, marginBottom: 10 }, modalMessage: { fontFamily: 'Pretendard-Regular', fontSize: 14, lineHeight: 21 }, modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 }, modalButton: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: 11 }, modalCancelText: { fontFamily: 'Pretendard-SemiBold' }, modalConfirmText: { color: '#FFFFFF', fontFamily: 'Pretendard-Bold' },
    label: { fontFamily: 'Pretendard-Regular', marginTop: 12, marginBottom: 5 }, input: { fontFamily: 'Pretendard-Medium', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
    saveButton: { alignItems: 'center', borderRadius: 8, paddingVertical: 10, marginTop: 12 }, saveText: { color: '#FFFFFF', fontFamily: 'Pretendard-Bold' }, fixedValue: { fontFamily: 'Pretendard-Medium', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },
    deleteButton: { alignItems: 'center', borderRadius: 8, paddingVertical: 10, marginTop: 10, borderWidth: 1 }, deleteText: { fontFamily: 'Pretendard-Bold' }, guide: { fontFamily: 'Pretendard-Regular', fontSize: 13, lineHeight: 20, marginBottom: 8 },
});
