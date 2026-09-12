import { Colors } from '@/constants/Colors';
import { ServerConfig, useServerAddress } from '@/hooks/useServerAddress';
import { useTheme } from '@/hooks/useTheme';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { clearServerSnapshot } from '@/utils/localData';

type RuntimeSettings = { measurementIntervalMinutes: number; syncIntervalMinutes: number; retentionMonths: number };

function ServerRuntimeSettings({ server, wide, c }: { server: ServerConfig; wide: number; c: typeof Colors.dark }) {
    const { getServerApiKey } = useServerAddress();
    const [settings, setSettings] = useState<RuntimeSettings>({ measurementIntervalMinutes: 1, syncIntervalMinutes: 5, retentionMonths: 6 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [apiKey, setApiKey] = useState('');
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

    const deleteSavedData = () => {
        Alert.alert(
            '서버 측정 데이터 삭제',
            `${server.name} 서버에 저장된 모든 측정값과 알림을 삭제합니다. 센서와 측정 주기 설정은 유지됩니다.`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제', style: 'destructive', onPress: async () => {
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
                    }
                }
            ]
        );
    };

    return <View style={[styles.card, { backgroundColor: c.main.cover, borderColor: c.main.outline, padding: wide * 4, marginBottom: wide * 3 }]}>
        <Text style={{ fontFamily: 'Pretendard-Bold', color: c.main.text, fontSize: wide * 4 }}>{server.name}</Text>
        {loading ? <ActivityIndicator color={c.accent} style={{ marginVertical: wide * 4 }} /> : <>
            <Text style={[styles.label, { color: c.subText, fontSize: wide * 3 }]}>센서 측정 주기</Text>
            <Text style={[styles.fixedValue, { color: c.main.text, borderColor: c.main.outline }]}>1분마다 측정 (고정)</Text>
            <Text style={[styles.label, { color: c.subText, fontSize: wide * 3 }]}>서버 저장·앱 갱신 주기 (분)</Text>
            <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={String(settings.syncIntervalMinutes)} keyboardType="number-pad" onChangeText={value => setSettings(current => ({ ...current, syncIntervalMinutes: Number(value) }))} />
            <Text style={[styles.label, { color: c.subText, fontSize: wide * 3 }]}>측정값 보관 기간 (개월)</Text>
            <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={String(settings.retentionMonths)} keyboardType="number-pad" onChangeText={value => setSettings(current => ({ ...current, retentionMonths: Number(value) }))} />
            <Pressable onPress={save} disabled={saving} style={[styles.saveButton, { backgroundColor: c.accent, opacity: saving ? 0.6 : 1 }]}>
                <Text style={styles.saveText}>{saving ? '저장 중...' : '서버 설정 저장'}</Text>
            </Pressable>
            <Pressable onPress={deleteSavedData} disabled={saving} style={[styles.deleteButton, { borderColor: c.red.text, opacity: saving ? 0.6 : 1 }]}>
                <Text style={[styles.deleteText, { color: c.red.text }]}>저장된 측정 데이터 삭제</Text>
            </Pressable>
            {!!message && <Text style={{ color: c.subText, fontFamily: 'Pretendard-Regular', fontSize: wide * 2.7, marginTop: wide * 2 }}>{message}</Text>}
        </>}
    </View>;
}

function ServerAddressForm({ server, wide, c }: { server: ServerConfig; wide: number; c: typeof Colors.dark }) {
    const { updateServerConfig, getServerApiKey, setServerApiKey } = useServerAddress();
    const [name, setName] = useState(server.name); const [description, setDescription] = useState(server.description); const [address, setAddress] = useState(server.address); const [apiKey, setApiKey] = useState('');
    useEffect(() => { setName(server.name); setDescription(server.description); setAddress(server.address); void getServerApiKey(server.id).then(setApiKey); }, [server, getServerApiKey]);
    return <View style={{ marginBottom: wide * 3 }}>
        <Text style={{ color: c.main.text, fontFamily: 'Pretendard-SemiBold', fontSize: wide * 3.5 }}>{server.id}</Text>
        <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={name} onChangeText={setName} placeholder="서버 이름" placeholderTextColor={c.subText} />
        <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={description} onChangeText={setDescription} placeholder="설명" placeholderTextColor={c.subText} />
        <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={address} onChangeText={setAddress} placeholder="http://192.168.0.10:3000" placeholderTextColor={c.subText} autoCapitalize="none" />
        <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={apiKey} onChangeText={setApiKey} placeholder="서버 API 키 (설정 변경·삭제용)" placeholderTextColor={c.subText} secureTextEntry autoCapitalize="none" />
        <Pressable style={[styles.saveButton, { backgroundColor: c.accent }]} onPress={() => { updateServerConfig(server.id, name.trim(), description.trim(), address.trim().replace(/\/$/, '')); void setServerApiKey(server.id, apiKey.trim()); }}><Text style={styles.saveText}>서버 연결 정보 저장</Text></Pressable>
    </View>;
}

export default function Settings() {
    const { width, height } = useWindowDimensions(); const wide = Math.min(width, height) * 0.01;
    const { isDark, toggleTheme } = useTheme(); const c = isDark ? Colors.dark : Colors.light;
    const { servers } = useServerAddress();
    const [notifications, setNotifications] = useState(true);
    return <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: wide * 5, paddingBottom: wide * 22 }}>
        <Text style={{ fontFamily: 'Pretendard-Bold', fontSize: wide * 7, color: c.main.text, marginBottom: wide * 5 }}>설정</Text>
        <View style={[styles.card, { backgroundColor: c.main.cover, borderColor: c.main.outline, padding: wide * 4 }]}>
            <Text style={{ color: c.main.text, fontFamily: 'Pretendard-SemiBold', fontSize: wide * 3.5 }}>다크 모드</Text><Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: c.accent }} />
            <Text style={{ color: c.main.text, fontFamily: 'Pretendard-SemiBold', fontSize: wide * 3.5, marginTop: wide * 3 }}>알림 표시</Text><Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: c.accent }} />
        </View>
        <Text style={[styles.heading, { color: c.subText, marginTop: wide * 5 }]}>센서 및 데이터 보관</Text>
        {servers.map(server => <ServerRuntimeSettings key={server.id} server={server} wide={wide} c={c} />)}
        <Text style={[styles.heading, { color: c.subText, marginTop: wide * 3 }]}>서버 연결</Text>
        <View style={[styles.card, { backgroundColor: c.main.cover, borderColor: c.main.outline, padding: wide * 4 }]}>{servers.map(server => <ServerAddressForm key={server.id} server={server} wide={wide} c={c} />)}</View>
        <Text style={[styles.heading, { color: c.subText, marginTop: wide * 3 }]}>마무리 확인</Text>
        <View style={[styles.card, { backgroundColor: c.main.cover, borderColor: c.main.outline, padding: wide * 4 }]}>
            <Text style={[styles.guide, { color: c.subText }]}>1. 서버 주소는 포트까지 입력하세요. 예: http://192.168.0.10:3000</Text>
            <Text style={[styles.guide, { color: c.subText }]}>2. API 키는 서버의 SMARTFARM_API_KEY와 동일해야 설정 변경과 데이터 삭제가 가능합니다.</Text>
            <Text style={[styles.guide, { color: c.subText }]}>3. 최근 센서 상태는 휴대폰에도 저장되어, 연결이 끊겨도 마지막 동기화 값을 확인할 수 있습니다.</Text>
            <Text style={[styles.guide, { color: c.subText }]}>4. 제출·배포 전 실제 센서 측정, 앱 설정 변경, 서버 저장 파일을 한 번씩 확인하세요.</Text>
        </View>
    </ScrollView>;
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 16, marginBottom: 12 }, heading: { fontFamily: 'Pretendard-SemiBold', fontSize: 14, marginBottom: 10 },
    label: { fontFamily: 'Pretendard-Regular', marginTop: 12, marginBottom: 5 }, input: { fontFamily: 'Pretendard-Medium', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
    saveButton: { alignItems: 'center', borderRadius: 8, paddingVertical: 10, marginTop: 12 }, saveText: { color: '#FFFFFF', fontFamily: 'Pretendard-Bold' }, fixedValue: { fontFamily: 'Pretendard-Medium', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },
    deleteButton: { alignItems: 'center', borderRadius: 8, paddingVertical: 10, marginTop: 10, borderWidth: 1 }, deleteText: { fontFamily: 'Pretendard-Bold' }, guide: { fontFamily: 'Pretendard-Regular', fontSize: 13, lineHeight: 20, marginBottom: 8 },
});
