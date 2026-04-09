import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import supabase from '../../../config/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useOwnerStore } from '../../../store/ownerStore';
import { showToast } from '../../../utils/toast';
import { Colors } from '../../../theme';
import styles from './styles';
import { SkeletonLoader } from '@/components/SkeletonLoader';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface HoursRow {
  day: string;
  from: string;
  to: string;
  enabled: boolean;
}

export const OwnerProfileScreen: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const { currentRestaurant, fetchCurrentRestaurant } = useOwnerStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(['', '', '', '', '']);
  const [lat, setLat] = useState(25.4358);
  const [lng, setLng] = useState(81.8463);
  const [hours, setHours] = useState<HoursRow[]>(
    DAYS.map(day => ({ day, from: '09:00', to: '22:00', enabled: true })),
  );
  const [seedSnapshot, setSeedSnapshot] = useState('');
  const [erroredPhotos, setErroredPhotos] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!profile?.id) {
        return;
      }

      setLoading(true);
      setScreenError(null);
      try {
        if (!currentRestaurant) {
          await fetchCurrentRestaurant(profile.id);
        }

        const restaurant = useOwnerStore.getState().currentRestaurant;
        if (!restaurant) {
          return;
        }

      setName(restaurant.name || '');
      setDescription(restaurant.description || '');
      setCuisineType(restaurant.cuisine_type || '');
      setDeliveryFee(String(restaurant.delivery_fee || '0'));
      setMinOrderAmount(String(restaurant.min_order_amount || '0'));
      setImageUrls(prev => {
        const next = prev.filter(Boolean);
        if (restaurant.image_url) {
          return [restaurant.image_url, ...next.filter(url => url !== restaurant.image_url)];
        }
        return next;
      });
      if (typeof restaurant.lat === 'number') {
        setLat(restaurant.lat);
      }
      if (typeof restaurant.lng === 'number') {
        setLng(restaurant.lng);
      }
        const nextSeed = JSON.stringify({
          name: restaurant.name || '',
          description: restaurant.description || '',
          cuisineType: restaurant.cuisine_type || '',
          deliveryFee: String(restaurant.delivery_fee || '0'),
          minOrderAmount: String(restaurant.min_order_amount || '0'),
          imageUrls: restaurant.image_url ? [restaurant.image_url] : [],
          lat: typeof restaurant.lat === 'number' ? restaurant.lat : 25.4358,
          lng: typeof restaurant.lng === 'number' ? restaurant.lng : 81.8463,
          hours: DAYS.map(day => ({ day, from: '09:00', to: '22:00', enabled: true })),
        });
        setSeedSnapshot(nextSeed);
      } catch (error) {
        setScreenError(
          error instanceof Error ? error.message : 'Failed to load profile details.',
        );
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [currentRestaurant?.id, profile?.id]);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  const hasChanges = useMemo(
    () =>
      JSON.stringify({
        name: name.trim(),
        description: description.trim(),
        cuisineType: cuisineType.trim(),
        deliveryFee,
        minOrderAmount,
        imageUrls: imageUrls.filter(Boolean),
        lat,
        lng,
        hours,
      }) !== seedSnapshot,
    [cuisineType, deliveryFee, description, hours, imageUrls, lat, lng, minOrderAmount, name, seedSnapshot],
  );
  const canSave = useMemo(() => name.trim().length > 0 && hasChanges, [hasChanges, name]);

  const saveChanges = async () => {
    if (!currentRestaurant || !canSave) {
      return;
    }

    const { error } = await supabase
      .from('restaurants')
      .update({
        name: name.trim(),
        description: description.trim(),
        cuisine_type: cuisineType.trim(),
        delivery_fee: Number(deliveryFee || 0),
        min_order_amount: Number(minOrderAmount || 0),
        image_url: imageUrls[0] || null,
        lat,
        lng,
      })
      .eq('id', currentRestaurant.id);

    if (error) {
      showToast(error.message || 'Update failed', 'error');
      return;
    }

    showToast('Restaurant details updated successfully.', 'success');
    setSeedSnapshot(
      JSON.stringify({
        name: name.trim(),
        description: description.trim(),
        cuisineType: cuisineType.trim(),
        deliveryFee,
        minOrderAmount,
        imageUrls: imageUrls.filter(Boolean),
        lat,
        lng,
        hours,
      }),
    );
  };

  if (loading || !minDelayDone) {
    return <SkeletonLoader />;
  }

  return (
    <View style={styles.container}>
      {screenError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{screenError}</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setScreenError(null)}>
            <Text style={styles.retryText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Restaurant Details</Text>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Text style={styles.label}>Cuisine Type</Text>
        <TextInput style={styles.input} value={cuisineType} onChangeText={setCuisineType} />
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Delivery Fee</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={deliveryFee}
              onChangeText={setDeliveryFee}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Min Order Amount</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={minOrderAmount}
              onChangeText={setMinOrderAmount}
            />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Opening Hours</Text>
        {hours.map((row, index) => (
          <View key={row.day} style={[styles.dayRow, !row.enabled ? styles.dayRowDisabled : null]}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{row.day}</Text>
              <Switch
                value={row.enabled}
                trackColor={{ false: Colors.BORDER_DARK, true: Colors.VEG }}
                thumbColor={Colors.TEXT_INVERSE}
                onValueChange={next =>
                  setHours(prev =>
                    prev.map((item, itemIndex) => (itemIndex === index ? { ...item, enabled: next } : item)),
                  )
                }
              />
            </View>
            <View style={styles.dayTimeRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={row.from}
                editable={row.enabled}
                onChangeText={text =>
                  setHours(prev =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, from: text } : item,
                    ),
                  )
                }
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={row.to}
                editable={row.enabled}
                onChangeText={text =>
                  setHours(prev =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, to: text } : item,
                    ),
                  )
                }
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Restaurant Images</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {imageUrls.filter(Boolean).map((url, index) => (
            <View key={`${url}-${index}`} style={styles.photoCard}>
              <Image
                source={erroredPhotos[url] ? require('../../../assets/images/placeholder.png') : { uri: url }}
                defaultSource={require('../../../assets/images/placeholder.png')}
                style={styles.photo}
                resizeMode="cover"
                onError={() =>
                  setErroredPhotos(prev => ({
                    ...prev,
                    [url]: true,
                  }))
                }
              />
              <TouchableOpacity activeOpacity={0.7}
                style={styles.photoDelete}
                onPress={() =>
                  setImageUrls(prev => prev.filter((item, itemIndex) => itemIndex !== index))
                }
              >
                <Text style={styles.photoDeleteText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity activeOpacity={0.7}
            style={styles.addPhotoCard}
            onPress={() =>
              setImageUrls(prev => [...prev, 'https://picsum.photos/seed/owner-photo/500/350'])
            }
          >
            <Text style={styles.addPhotoIcon}>ðŸ“·</Text>
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Restaurant Location</Text>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker
            draggable
            coordinate={{ latitude: lat, longitude: lng }}
            onDragEnd={event => {
              const next = event.nativeEvent.coordinate;
              setLat(next.latitude);
              setLng(next.longitude);
            }}
          />
        </MapView>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput
              style={styles.input}
              value={String(lat)}
              onChangeText={text => setLat(Number(text || 0))}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput
              style={styles.input}
              value={String(lng)}
              onChangeText={text => setLng(Number(text || 0))}
            />
          </View>
        </View>
      </View>

      </ScrollView>
      <View style={styles.saveBar}>
        <TouchableOpacity activeOpacity={0.7}
          style={[styles.saveButton, !canSave ? styles.saveButtonDisabled : null]}
          onPress={() => void saveChanges()}
          disabled={!canSave}
        >
          <Text style={styles.saveText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OwnerProfileScreen;

