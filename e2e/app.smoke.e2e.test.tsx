import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';

const flattenText = (children: unknown): string => {
  if (typeof children === 'string') {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(flattenText).join('');
  }
  return '';
};

describe('App smoke flow', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('boots and routes to login options for returning users', async () => {
    let app: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      app = ReactTestRenderer.create(<App />);
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(6500);
    });

    const textNodes = app!.root.findAllByType(Text);
    const hasExpectedCopy = textNodes.some(node =>
      flattenText(node.props.children).includes('Order food in minutes'),
    );

    expect(hasExpectedCopy).toBe(true);
  });
});
