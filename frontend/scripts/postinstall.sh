#!/bin/bash
set -e

echo "Updating submodules"
git submodule update --init --recursive

echo "Installing graphicsConversionTools"
cd arson/graphicsConversionTools && npm install
