import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── WMO WEATHER CODE MAP ────────────────────────────────────────────────────
const weatherMap = {
  0:  { label: 'Cerah',               emoji: '☀️',  bg: ['#f59e0b','#fbbf24'], lightText: true  },
  1:  { label: 'Berawan Sebagian',    emoji: '🌤️', bg: ['#2563eb','#60a5fa'], lightText: false },
  2:  { label: 'Berawan Sebagian',    emoji: '⛅',  bg: ['#475569','#94a3b8'], lightText: false },
  3:  { label: 'Berawan Tebal',       emoji: '☁️',  bg: ['#334155','#64748b'], lightText: false },
  45: { label: 'Kabut',               emoji: '🌫️', bg: ['#78716c','#a8a29e'], lightText: false },
  48: { label: 'Kabut Rime',          emoji: '🌫️', bg: ['#64748b','#94a3b8'], lightText: false },
  51: { label: 'Gerimis Ringan',      emoji: '🌦️', bg: ['#1d4ed8','#3b82f6'], lightText: false },
  61: { label: 'Hujan Ringan',        emoji: '🌧️', bg: ['#1d4ed8','#3b82f6'], lightText: false },
  63: { label: 'Hujan Sedang',        emoji: '🌧️', bg: ['#1e40af','#2563eb'], lightText: false },
  71: { label: 'Hujan Salju Ringan',  emoji: '🌨️', bg: ['#bfdbfe','#e0f2fe'], lightText: true  },
  95: { label: 'Badai Petir',         emoji: '⛈️', bg: ['#1e1b4b','#312e81'], lightText: false },
};

const getWindDirection = (degree) => {
  const dirs = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];
  return dirs[Math.round(((degree % 360) / 45)) % 8];
};

// ── Gunakan timezone offset dari API untuk jam lokal yang akurat ─────────────
const getTimePeriod = (timeString) => {
  const h = parseInt(timeString.split('T')[1].split(':')[0], 10);
  if (h >= 5  && h < 11) return 'pagi';
  if (h >= 11 && h < 15) return 'siang';
  if (h >= 15 && h < 18) return 'sore';
  return 'malam';
};

const getAppTheme = (period = 'pagi') => {
  switch (period) {
    case 'pagi':  return { colors: ['#0c1445','#1e3a8a','#3b82f6'], lightText: false, statusBar: 'light-content', stars: false };
    case 'siang': return { colors: ['#0284c7','#38bdf8','#bae6fd'], lightText: true,  statusBar: 'dark-content',  stars: false };
    case 'sore':  return { colors: ['#7c3aed','#ea580c','#fbbf24'], lightText: false, statusBar: 'light-content', stars: false };
    case 'malam': return { colors: ['#000000','#0f172a','#1e293b'], lightText: false, statusBar: 'light-content', stars: true  };
    default:      return { colors: ['#1e3a8a','#3b82f6'],           lightText: false, statusBar: 'light-content', stars: false };
  }
};

const STORAGE_KEY = 'wf_favorites_v2';

// ─── ANIMATED WEATHER CARD ───────────────────────────────────────────────────
const WeatherCard = ({ item, isFavorite, onToggleFavorite, onRefreshSingle, onRemove }) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.93)).current;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Animasi fade+slide+scale setiap kali data berubah ──
  useEffect(() => {
    // reset dulu agar animasi ulang terlihat jelas saat refresh
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    scaleAnim.setValue(0.93);

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [item.fetchedAt]); // trigger saat data direfresh

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshSingle(item);
    setIsRefreshing(false);
  };

  const info = weatherMap[item.weathercode] ?? { label: 'Tidak Diketahui', emoji: '✨', bg: ['#475569','#64748b'], lightText: false };
  // lightText: true = teks gelap (bg terang), false = teks putih (bg gelap/berwarna)
  const textColor = info.lightText ? '#0f172a' : '#ffffff';
  const subColor  = info.lightText ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)';
  const sepColor  = info.lightText ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.2)';

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <LinearGradient colors={info.bg} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>

        {/* ── Header: Nama Kota + Tombol ── */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cityName, { color: textColor }]}>{item.cityName}</Text>
            <Text style={[styles.countryName, { color: subColor }]}>
              {item.countryName}  ·  {item.timePeriod}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {/* Tombol Refresh per kartu */}
            <TouchableOpacity
              onPress={handleRefresh}
              style={[styles.iconBtn, { backgroundColor: sepColor }]}
              disabled={isRefreshing}
            >
              {isRefreshing
                ? <ActivityIndicator size="small" color={textColor} />
                : <Text style={styles.iconBtnText}>🔄</Text>
              }
            </TouchableOpacity>

            {/* Tombol Favorit */}
            <TouchableOpacity
              onPress={() => onToggleFavorite(item)}
              style={[styles.iconBtn, { backgroundColor: sepColor }]}
            >
              <Text style={[styles.iconBtnText, isFavorite && { color: '#fbbf24' }]}>
                {isFavorite ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Cuaca Utama ── */}
        <View style={styles.mainWeather}>
          <Text style={styles.emoji}>{info.emoji}</Text>
          <View>
            <Text style={[styles.temperature, { color: textColor }]}>{item.temp}°C</Text>
            <Text style={[styles.conditionLabel, { color: subColor }]}>{info.label}</Text>
          </View>
        </View>

        {/* ── Detail Bawah ── */}
        <View style={[styles.detailRow, { borderTopColor: sepColor }]}>
          <View style={styles.detailBox}>
            <Text style={[styles.detailTitle, { color: subColor }]}>💨 Angin</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>{item.windSpeed} km/h</Text>
          </View>
          <View style={[styles.detailSep, { backgroundColor: sepColor }]} />
          <View style={styles.detailBox}>
            <Text style={[styles.detailTitle, { color: subColor }]}>🧭 Arah</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>{getWindDirection(item.windDir)}</Text>
          </View>
          <View style={[styles.detailSep, { backgroundColor: sepColor }]} />
          <View style={styles.detailBox}>
            <Text style={[styles.detailTitle, { color: subColor }]}>🌡️ Feels</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>{item.timePeriod}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Tombol Hapus (inline, tanpa Alert/dialog) ── */}
      {confirmDelete ? (
        <View style={styles.deleteConfirm}>
          <Text style={[styles.deleteConfirmText, { color: subColor }]}>Yakin hapus {item.cityName}?</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.deleteConfirmBtn, { backgroundColor: '#ef4444' }]}
              onPress={() => onRemove(item.id)}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Hapus</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteConfirmBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
              onPress={() => setConfirmDelete(false)}
            >
              <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 13 }}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.removeBtn} onPress={() => setConfirmDelete(true)}>
          <Text style={styles.removeBtnText}>✕  Hapus dari daftar</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// ─── STAR DECORATION ─────────────────────────────────────────────────────────
const StarField = () => {
  const positions = [
    { top: '8%',  left: '12%' }, { top: '14%', left: '72%' },
    { top: '25%', left: '88%' }, { top: '32%', left: '5%'  },
    { top: '48%', left: '92%' }, { top: '60%', left: '18%' },
    { top: '72%', left: '82%' }, { top: '85%', left: '38%' },
    { top: '20%', left: '50%' }, { top: '55%', left: '55%' },
  ];
  return positions.map((pos, i) => (
    <Text key={i} style={[styles.star, pos, { opacity: 0.3 + (i % 4) * 0.18 }]}>✦</Text>
  ));
};

// ─── FETCH UTILITY ───────────────────────────────────────────────────────────
const fetchCityWeather = async (cityName, signal) => {
  const geoRes  = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=id`,
    { signal }
  );
  const geoData = await geoRes.json();
  if (!geoData.results?.length) throw new Error(`"${cityName}" tidak ditemukan.`);

  const { latitude, longitude, name, country } = geoData.results[0];

  // Sertakan timezone=auto agar jam yang dikembalikan API adalah jam LOKAL kota tersebut
  const fRes  = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`,
    { signal }
  );
  const fData = await fRes.json();
  if (!fData.current_weather) throw new Error('Gagal memuat data cuaca.');

  const cw = fData.current_weather;
  // cw.time sudah dalam waktu lokal kota berkat timezone=auto
  return {
    id:          `${name}_${country}`.replace(/\s+/g, '_').toLowerCase(),
    cityName:    name,
    countryName: country,
    temp:        cw.temperature,
    weathercode: cw.weathercode,
    windSpeed:   cw.windspeed,
    windDir:     cw.winddirection,
    timePeriod:  getTimePeriod(cw.time),  // jam lokal masing-masing kota
    fetchedAt:   Date.now(),              // digunakan sebagai trigger animasi
  };
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [search,     setSearch]     = useState('');
  const [debounced,  setDebounced]  = useState('');
  const [cities,     setCities]     = useState([]);
  const [favorites,  setFavorites]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [activeTab,  setActiveTab]  = useState('all');

  // ── Load favorit dari AsyncStorage saat pertama mount ──
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setFavorites(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  const persistFavorites = async (list) => {
    setFavorites(list);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  };

  const toggleFavorite = (item) => {
    const next = favorites.includes(item.id)
      ? favorites.filter(f => f !== item.id)
      : [...favorites, item.id];
    persistFavorites(next);
  };

  // ── Debounce input ──
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 600);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch saat debounced berubah ──
  useEffect(() => {
    if (!debounced.trim()) { setError(null); return; }
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCityWeather(debounced, ctrl.signal);
        setCities(prev => {
          const without = prev.filter(c => c.id !== data.id);
          return [data, ...without].slice(0, 5); // max 5 kota
        });
        setSearch('');
        setDebounced('');
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [debounced]);

  // ── Pull-to-refresh semua kota sekaligus ──
  const onRefresh = useCallback(async () => {
    if (!cities.length) return;
    setRefreshing(true);
    try {
      const results = await Promise.allSettled(
        cities.map(c => fetchCityWeather(c.cityName, new AbortController().signal))
      );
      setCities(prev =>
        prev.map((c, i) =>
          results[i].status === 'fulfilled' ? results[i].value : c
        )
      );
    } finally {
      setRefreshing(false);
    }
  }, [cities]);

  // ── Refresh satu kartu ──
  const refreshSingle = async (item) => {
    try {
      const fresh = await fetchCityWeather(item.cityName, new AbortController().signal);
      setCities(prev => prev.map(c => c.id === item.id ? fresh : c));
    } catch {}
  };

  // ── Hapus kota dari daftar ──
  const removeCity = useCallback((id) => {
    setCities(prev => prev.filter(c => c.id !== id));
  }, []);

  // ── Tampilan sesuai tab ──
  const displayedCities = activeTab === 'favorites'
    ? cities.filter(c => favorites.includes(c.id))
    : cities;

  // ── Tema app mengikuti kota pertama di daftar ──
  const dominantPeriod = cities[0]?.timePeriod ?? 'pagi';
  const theme    = getAppTheme(dominantPeriod);
  const textColor = theme.lightText ? '#0f172a' : '#f8fafc';
  const dimColor  = theme.lightText ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)';

  return (
    <LinearGradient colors={theme.colors} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={theme.statusBar} />
        {theme.stars && <StarField />}

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={[styles.appTitle, { color: textColor }]}>WeatherFinder ⛅</Text>
          <Text style={[styles.appSubtitle, { color: dimColor }]}>Cuaca real-time berbagai kota</Text>
        </View>

        {/* ── SEARCH BAR ── */}
        <View style={[styles.searchWrapper, { borderColor: dimColor }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="Cari kota... "
            placeholderTextColor={dimColor}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => setDebounced(search)}
          />
          {loading && (
            <ActivityIndicator size="small" color={textColor} style={{ marginRight: 10 }} />
          )}
        </View>

        {/* ── ERROR BUBBLE ── */}
        {!!error && (
          <View style={styles.errorBubble}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Text style={{ color: '#fca5a5', fontWeight: '700', marginLeft: 8 }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── TABS ── */}
        <View style={styles.tabs}>
          {[
            { key: 'all',       label: `🌍 Semua (${cities.length})`       },
            { key: 'favorites', label: `★ Favorit (${favorites.length})`   },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab.key ? '#fff' : dimColor }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── DAFTAR KOTA ── */}
        <FlatList
          data={displayedCities}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          // ── Pull-to-refresh ──
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={textColor}
              title="Menarik untuk refresh semua kota..."
              titleColor={dimColor}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>
                {activeTab === 'favorites' ? '⭐' : '🌐'}
              </Text>
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                {activeTab === 'favorites' ? 'Belum ada favorit' : 'Belum ada kota'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: dimColor }]}>
                {activeTab === 'favorites'
                  ? 'Tekan ☆ pada kartu kota untuk menyimpan favorit'
                  : 'Ketik nama kota di kolom pencarian untuk memulai'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <WeatherCard
              key={item.id}
              item={item}
              isFavorite={favorites.includes(item.id)}
              onToggleFavorite={toggleFavorite}
              onRefreshSingle={refreshSingle}
              onRemove={removeCity}
            />
          )}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  safe:      { flex: 1 },

  star: { position: 'absolute', fontSize: 18, color: '#ffffff' },

  header: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 4 },
  appTitle:    { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  appSubtitle: { fontSize: 13, marginTop: 2 },

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  input: { flex: 1, height: 50, fontSize: 16, fontWeight: '500' },

  errorBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  errorText: { color: '#fca5a5', fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'center' },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 3,
  },
  tab:       { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabText:   { fontSize: 13, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // Kartu cuaca
  card: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 4,
    overflow: 'hidden',
  },
  cardHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 17 },

  cityName:      { fontSize: 22, fontWeight: '800' },
  countryName:   { fontSize: 13, marginTop: 3 },

  mainWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  emoji:         { fontSize: 62 },
  temperature:   { fontSize: 48, fontWeight: '200' },
  conditionLabel:{ fontSize: 15, fontWeight: '600', marginTop: 2 },

  detailRow:  { flexDirection: 'row', borderTopWidth: 1, paddingTop: 14 },
  detailBox:  { flex: 1, alignItems: 'center' },
  detailSep:  { width: 1, marginHorizontal: 4 },
  detailTitle:{ fontSize: 12, marginBottom: 4 },
  detailValue:{ fontSize: 15, fontWeight: '700' },

  // Tombol hapus inline
  removeBtn: { alignItems: 'center', paddingVertical: 7, marginBottom: 12 },
  removeBtnText: { fontSize: 12, color: '#64748b' },

  deleteConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  deleteConfirmText: { fontSize: 13 },
  deleteConfirmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },

  emptyContainer: { marginTop: 80, alignItems: 'center', paddingHorizontal: 30 },
  emptyEmoji:     { fontSize: 52, marginBottom: 12 },
  emptyTitle:     { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle:  { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});