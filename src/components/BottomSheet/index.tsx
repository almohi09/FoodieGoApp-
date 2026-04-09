import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '../../theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ visible, onClose, children }) => {
  const translateY = useRef(new Animated.Value(460)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 460,
      useNativeDriver: true,
      damping: 20,
      stiffness: 220,
      mass: 0.8,
    }).start();
  }, [translateY, visible]);

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
              <TouchableOpacity activeOpacity={0.7} style={styles.handleArea} onPress={onClose}>
                <View style={styles.handle} />
              </TouchableOpacity>
              {children}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.OVERLAY,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.BG_PRIMARY,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    ...Shadow.md,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.BORDER_DARK,
  },
});

export default BottomSheet;
