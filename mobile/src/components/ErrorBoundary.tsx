import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { colors } from '../theme/colors';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Algo deu errado</Text>
          <Text style={styles.message}>
            Desculpe, ocorreu um erro inesperado. Por favor, tente novamente.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorDetails}>{this.state.error.toString()}</Text>
          )}
          <Button
            mode="contained"
            onPress={this.handleReset}
            style={styles.button}
            buttonColor={colors.primary}
          >
            Tentar novamente
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.darkBackground,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorDetails: {
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'monospace',
  },
  button: {
    marginTop: 16,
  },
});