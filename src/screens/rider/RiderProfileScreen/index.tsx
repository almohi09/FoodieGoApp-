import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import supabase from '../../../config/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useRiderStore } from '../../../store/riderStore';
import { showToast } from '../../../utils/toast';
import styles from './styles';
import { Colors } from '../../../theme';
import { SkeletonLoader } from '@/components/SkeletonLoader';

export const RiderProfileScreen: React.FC = () => {
  const authProfile = useAuthStore(state => state.profile);
  const signOut = useAuthStore(state => state.signOut);
  const { riderId, initialize } = useRiderStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rating, setRating] = useState(5);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [vehicleType, setVehicleType] = useState('bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const isVerified = totalDeliveries > 0;

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!authProfile?.id) {
        return;
      }
      setLoading(true);
      try {
        if (!riderId) {
          await initialize(authProfile.id);
        }

        setName(authProfile.name || 'Rider');
        setPhone(authProfile.phone || '');

        const riderKey = useRiderStore.getState().riderId;
        if (!riderKey) {
          return;
        }

        const { data } = await supabase
          .from('riders')
          .select('rating,total_deliveries,vehicle_type,vehicle_number')
          .eq('id', riderKey)
          .maybeSingle<{
            rating: number | null;
            total_deliveries: number | null;
            vehicle_type: string | null;
            vehicle_number: string | null;
          }>();

        if (data) {
          setRating(Number(data.rating || 5));
          setTotalDeliveries(Number(data.total_deliveries || 0));
          setVehicleType(data.vehicle_type || 'bike');
          setVehicleNumber(data.vehicle_number || '');
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [authProfile?.id, initialize, riderId]);

  const saveVehicle = async () => {
    const riderKey = useRiderStore.getState().riderId;
    if (!riderKey) {
      return;
    }

    const { error } = await supabase
      .from('riders')
      .update({
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber,
      })
      .eq('id', riderKey);

    if (error) {
      showToast(error.message || 'Update failed', 'error');
      return;
    }

    showToast('Vehicle details updated.', 'success');
  };

  const onLogout = async () => {
    await signOut();
  };

  if (loading || !minDelayDone) {
    return <SkeletonLoader />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.statusBanner, isVerified ? styles.verifiedBanner : styles.pendingBanner]}>
        <Text style={styles.statusBannerText}>
          {isVerified ? 'Verified Rider' : 'Verification pending - 1-2 days'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.text}>{phone}</Text>
        <View style={styles.starsRow}>
          {[0, 1, 2, 3, 4].map(index => (
            <Icon
              key={`star-${index}`}
              name={index < Math.round(rating) ? 'star' : 'star-outline'}
              size={22}
              color={Colors.STAR}
            />
          ))}
        </View>
        <Text style={styles.text}>
          {rating.toFixed(1)} based on {totalDeliveries} deliveries
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalDeliveries} deliveries</Text>
        </View>
      </View>

      <View style={styles.vehicleCard}>
        <Text style={styles.title}>Vehicle Details</Text>
        <View style={styles.vehicleHead}>
          <Icon
            name={vehicleType === 'bicycle' ? 'bicycle' : 'car-sport-outline'}
            size={20}
            color={Colors.INFO}
          />
          <Text style={styles.vehicleHeadText}>{vehicleType.toUpperCase()}</Text>
        </View>
        <TextInput
          style={styles.input}
          value={vehicleType}
          onChangeText={setVehicleType}
          placeholder="Type (bike/bicycle/scooter)"
        />
        <TextInput
          style={styles.input}
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          placeholder="Vehicle number"
        />
        <View style={styles.plateCard}>
          <Text style={styles.plateText}>{vehicleNumber || 'MH00 XX 0000'}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.actionButton} onPress={() => void saveVehicle()}>
          <Text style={styles.actionText}>Save Vehicle</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.text}>Aadhar: Verified</Text>
        <Text style={styles.text}>Driving License: Verified</Text>
        <Text style={styles.text}>RC: Verified</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Bank Account</Text>
        <Text style={styles.text}>Account: XXXX XXXX 2451</Text>
        <Text style={styles.text}>IFSC: HDFC0001234</Text>
      </View>

      <TouchableOpacity activeOpacity={0.7} style={styles.logoutButton} onPress={() => void onLogout()}>
        <Text style={styles.actionText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default RiderProfileScreen;


