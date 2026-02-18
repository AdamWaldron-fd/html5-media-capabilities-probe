#!/bin/bash

# Build script for WebOS/LGTV package

echo "Building WebOS package..."

# Create build directory
BUILD_DIR="build/webos"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy demo HTML as main index.html
cp demo/index.html "$BUILD_DIR/index.html"

# Copy source files
mkdir -p "$BUILD_DIR/src"
cp -r src/* "$BUILD_DIR/src/"

# Copy appinfo.json
cp appinfo.json "$BUILD_DIR/"

# Create placeholder icons if they don't exist
if [ ! -f "icon.png" ]; then
  echo "Warning: icon.png not found. Creating placeholder..."
  # Create a simple 80x80 PNG (base64 encoded 1x1 transparent PNG)
  echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > "$BUILD_DIR/icon.png" 2>/dev/null || touch "$BUILD_DIR/icon.png"
fi

if [ ! -f "largeIcon.png" ]; then
  echo "Warning: largeIcon.png not found. Creating placeholder..."
  echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > "$BUILD_DIR/largeIcon.png" 2>/dev/null || touch "$BUILD_DIR/largeIcon.png"
fi

# Copy icons if they exist
[ -f "icon.png" ] && cp icon.png "$BUILD_DIR/"
[ -f "largeIcon.png" ] && cp largeIcon.png "$BUILD_DIR/"

echo "Build directory created at: $BUILD_DIR"
echo ""
echo "Contents:"
ls -la "$BUILD_DIR"

# Check if ares-package is available
if command -v ares-package &> /dev/null; then
  echo ""
  echo "Creating IPK package..."
  cd build
  ares-package webos
  echo ""
  echo "Package created successfully!"
  ls -lh *.ipk 2>/dev/null || echo "Package location: build/"
else
  echo ""
  echo "ares-package not found. To create the IPK package:"
  echo "1. Install webOS CLI tools: npm install -g @webos-tools/cli"
  echo "2. Run: cd build && ares-package webos"
  echo ""
  echo "Or manually install the app:"
  echo "1. Zip the contents of $BUILD_DIR"
  echo "2. Change extension to .ipk"
  echo "3. Install via Developer Mode on your LG TV"
fi

echo ""
echo "Build complete!"
