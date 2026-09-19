#!/usr/bin/env bash
set -euo pipefail

build_dir=devicefarm/build
package_name=$(node -p "require('./package.json').name")

rm -rf "$build_dir"
mkdir -p "$build_dir"

# devicefarm/testspec.yml's install phase expects the zip to contain an
# npm-style tarball: it extracts it, moves package/* into place, then runs
# `npm ci`. `npm pack` gives us that deterministic tarball without adding
# npm-bundle as another global CLI dependency.
package_tarball=$(npm pack --pack-destination "$build_dir" --silent)
package_tarball_path="$build_dir/$package_tarball"

# npm pack intentionally omits package-lock.json, but Device Farm's install
# phase needs it for reproducible npm ci.
tar -xzf "$package_tarball_path" -C "$build_dir"
cp package-lock.json "$build_dir/package/package-lock.json"
tar -czf "$package_tarball_path" -C "$build_dir" package
rm -rf "$build_dir/package"

(
  cd "$build_dir"
  zip -q tests_zip_file.zip "$package_tarball"
)

printf 'Built %s\n' "$package_tarball_path"
printf 'Built %s/tests_zip_file.zip\n' "$build_dir"
