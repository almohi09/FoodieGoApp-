import React, { useMemo, useSyncExternalStore } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import {
  clearErrorRecords,
  getErrorRecords,
  subscribeToErrors,
} from '../../../monitoring/errorCenter';
import { RootStackParamList } from '../../navigation/AppNavigator';

type ErrorCenterNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ErrorCenter'
>;

export const ErrorCenterScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ErrorCenterNavigationProp>();

  const records = useSyncExternalStore(subscribeToErrors, getErrorRecords);
  const data = useMemo(() => [...records], [records]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backIcon, { color: colors.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Error Center
        </Text>
        <TouchableOpacity onPress={clearErrorRecords}>
          <Text style={[styles.clear, { color: colors.error }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No captured errors
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Runtime and boundary errors will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.row}>
              <Text style={[styles.source, { color: colors.primary }]}>
                {item.source}
              </Text>
              <Text style={[styles.time, { color: colors.textTertiary }]}>
                {new Date(item.timestamp).toLocaleTimeString()}
              </Text>
            </View>
            <Text style={[styles.message, { color: colors.textPrimary }]}>
              {item.message}
            </Text>
            {item.stack ? (
              <Text
                numberOfLines={5}
                style={[styles.stack, { color: colors.textSecondary }]}
              >
                {item.stack}
              </Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backIcon: {
    fontSize: 24,
    width: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  clear: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  empty: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 12,
  },
  source: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  time: {
    fontSize: 12,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  stack: {
    fontSize: 12,
    lineHeight: 17,
  },
});
