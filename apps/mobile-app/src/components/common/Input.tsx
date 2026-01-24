import React, { useState, useId } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  required?: boolean;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  secureTextEntry,
  required,
  hint,
  style,
  accessibilityLabel,
  accessibilityHint,
  ...props
}) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  // Generate unique IDs for accessibility relationships
  const inputId = useId();
  const labelId = `${inputId}-label`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  // Build accessibility label
  const getAccessibilityLabel = () => {
    if (accessibilityLabel) return accessibilityLabel;
    let labelText = label || '';
    if (required) labelText += ', required';
    if (error) labelText += `, error: ${error}`;
    return labelText;
  };

  // Build accessibility hint
  const getAccessibilityHint = () => {
    if (accessibilityHint) return accessibilityHint;
    if (hint) return hint;
    return undefined;
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label} nativeID={labelId} accessibilityRole="text">
          {label}
          {required && ' *'}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}
        accessible={false}
      >
        {leftIcon && (
          <View style={styles.leftIcon} accessibilityElementsHidden importantForAccessibility="no">
            {leftIcon}
          </View>
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="#767676" // Improved contrast for placeholder
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityHint={getAccessibilityHint()}
          accessibilityLabelledBy={label ? labelId : undefined}
          accessibilityState={{
            disabled: props.editable === false,
          }}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsSecure(!isSecure)}
            accessibilityRole="button"
            accessibilityLabel={isSecure ? 'Show password' : 'Hide password'}
            accessibilityHint="Toggle password visibility"
          >
            <Text style={styles.showHideText}>{isSecure ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <View style={styles.rightIcon} accessibilityElementsHidden importantForAccessibility="no">
            {rightIcon}
          </View>
        )}
      </View>
      {hint && !error && (
        <Text style={styles.hint} nativeID={hintId} accessibilityRole="text">
          {hint}
        </Text>
      )}
      {error && (
        <Text
          style={styles.error}
          nativeID={errorId}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A', // Improved contrast (was #333)
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    minHeight: 52, // Ensures minimum touch target height
  },
  inputContainerFocused: {
    borderColor: '#D62839',
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: '#D32F2F',
    borderWidth: 2,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A', // Improved contrast (was #333)
    minHeight: 48, // For better touch target
  },
  leftIcon: {
    marginRight: 8,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIcon: {
    marginLeft: 8,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButton: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 44, // Minimum touch target
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  showHideText: {
    color: '#D62839', // Improved contrast (was #E91E63)
    fontWeight: '600',
    fontSize: 14,
  },
  hint: {
    color: '#525252', // Accessible gray
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    lineHeight: 16,
  },
  error: {
    color: '#D32F2F', // Improved contrast (was #F44336)
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
});
