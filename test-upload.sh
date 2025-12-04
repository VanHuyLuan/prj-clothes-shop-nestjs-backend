#!/bin/bash

# Test script cho upload API
# Thay đổi đường dẫn file phù hợp với hệ thống của bạn

echo "Testing upload API..."

# Test 1: Upload config
echo "1. Getting upload config..."
curl -X GET "http://localhost:4000/upload/config" -H "accept: application/json"
echo -e "\n\n"

# Test 2: Upload single image (cần thay đổi đường dẫn file)
echo "2. Testing single image upload..."
echo "Note: Thay đổi đường dẫn file trong script này"
# curl -X POST "http://localhost:4000/upload/image" -F "file=@C:\path\to\your\image.jpg" -F "folder=test"

# Test 3: Delete image (cần URL thực từ response upload)
echo "3. Testing delete image..."
echo "Note: Cần URL thực từ response upload"
# curl -X DELETE "http://localhost:4000/upload/image?url=YOUR_CLOUDINARY_URL"

echo "Hoàn thành test script!"