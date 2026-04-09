import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  text: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryGhost },
  chipText: { ...typography.captionSemibold, color: colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  actionText: { ...typography.captionSemibold, color: colors.textInverse },
  errorCard: {
    marginTop: spacing.md,
    backgroundColor: colors.errorLight,
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  errorDismiss: {
    ...typography.captionSemibold,
    color: colors.error,
  },
});

export default styles;




