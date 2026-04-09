import React, { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../../../store/authStore';
import { useRiderStore } from '../../../store/riderStore';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import styles from './styles';

interface Props {
  onCompleted: () => void;
}

export const RiderOnboardingScreen: React.FC<Props> = ({ onCompleted }) => {
  const { showToast } = useToast();
  const profile = useAuthStore(state => state.profile);
  const createRiderProfile = useRiderStore(state => state.createRiderProfile);
  const riderError = useRiderStore(state => state.error);
  const [step, setStep] = useState(1);
  const [vehicleType, setVehicleType] = useState<'bike' | 'bicycle' | 'scooter'>('bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = async () => {
    if (!profile?.id) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const success = await createRiderProfile(profile.id, vehicleType, vehicleNumber.trim());
      if (success) {
        onCompleted();
        return;
      }

      const message = riderError || 'Failed to submit rider onboarding.';
      setSubmitError(message);
      showToast({ type: 'error', message });
    } catch {
      const message = 'Failed to submit rider onboarding.';
      setSubmitError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!profile?.id) {
    return (
      <EmptyState
        illustration="no-orders"
        title="Profile required"
        subtitle="Please complete your account profile before onboarding as a rider."
      />
    );
  }

  return (
    <View style={styles.container}>
      {step === 1 ? (
        <>
          <Text style={styles.title}>Rider Onboarding</Text>
          <Text style={styles.text}>Step 1: Basic info is already prefilled from your account.</Text>
          <Text style={styles.text}>Name: {profile?.name || 'Rider'}</Text>
          <Text style={styles.text}>Phone: {profile?.phone || '-'}</Text>
          <TouchableOpacity activeOpacity={0.7} style={styles.actionButton} onPress={() => setStep(2)}>
            <Text style={styles.actionText}>Continue</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text style={styles.title}>Select Vehicle Type</Text>
          <View style={styles.chipRow}>
            {(['bike', 'bicycle', 'scooter'] as const).map(type => (
              <TouchableOpacity activeOpacity={0.7}
                key={type}
                style={[styles.chip, vehicleType === type ? styles.chipActive : null]}
                onPress={() => setVehicleType(type)}
              >
                <Text style={styles.chipText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity activeOpacity={0.7} style={styles.actionButton} onPress={() => setStep(3)}>
            <Text style={styles.actionText}>Continue</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Text style={styles.title}>Vehicle Number</Text>
          <TextInput
            style={styles.input}
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            placeholder="UP70AB1234"
          />
          <TouchableOpacity activeOpacity={0.7} style={styles.actionButton} onPress={() => setStep(4)}>
            <Text style={styles.actionText}>Continue</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <Text style={styles.title}>Application Submitted</Text>
          <Text style={styles.text}>Your rider profile is pending admin verification.</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.actionButton}
            onPress={() => void submit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.actionText}>Finish</Text>
            )}
          </TouchableOpacity>
        </>
      ) : null}

      {submitError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{submitError}</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setSubmitError(null)}>
            <Text style={styles.errorDismiss}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

export default RiderOnboardingScreen;
