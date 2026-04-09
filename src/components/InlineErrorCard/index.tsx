import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Radius, Spacing, Typography } from '../../theme';

interface InlineErrorCardProps {
  message: string;
  onRetry: () => void;
}

export const InlineErrorCard: React.FC<InlineErrorCardProps> = ({ message, onRetry }) => (
  <View style={styles.card}>
    <View style={styles.row}>
      <Icon name="alert-circle" size={18} color={Colors.ERROR} />
      <Text style={styles.message}>{message}</Text>
    </View>
    <TouchableOpacity activeOpacity={0.7} onPress={onRetry} style={styles.retryButton}>
      <Text style={styles.retryText}>Try again</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.ERROR_LIGHT,
    borderColor: Colors.ERROR,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    ...Typography.body2,
    marginLeft: Spacing.xs,
    color: Colors.TEXT_PRIMARY,
    flex: 1,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    backgroundColor: Colors.PRIMARY,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  retryText: {
    ...Typography.label,
    color: Colors.TEXT_INVERSE,
  },
});

export default InlineErrorCard;

