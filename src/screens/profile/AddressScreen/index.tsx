import React, { useEffect, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { profileApi } from '@/api/profileApi';
import { SkeletonBox } from '@/components/SkeletonLoader';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { Address } from '@/types/user.types';
import { useAuthStore } from '@/store/authStore';
import styles from './styles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const AddressScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  const [items, setItems] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [minDelayDone, setMinDelayDone] = useState(false);

  const loadAddresses = async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await profileApi.getAddresses(user.id);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAddresses();
  }, [user?.id]);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  const handleSetDefault = async (addressId: string) => {
    if (!user?.id) {
      return;
    }
    await profileApi.setDefaultAddress(user.id, addressId);
    await loadAddresses();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Saved Addresses</Text>
        <View style={styles.spacer} />
      </View>

      {loading || !minDelayDone ? (
        <View style={styles.loaderWrap}>
          <SkeletonBox style={{ height: 220, marginBottom: 16, borderRadius: 16 }} />
          <SkeletonBox style={{ height: 18, width: '75%', marginBottom: 12 }} />
          <SkeletonBox style={{ height: 14, width: '58%', marginBottom: 10 }} />
          <SkeletonBox style={{ height: 14, width: '70%' }} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          removeClippedSubviews
          windowSize={5}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.label}>{item.label || 'Address'}</Text>
              <Text style={styles.line}>
                {[item.street, item.city, item.state, item.pincode].filter(Boolean).join(', ')}
              </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => void handleSetDefault(item.id)}>
                <Text style={styles.defaultBtn}>
                  {item.is_default ? 'Default' : 'Set as default'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No addresses found.</Text>}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity activeOpacity={0.7} style={styles.addBtn} onPress={() => navigation.navigate('LocationEntry')}>
          <Text style={styles.addBtnText}>Add New Address</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AddressScreen;
