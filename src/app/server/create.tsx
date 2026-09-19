import { Colors } from '@/constants/Colors';
import { useServerAddress } from '@/hooks/useServerAddress';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

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
                        <Pressable onPress={onConfirm} style={[styles.modalButton, { backgroundColor: c.green.text }]}>
                            <Text style={styles.modalConfirmText}>확인</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Animated.View>
    </Modal>;
}

export default function CreateServer() {
    const router = useRouter();
    const { width, height } = useWindowDimensions(); const wide = Math.min(width, height) * 0.01;
    const { isDark, toggleTheme } = useTheme(); const c = isDark ? Colors.dark : Colors.light;

    const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [address, setAddress] = useState(''); const [apiKey, setApiKey] = useState('');
    const { addServerConfig } = useServerAddress()
    const disabled: boolean = name.trim() == '' || address.trim().replace(/\/$/, '') == ''

    function create() {
        addServerConfig(name.trim(), description.trim(), address.trim().replace(/\/$/, ''))
        router.back()
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: wide * 5, paddingBottom: wide * 22 }}>
            <View style={{ paddingTop: wide * 3}}>
                <Pressable onPress={() => router.back()}
                    style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                    <Ionicons name="chevron-back" size={wide * 5} color={c.main.text} />
                </Pressable>
            </View>
            <Text style={{ fontFamily: 'Pretendard-Bold', fontSize: wide * 7, color: c.main.text, marginTop: wide * 7 }}>서버 생성하기</Text>
            <Text style={[styles.heading, { color: c.subText, marginTop: wide * 3 }]}>서버 연결</Text>
            <View style={[styles.card, { backgroundColor: c.main.cover, borderColor: c.main.outline, padding: wide * 4, marginBottom: wide * 3, paddingTop: 0 }]}>
                <Text style={[styles.label, { color: c.subText, fontSize: wide * 3 }]}>이름</Text>
                <TextInput style={[styles.input, { color: c.main.text, borderColor: name ? c.main.outline : c.red.outline }]} value={name} onChangeText={setName} placeholder="(필수)" placeholderTextColor={c.red.outline} />
                <Text style={[styles.label, { color: c.subText, fontSize: wide * 3 }]}>설명</Text>
                <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={description} onChangeText={setDescription}/>
                <Text style={[styles.label, { color: c.subText, fontSize: wide * 3 }]}>주소</Text>
                <TextInput style={[styles.input, { color: c.main.text, borderColor: address ? c.main.outline : c.red.outline }]} value={address} onChangeText={setAddress} placeholder="(필수)" placeholderTextColor={c.red.outline} autoCapitalize="none" />
                <Text style={[styles.label, { color: c.subText, fontSize: wide * 3 }]}>서버 API 키</Text>
                <TextInput style={[styles.input, { color: c.main.text, borderColor: c.main.outline }]} value={apiKey} onChangeText={setApiKey} placeholder="(설정 변경·삭제용)" placeholderTextColor={c.subText} secureTextEntry autoCapitalize="none" />
            </View>
            <Text style={[styles.heading, { color: c.subText, marginTop: wide * 3 }]}>주의 사항</Text>
            <View style={[styles.card, { backgroundColor: c.main.cover, borderColor: c.main.outline, padding: wide * 4 }]}>
                <Text style={[styles.guide, { color: c.subText }]}>1. 서버 주소는 포트까지 입력하세요. 예: http://192.168.0.10:3000</Text>
                <Text style={[styles.guide, { color: c.subText }]}>2. API 키는 서버의 SMARTFARM_API_KEY와 동일해야 설정 변경과 데이터 삭제가 가능합니다.</Text>
                <Text style={[styles.guide, { color: c.subText }]}>3. 최근 센서 상태는 휴대폰에도 저장되어, 연결이 끊겨도 마지막 동기화 값을 확인할 수 있습니다.</Text>
                <Text style={[styles.guide, { color: c.subText }]}>4. 제출·배포 전 실제 센서 측정, 앱 설정 변경, 서버 저장 파일을 한 번씩 확인하세요.</Text>
            </View>
            <Pressable onPress={create} disabled={disabled} style={[styles.saveButton, disabled ? styles.disabled : {}, { backgroundColor: c.accent }]}>
                <Text style={styles.saveText}>서버 생성하기</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: {
        width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1.5,
    },
    card: { borderWidth: 1, borderRadius: 16, marginBottom: 12 }, heading: { fontFamily: 'Pretendard-SemiBold', fontSize: 14, marginBottom: 10 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }, modalBackdropPressable: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, modalCard: { width: '100%', maxWidth: 380, borderRadius: 16, padding: 20 }, modalTitle: { fontFamily: 'Pretendard-Bold', fontSize: 18, marginBottom: 10 }, modalMessage: { fontFamily: 'Pretendard-Regular', fontSize: 14, lineHeight: 21 }, modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 }, modalButton: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: 11 }, modalCancelText: { fontFamily: 'Pretendard-SemiBold' }, modalConfirmText: { color: '#FFFFFF', fontFamily: 'Pretendard-Bold' },
    label: { fontFamily: 'Pretendard-Regular', marginTop: 12, marginBottom: 5 }, input: { fontFamily: 'Pretendard-Medium', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
    saveButton: { alignItems: 'center', borderRadius: 8, paddingVertical: 10, marginTop: 12 }, saveText: { color: '#FFFFFF', fontFamily: 'Pretendard-Bold' }, fixedValue: { fontFamily: 'Pretendard-Medium', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },
    deleteButton: { alignItems: 'center', borderRadius: 8, paddingVertical: 10, marginTop: 10, borderWidth: 1 }, deleteText: { fontFamily: 'Pretendard-Bold' }, guide: { fontFamily: 'Pretendard-Regular', fontSize: 13, lineHeight: 20, marginBottom: 8 },
    disabled: { opacity: 0.4 }
});
