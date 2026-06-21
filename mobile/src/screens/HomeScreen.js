import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getProductsApi } from '../api/product.api';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../store/AuthContext';
import { useDevice } from '../store/DeviceContext';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { layout } = useDevice();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = useCallback(async (p = 1, s = search) => {
    try {
      const res = await getProductsApi({ page: p, limit: 10, search: s });
      if (p === 1) {
        setProducts(res.data);
      } else {
        setProducts((prev) => [...prev, ...res.data]);
      }
      setTotalPages(res.meta.totalPages);
      setPage(p);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchProducts(1, search);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(1, search);
  };

  const onEndReached = () => {
    if (page < totalPages) fetchProducts(page + 1, search);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: layout.safeTop + 12 }]}>
        <View>
          <Text style={styles.greeting}>Xin chào, {user?.name} 👋</Text>
          <Text style={styles.subtitle}>Khám phá sản phẩm</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('ProductForm', { product: null })}
        >
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Tìm kiếm sản phẩm..."
        placeholderTextColor="#9CA3AF"
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2563EB" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: layout.contentPaddingBottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <Text style={styles.empty}>Không có sản phẩm nào.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  greeting: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '600' },
  searchInput: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontSize: 15 },
});
