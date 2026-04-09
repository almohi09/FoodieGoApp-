export const Spacing = {
  xs: 4,
  sm: 8,
  cardGap: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenEdge: 16,
  sectionGap: 24,
  cardPadding: 16,
  iconText: 8,
  touchTarget: 44,
} as const;

export const Radius = { sm: 6, md: 10, lg: 14, xl: 20, full: 999 } as const;

export const Shadow = {
  sm: {
    // '#000' intentional - circular import prevention
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    // '#000' intentional - circular import prevention
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export default Spacing;
