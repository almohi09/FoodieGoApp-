import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  errorCard: {
    backgroundColor: colors.errorLight,
    borderRadius: 10,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
  retryText: {
    ...typography.captionSemibold,
    color: colors.error,
  },
  tabChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  tabText: { ...typography.smallMedium, color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  heroWrap: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  heroLabel: { ...typography.caption, color: colors.textSecondary },
  heroValue: { ...typography.h1, color: colors.textPrimary, marginTop: spacing.xs },
  heroMeta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: { ...typography.bodySemibold, color: colors.textPrimary, marginBottom: spacing.sm },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  listLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  listTitle: {
    ...typography.captionSemibold,
    color: colors.textPrimary,
  },
  listText: { ...typography.caption, color: colors.textSecondary },
  listAmount: {
    ...typography.captionSemibold,
    color: colors.success,
  },
});

export default styles;



