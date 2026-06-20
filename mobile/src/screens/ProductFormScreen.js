import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { createProductApi, updateProductApi } from '../api/product.api';
import Input from '../components/Input';
import Button from '../components/Button';

export default function ProductFormScreen({ route, navigation }) {
  const existing = route.params?.product;
  const isEdit = !!existing;

  const [form, setForm] = useState({
    name: existing?.name || '',
    description: existing?.description || '',
    price: existing?.price ? String(existing.price) : '',
    stock: existing?.stock ? String(existing.stock) : '',
    image_url: existing?.image_url || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Tên sản phẩm không được để trống.';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
      e.price = 'Giá phải là số dương.';
    if (!form.stock || isNaN(Number(form.stock)) || Number(form.stock) < 0)
      e.stock = 'Tồn kho phải là số nguyên dương.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
      };
      if (isEdit) {
        await updateProductApi(existing.id, payload);
        Alert.alert('Thành công', 'Cập nhật sản phẩm thành công.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createProductApi(payload);
        Alert.alert('Thành công', 'Thêm sản phẩm thành công.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</Text>

        <Input label="Tên sản phẩm *" value={form.name} onChangeText={set('name')} placeholder="Nhập tên sản phẩm" error={errors.name} autoCapitalize="sentences" />
        <Input label="Mô tả" value={form.description} onChangeText={set('description')} placeholder="Mô tả sản phẩm" autoCapitalize="sentences" />
        <Input label="Giá (VNĐ) *" value={form.price} onChangeText={set('price')} placeholder="0" keyboardType="numeric" error={errors.price} />
        <Input label="Tồn kho *" value={form.stock} onChangeText={set('stock')} placeholder="0" keyboardType="numeric" error={errors.stock} />
        <Input label="URL hình ảnh" value={form.image_url} onChangeText={set('image_url')} placeholder="https://..." />

        <Button
          title={isEdit ? 'Cập nhật' : 'Thêm sản phẩm'}
          onPress={handleSubmit}
          loading={loading}
          style={styles.btn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 24 },
  btn: { marginTop: 8 },
});
