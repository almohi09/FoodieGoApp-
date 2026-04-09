import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  stateTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  headerImageContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.md,
  },
  compactInfoPill: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.sm,
    backgroundColor: colors.white95,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  compactInfoName: {
    ...typography.captionSemibold,
    color: colors.textPrimary,
  },
  compactInfoMeta: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerName: {
    ...typography.h3,
    color: colors.textInverse,
  },
  headerMeta: {
    ...typography.caption,
    color: colors.textInverse,
    marginTop: spacing.xs,
  },
  searchContainer: {
    margin: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.sm + 2,
    marginLeft: spacing.sm,
  },
  tabsContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  tabChip: {
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  tabChipActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  menuContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
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
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  menuItemCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  menuItemInfo: {
    flex: 1,
    paddingRight: spacing.md,
  },
  vegDot: {
    width: 9,
    height: 9,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  customizeLabel: {
    ...typography.smallMedium,
    color: colors.primary,
    marginTop: 2,
  },
  menuItemName: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  menuItemDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  menuItemPrice: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  menuItemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  menuItemPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    minWidth: 74,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  addButtonText: {
    ...typography.captionSemibold,
    color: colors.primary,
  },
  quantityContainer: {
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
  },
  quantityAction: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityActionText: {
    ...typography.bodySemibold,
    color: colors.textInverse,
  },
  quantityText: {
    ...typography.captionSemibold,
    color: colors.textInverse,
  },
});

export default styles;
