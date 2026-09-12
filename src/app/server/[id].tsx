import { Colors } from '@/constants/Colors';
import { useServerAddress } from '@/hooks/useServerAddress';
import { useTheme } from '@/hooks/useTheme';
import { loadServerSnapshot, saveServerSnapshot } from '@/utils/localData';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// ─── Types ────────────────────────────────────────────────────────────────────

type PicoStatus = 'normal' | 'wrong' | 'disconnected';

interface Pico {
    id?: string;
    name: string;
    temp?: number;
    tempMax?: number;
    humidity?: number;
    humidityMax?: number;
    activeTime?: string;
    status: PicoStatus;
}

type FilterType = 'normal' | 'all' | 'wrong';

// ─── User Specified API response types ────────────────────────────────────────

export type PicoState = {
    temperature: number;
    moisture: number;
    light: number;
}

export type PicoType = {
    name: string;
    id: string;
    connected: boolean;
    state: PicoState;
}

export type Respond = {
    state: number;
    pico: PicoType[];
}

function normalizePico(raw: PicoType): Pico {
    let status: PicoStatus = 'normal';
    if (!raw.connected) {
        status = 'disconnected';
    } else {
        if (raw.state.temperature > 30 || raw.state.temperature < 15 || raw.state.moisture < 30) {
            status = 'wrong';
        }
    }

    return {
        id: raw.id,
        name: raw.name || raw.id,
        temp: raw.state.temperature,
        tempMax: 35,
        humidity: raw.state.moisture,
        humidityMax: 100,
        activeTime: `${raw.state.light} lx`,
        status,
    };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GaugeBar({ label, value, max, color, wide, isDark, unit }: {
    label: string; value: number; max: number; color: string; wide: number; isDark: boolean; unit?: string;
}) {
    const pct = Math.min(Math.max((value / max) * 100, 0), 100);
    const displayUnit = unit || (label === '온도' ? '°C' : label === '습도' ? '%' : ' lx');
    return (
        <View style={{ marginBottom: wide * 1.8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: wide * 0.6 }}>
                <Text style={{ fontSize: wide * 2.8, fontFamily: 'Pretendard-Regular', color: isDark ? '#94A3B8' : '#64748B' }}>{label}</Text>
                <Text style={{ fontSize: wide * 2.8, fontFamily: 'Pretendard-Bold', color }}>{value}{displayUnit}</Text>
            </View>
            <View style={[styles.gaugeTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                <View style={[styles.gaugeFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

function LargePicoCard({ pico, wide, isDark }: { pico: Pico; wide: number; isDark: boolean }) {
    const c = isDark ? Colors.dark : Colors.light;
    const scale = useSharedValue(1);

    const pressHandler = () => {
        scale.value = withSpring(0.97, { damping: 15 }, () => {
            scale.value = withSpring(1, { damping: 15 });
        });
    };

    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    let cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF';
    let borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    let badgeBg = '', badgeText = '', badgeLabel = '';
    let tempColor = isDark ? '#60A5FA' : '#3B82F6';
    let humidColor = isDark ? '#4ADE80' : '#22C55E';
    let lightColor = isDark ? '#FBBF24' : '#D97706';

    if (pico.status === 'normal') {
        badgeBg = isDark ? 'rgba(74,222,128,0.1)' : '#DCFCE7';
        badgeText = isDark ? '#4ADE80' : '#15803D';
        badgeLabel = '정상';
    } else if (pico.status === 'wrong') {
        badgeBg = isDark ? 'rgba(248,113,113,0.1)' : '#FEE2E2';
        badgeText = isDark ? '#F87171' : '#B91C1C';
        badgeLabel = '주의';
        tempColor = isDark ? '#FBD147' : '#B45309';
    } else {
        badgeBg = isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9';
        badgeText = isDark ? '#94A3B8' : '#64748B';
        badgeLabel = '비활성';
    }

    const lightVal = pico.activeTime ? parseInt(pico.activeTime.replace(/[^0-9]/g, '')) || 0 : 0;

    return (
        <Pressable onPress={pressHandler} style={{ width: '48%', marginBottom: wide * 4 }}>
            <Animated.View style={[animStyle, styles.largePico, {
                backgroundColor: cardBg, borderColor, borderRadius: wide * 4.5,
                padding: wide * 4, borderWidth: 1, minHeight: wide * 52,
                shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: wide * 2, elevation: 1.5,
            }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: wide * 3.5 }}>
                    <Text style={[styles.largePicoTitle, { color: c.main.text, fontSize: wide * 4.2 }]} numberOfLines={1}>{pico.name}</Text>
                    <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                        <Text style={{ color: badgeText, fontSize: wide * 2.4, fontFamily: 'Pretendard-Bold' }}>{badgeLabel}</Text>
                    </View>
                </View>

                {pico.status !== 'disconnected' && pico.temp != null && pico.humidity != null ? (
                    <View style={{ flex: 1 }}>
                        <GaugeBar label="온도" value={pico.temp} max={pico.tempMax || 35} color={tempColor} wide={wide} isDark={isDark} />
                        <GaugeBar label="습도" value={pico.humidity} max={pico.humidityMax || 100} color={humidColor} wide={wide} isDark={isDark} />
                        <GaugeBar label="조도" value={lightVal} max={1000} color={lightColor} wide={wide} isDark={isDark} unit=" lx" />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: wide * 1.5, paddingTop: wide * 2, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(217, 119, 6, 0.08)',
                                paddingHorizontal: wide * 2,
                                paddingVertical: wide * 1,
                                borderRadius: wide * 2,
                            }}>
                                <Ionicons name="sunny" size={wide * 3.2} color={lightColor} />
                                <Text style={{ fontSize: wide * 2.6, fontFamily: 'Pretendard-Bold', color: lightColor, marginLeft: wide * 1 }}>{pico.activeTime}</Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.centerAlign, { flex: 1, justifyContent: 'center' }]}>
                        <View style={[styles.offlineCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }]}>
                            <Ionicons name="cloud-offline-outline" size={wide * 6} color={isDark ? '#475569' : '#94A3B8'} />
                        </View>
                        <Text style={[styles.disconnectedTxt, { color: isDark ? '#475569' : '#94A3B8', fontSize: wide * 2.8, marginTop: wide * 2 }]}>
                            네트워크 연결 끊김
                        </Text>
                    </View>
                )}
            </Animated.View>
        </Pressable>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ServerDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { isDark } = useTheme();
    const c = isDark ? Colors.dark : Colors.light;
    const { width, height } = useWindowDimensions();
    const wide = Math.min(width, height) * 0.01;

    const { servers } = useServerAddress();
    const serverConfig = servers.find(s => s.id === id) || servers[0];

    const [filter, setFilter] = useState<FilterType>('all');
    const [picos, setPicos] = useState<Pico[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pollIntervalMinutes, setPollIntervalMinutes] = useState(5);

    const fetchState = useCallback(async () => {
        if (!serverConfig) return;
        try {
            setError(null);
            const formattedUrl = serverConfig.address.startsWith('http') ? serverConfig.address : `http://${serverConfig.address}`;
            const [res, settingsRes] = await Promise.all([
                fetch(`${formattedUrl}/state`, { headers: { 'Accept': 'application/json' } }),
                fetch(`${formattedUrl}/settings`, { headers: { 'Accept': 'application/json' } }).catch(() => null),
            ]);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: Respond = await res.json();
            const serverSettings = settingsRes?.ok ? await settingsRes.json() : null;
            const interval = Number(serverSettings?.settings?.syncIntervalMinutes);
            if (Number.isInteger(interval) && interval >= 1) setPollIntervalMinutes(interval);
            setPicos((json.pico ?? []).map(normalizePico));
            void saveServerSnapshot(serverConfig.id, json);
        } catch (e: any) {
            setError(e?.message ?? '서버 연결에 실패했습니다');
            const cached = await loadServerSnapshot<Respond>(serverConfig.id);
            if (cached) {
                setPicos((cached.state.pico ?? []).map(normalizePico));
                setError(`서버 연결에 실패했습니다. 휴대폰에 저장된 ${new Date(cached.savedAt).toLocaleString('ko-KR')} 데이터입니다.`);
            } else {
                setPicos([]);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [serverConfig]);

    useEffect(() => {
        setLoading(true);
        fetchState();
    }, [fetchState]);

    useEffect(() => {
        const timer = setInterval(() => { void fetchState(); }, pollIntervalMinutes * 60_000);
        return () => clearInterval(timer);
    }, [fetchState, pollIntervalMinutes]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchState();
    };

    const filteredPicos = picos.filter(p => filter === 'all' || p.status === filter);

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: wide * 6, paddingTop: wide * 8, marginBottom: wide * 2 }]}>
                <Pressable onPress={() => router.back()}
                    style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                    <Ionicons name="chevron-back" size={wide * 5} color={c.main.text} />
                </Pressable>
                <View style={{ flex: 1 }} />
                <Pressable onPress={fetchState}
                    style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                    <Ionicons name="refresh-outline" size={wide * 5} color={c.main.text} />
                </Pressable>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingHorizontal: wide * 6, paddingBottom: wide * 10 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                        tintColor={c.accent} colors={[c.accent]} />
                }
            >
                {/* Title */}
                <View style={{ marginBottom: wide * 2 }}>
                    <Text style={[styles.serverTitle, { color: c.main.text, fontSize: wide * 7.5 }]}>{serverConfig?.name ?? id}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: wide * 0.8 }}>
                        <View style={[styles.urlDot, { backgroundColor: error ? '#F87171' : c.accent }]} />
                        <Text style={{ fontFamily: 'Pretendard-Regular', fontSize: wide * 2.8, color: c.subText, marginLeft: wide * 1.5 }} numberOfLines={1}>
                            {(serverConfig?.address ?? '')}/state - {serverConfig?.description}
                        </Text>
                    </View>
                </View>

                {/* Error banner */}
                {error && (
                    <View style={[styles.errorBanner, {
                        backgroundColor: isDark ? 'rgba(248,113,113,0.08)' : '#FEF2F2',
                        borderColor: isDark ? 'rgba(248,113,113,0.2)' : '#FECACA',
                        marginBottom: wide * 4,
                    }]}>
                        <Ionicons name="warning-outline" size={wide * 4} color={isDark ? '#F87171' : '#DC2626'} />
                        <Text style={{ fontFamily: 'Pretendard-Medium', fontSize: wide * 3, color: isDark ? '#F87171' : '#DC2626', marginLeft: wide * 2, flex: 1 }}>
                            {error} - 데모(MOCK) 데이터로 시연 중입니다
                        </Text>
                    </View>
                )}

                {/* Loading state */}
                {loading ? (
                    <View style={[styles.centerAlign, { paddingVertical: wide * 20 }]}>
                        <ActivityIndicator size="large" color={c.accent} />
                        <Text style={{ fontFamily: 'Pretendard-Regular', fontSize: wide * 3.2, color: c.subText, marginTop: wide * 3 }}>
                            데이터 가져오는 중...
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Filter segments */}
                        <View style={[styles.segmentContainer, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9',
                            borderRadius: wide * 3, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            borderWidth: 1, padding: wide * 1, marginBottom: wide * 6,
                        }]}>
                            {(['normal', 'all', 'wrong'] as FilterType[]).map((type) => {
                                const isActive = filter === type;
                                const label = type === 'normal' ? '정상' : type === 'wrong' ? '점검 요망' : '전체';
                                let activeBg = isDark ? '#1C2936' : '#FFFFFF';
                                let activeTxt = type === 'wrong' ? (isDark ? '#FB7185' : '#E11D48')
                                    : type === 'all' ? (isDark ? '#E2E8F0' : '#1E293B')
                                        : (isDark ? '#4ADE80' : '#15803D');
                                return (
                                    <Pressable key={type} onPress={() => setFilter(type)} style={[
                                        styles.segmentButton,
                                        isActive && { backgroundColor: activeBg, borderRadius: wide * 2.2, elevation: 1 }
                                    ]}>
                                        <Text style={{
                                            color: isActive ? activeTxt : (isDark ? '#64748B' : '#94A3B8'),
                                            fontSize: wide * 3.2,
                                            fontFamily: isActive ? 'Pretendard-Bold' : 'Pretendard-Medium',
                                        }}>{label}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Pico Cards Grid */}
                        <View style={styles.gridContainer}>
                            {filteredPicos.map((pico, idx) => (
                                <LargePicoCard key={idx} pico={pico} wide={wide} isDark={isDark} />
                            ))}
                            {/* Add pico card */}
                            <Pressable style={{ width: '48%' }}>
                                <View style={[styles.largePico, styles.centerContent, {
                                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.005)',
                                    borderStyle: 'dashed', borderWidth: 2, borderRadius: wide * 4.5, minHeight: wide * 48,
                                }]}>
                                    <Ionicons name="add-circle" size={wide * 9} color={isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1'} style={{ marginBottom: wide * 1 }} />
                                    <Text style={{ fontFamily: 'Pretendard-Medium', fontSize: wide * 2.8, color: isDark ? '#475569' : '#94A3B8' }}>
                                        장치 연결 추가
                                    </Text>
                                </View>
                            </Pressable>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: {
        width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1.5,
    },
    scroll: { flex: 1 },
    serverTitle: { fontFamily: 'Pretendard-Bold' },
    urlDot: { width: 6, height: 6, borderRadius: 3 },
    errorBanner: {
        flexDirection: 'row', alignItems: 'center', borderWidth: 1,
        borderRadius: 12, padding: 12,
    },
    segmentContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    segmentButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    largePico: { borderWidth: 1 },
    largePicoTitle: { fontFamily: 'Pretendard-Bold' },
    disconnectedTxt: { fontFamily: 'Pretendard-Medium', textAlign: 'center' },
    centerContent: { alignItems: 'center', justifyContent: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    gaugeTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    gaugeFill: { height: '100%', borderRadius: 3 },
    centerAlign: { alignItems: 'center' },
    offlineCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
