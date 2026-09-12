#!/bin/bash
set -e

KEYSTORE="keystore/upload-keystore.jks"
ALIAS="upload"
INPUT_AAB="android/app/build/outputs/bundle/release/app-release.aab"
OUTPUT_AAB="app-release-bundle.aab"
JARSIGNER="/opt/homebrew/opt/openjdk/bin/jarsigner"

if [ ! -f "$INPUT_AAB" ]; then
  echo "Error: $INPUT_AAB not found."
  exit 1
fi

echo "Signing Android App Bundle..."
"$JARSIGNER" \
  -keystore "$KEYSTORE" \
  -sigalg SHA256withRSA \
  -digestalg SHA-256 \
  -signedjar "$OUTPUT_AAB" \
  "$INPUT_AAB" \
  "$ALIAS" "$@"

echo "Verifying signature..."
"$JARSIGNER" -verify "$OUTPUT_AAB"
echo "✅ Success! Signed bundle ready at $OUTPUT_AAB"
