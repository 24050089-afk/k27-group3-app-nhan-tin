import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { getProductByIdApi, deleteProductApi } from '../api/product.api';
import { useAuth } from '../store/AuthContext';
import Button from '../components/Button';

export default function ProductDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getProductByIdApi(id)
      .then((res) => setProduct(res.data))
      .catch((err) => Alert.alert('Lỗi', err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa sản phẩm này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteProductApi(id);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Lỗi', err.message);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const formatPrice = (price) =>
    Number(price).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!product) return null;

  const isOwner = user?.id === product.user_id || user?.role === 'admin';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {product.image_url ? (
        <Image source={{ uri: product.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={{ fontSize: 64 }}>📦</Text>
        </View>
      )}

      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.price}>{formatPrice(product.price)}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Tồn kho</Text>
        <Text style={styles.value}>{product.stock}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Người đăng</Text>
        <Text style={styles.value}>{product.owner?.name}</Text>
      </View>

      {product.description ? (
        <Text style={styles.description}>{product.description}</Text>
      ) : null}

      {isOwner && (
        <View style={styles.actions}>
          <Button
            title="Chỉnh sửa"
            onPress={() => navigation.navigate('ProductForm', { product })}
            style={{ flex: 1, marginRight: 8 }}
          />
          <Button
            title="Xóa"
            onPress={handleDelete}
            loading={deleting}
            variant="outline"
            style={{ flex: 1 }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 260, backgroundColor: '#F3F4F6' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', margin: 16, marginBottom: 4 },
  price: { fontSize: 20, fontWeight: '700', color: '#2563EB', marginHorizontal: 16, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderColor: '#F3F4F6' },
  label: { color: '#6B7280', fontSize: 14 },
  value: { color: '#111827', fontSize: 14, fontWeight: '500' },
  description: { margin: 16, fontSize: 14, color: '#374151', lineHeight: 22 },
  actions: { flexDirection: 'row', margin: 16, marginTop: 24 },
});
