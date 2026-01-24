#!/bin/bash
# ============================================================
# Flamoral Android Keystore Generation Script
# ============================================================
#
# This script generates a release keystore for signing Android
# app bundles for Google Play Store distribution.
#
# PREREQUISITES:
# - Java JDK must be installed (keytool is included with JDK)
# - On Windows, you may need to run from Git Bash or add Java to PATH
#
# IMPORTANT:
# - Store this keystore securely - if lost, you cannot update your app!
# - Keep the passwords in a secure password manager
# - Never commit the keystore to version control
#
# ============================================================

set -e

# Configuration
KEYSTORE_DIR="credentials/android"
KEYSTORE_NAME="flamoral-release.keystore"
KEY_ALIAS="flamoral-key"
VALIDITY_DAYS=10000
STORE_PASSWORD="flamoral2026"
KEY_PASSWORD="flamoral2026"

# Distinguished Name fields
DN_NAME="Flamoral"
DN_ORG_UNIT="Mobile Development"
DN_ORG="Flamoral Inc"
DN_CITY="San Francisco"
DN_STATE="California"
DN_COUNTRY="US"

# Create credentials directory if it doesn't exist
mkdir -p "$KEYSTORE_DIR"

KEYSTORE_PATH="$KEYSTORE_DIR/$KEYSTORE_NAME"

# Check if keystore already exists
if [ -f "$KEYSTORE_PATH" ]; then
    echo "ERROR: Keystore already exists at $KEYSTORE_PATH"
    echo "Delete it first if you want to regenerate."
    exit 1
fi

# Check if keytool is available
if ! command -v keytool &> /dev/null; then
    echo "ERROR: keytool not found. Please install Java JDK."
    echo ""
    echo "Installation options:"
    echo "  - Windows: Download from https://adoptium.net/ or https://www.oracle.com/java/technologies/downloads/"
    echo "  - macOS: brew install openjdk"
    echo "  - Linux: sudo apt install openjdk-17-jdk"
    echo ""
    echo "After installing, ensure JAVA_HOME is set and keytool is in PATH."
    exit 1
fi

echo "Generating Android release keystore..."
echo "  Path: $KEYSTORE_PATH"
echo "  Alias: $KEY_ALIAS"
echo "  Validity: $VALIDITY_DAYS days"
echo ""

# Generate the keystore
keytool -genkeypair \
    -v \
    -keystore "$KEYSTORE_PATH" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity "$VALIDITY_DAYS" \
    -storepass "$STORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=$DN_NAME, OU=$DN_ORG_UNIT, O=$DN_ORG, L=$DN_CITY, ST=$DN_STATE, C=$DN_COUNTRY"

echo ""
echo "============================================================"
echo "SUCCESS! Keystore generated at: $KEYSTORE_PATH"
echo "============================================================"
echo ""
echo "Keystore Details:"
echo "  - Store Password: $STORE_PASSWORD"
echo "  - Key Alias: $KEY_ALIAS"
echo "  - Key Password: $KEY_PASSWORD"
echo ""
echo "NEXT STEPS:"
echo "1. Verify credentials.json exists with correct paths"
echo "2. To use local credentials, run: eas build -p android --profile production:local-credentials"
echo "3. To use EAS-managed credentials, run: eas build -p android --profile production"
echo ""
echo "IMPORTANT: Store these credentials securely!"
echo "  - Back up the keystore file to a secure location"
echo "  - Save passwords in a password manager"
echo "  - If you lose this keystore, you cannot update your app on Google Play!"
echo ""
