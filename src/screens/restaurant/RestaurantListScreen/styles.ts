import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  filterChipText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  sortContainer: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    marginRight: spacing.sm,
  },
  sortChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginRight: spacing.sm,
  },
  sortChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  sortChipText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  sortChipTextActive: {
    color: colors.primary,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.md,
  },
  emptyContainer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default styles;
