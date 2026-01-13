#!/bin/bash
# Helper script to create a new release
# Usage: ./release.sh [version]
# Example: ./release.sh 1.0.1

VERSION=${1:-$(node -p "require('./package.json').version")}

echo "Creating release v$VERSION"
echo "================================"

# Make sure we're on main branch
git checkout main
git pull origin main

# Create and push tag
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin "v$VERSION"

echo ""
echo "✅ Release tag v$VERSION created and pushed!"
echo "GitHub Actions will now build and create the release automatically."
echo ""
echo "View progress at: https://github.com/Qurbonsaid/ray-optics-windows/actions"
