import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { formatSensorValue } from '@/utils/formatSensorValue';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

type PicoStatus = 'on' | 'off' | 'error';

type Pico = {
    name: string;
    status: PicoStatus;
    temp?: number;
    humidity?: number;
    light?: number | string;
}

type Server = {
    name: string;
    picos?: Pico[];
}

function PicoCard({ pico, wide, isDark }: { pico: Pico; wide: number; isDark: boolean }) {
    const c = isDark ? Colors.dark : Colors.light;
    const scale = useSharedValue(1);

    const colorKey = pico.status === 'on' ? 'green' : pico.status === 'error' ? 'red' : 'sub';
    const cardColor = c[colorKey];
    const sunColor = isDark ? '#FBBF24' : '#D97706';

    const pressHandler = () => {
        scale.value = withSpring(0.96, { damping: 15 }, () => {
            scale.value = withSpring(1, { damping: 15 });
        });
    };

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const statusLabel = pico.status === 'on' ? '정상' : pico.status === 'error' ? '오류' : '오프라인';
    const statusDotColor = pico.status === 'on' ? c.green.text : pico.status === 'error' ? c.red.text : c.sub.text;

    return (
        <Pressable onPress={pressHandler}>
            <Animated.View style={[animStyle, {
                width: wide * 42,
                marginBottom: wide * 3,
                borderRadius: wide * 3.5,
                backgroundColor: cardColor.cover,
                borderWidth: 1,
                borderColor: cardColor.outline,
                overflow: 'hidden',
            }]}>
                <View style={{ padding: wide * 3 }}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: wide * 2.5 }}>
                        <Text style={{ fontFamily: 'Pretendard-Bold', fontSize: wide * 4, color: cardColor.text }}>
                            {pico.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: wide * 1 }}>
                            <View style={{ width: wide * 1.8, height: wide * 1.8, borderRadius: wide, backgroundColor: statusDotColor }} />
                            <Text style={{ fontFamily: 'Pretendard-Medium', fontSize: wide * 2.5, color: statusDotColor }}>
                                {statusLabel}
                            </Text>
                        </View>
                    </View>

                    {/* Sensor values */}
                    {pico.temp != null && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: wide * 2.5, alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: wide * 1 }}>
                                <Ionicons name="thermometer-outline" size={wide * 3.5} color={cardColor.text} />
                                <Text style={{ fontFamily: 'Pretendard-SemiBold', fontSize: wide * 4.5, color: cardColor.text }}>
                                    {formatSensorValue(pico.temp)}°
                                </Text>
                            </View>
                            {pico.humidity != null && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: wide * 1 }}>
                                    <Ionicons name="water-outline" size={wide * 3.5} color={cardColor.text} />
                                    <Text style={{ fontFamily: 'Pretendard-SemiBold', fontSize: wide * 4.5, color: cardColor.text }}>
                                        {formatSensorValue(pico.humidity)}%
                                    </Text>
                                </View>
                            )}
                            {pico.light != null && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: wide * 0.8, backgroundColor: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(217,119,6,0.1)', paddingHorizontal: wide * 1.5, paddingVertical: wide * 0.5, borderRadius: wide * 1.5 }}>
                                    <Ionicons name="sunny" size={wide * 3.2} color={sunColor} />
                                    <Text style={{ fontFamily: 'Pretendard-Bold', fontSize: wide * 3.8, color: sunColor }}>
                                        {typeof pico.light === 'number' ? `${formatSensorValue(pico.light)}lx` : pico.light}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </Animated.View>
        </Pressable>
    );
}

export function ServerPanel({ server }: { server: Server }) {
    const { width, height } = useWindowDimensions();
    const wide = Math.min(width, height) * 0.01;
    const { isDark } = useTheme();
    const c = isDark ? Colors.dark : Colors.light;

    const picos: Pico[] = server.picos ?? [
        { name: 'Pico 1', status: 'on', temp: 24, humidity: 62 },
        { name: 'Pico 2', status: 'off' },
    ];

    return (
        <View style={{
            width: wide * 90,
            borderRadius: wide * 5,
            backgroundColor: c.main.cover,
            padding: wide * 5,
            borderWidth: 1,
            borderColor: c.main.outline,
            shadowColor: isDark ? c.accent : '#000',
            shadowOffset: { width: 0, height: wide * 1.5 },
            shadowOpacity: isDark ? 0.25 : 0.08,
            shadowRadius: wide * 4,
            elevation: 8,
        }}>
            {/* Server header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: wide * 5 }}>
                <View style={{
                    width: wide * 9,
                    height: wide * 9,
                    borderRadius: wide * 2.5,
                    backgroundColor: isDark ? 'rgba(74,222,128,0.15)' : 'rgba(34,197,94,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: wide * 3,
                }}>
                    <Ionicons name="server-outline" size={wide * 5} color={c.accent} />
                </View>
                <View>
                    <Text style={{ fontFamily: 'Pretendard-Bold', fontSize: wide * 5, color: c.main.text }}>
                        {server.name}
                    </Text>
                    <Text style={{ fontFamily: 'Pretendard-Regular', fontSize: wide * 2.8, color: c.subText, marginTop: wide * 0.5 }}>
                        스마트팜 제어 서버
                    </Text>
                </View>
                <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: wide * 1 }}>
                    <View style={{ width: wide * 1.8, height: wide * 1.8, borderRadius: wide, backgroundColor: c.accent }} />
                    <Text style={{ fontFamily: 'Pretendard-Medium', fontSize: wide * 2.5, color: c.accent }}>온라인</Text>
                </View>
            </View>

            {/* Pico cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: wide * 3, justifyContent: 'space-between' }}>
                {picos.map((pico, i) => (
                    <PicoCard key={i} pico={pico} wide={wide} isDark={isDark} />
                ))}
            </View>
        </View>
    );
}
