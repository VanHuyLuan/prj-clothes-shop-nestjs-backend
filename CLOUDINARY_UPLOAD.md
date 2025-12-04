# 📸 Cloudinary Upload Module

Module upload ảnh sử dụng Cloudinary cho NestJS Backend với kiến trúc Controller-Service.

## 🚀 Tính năng

- ✅ Upload ảnh đơn lẻ
- ✅ Upload nhiều ảnh cùng lúc (tối đa 10 files)
- ✅ Tự động resize và optimize ảnh
- ✅ Validate file type và size
- ✅ Xóa ảnh từ Cloudinary
- ✅ Trả về URL public để lưu vào database
- ✅ Kiến trúc Controller-Service pattern
- ✅ Helper class cho validation
- ✅ Type-safe với TypeScript

## 📁 Cấu trúc thư mục

```
src/
├── cloudinary/
│   ├── cloudinary.provider.ts      # Cấu hình Cloudinary
│   ├── cloudinary.service.ts       # Service upload/delete ảnh
│   └── cloudinary.module.ts        # Module export
├── upload/
│   ├── upload.controller.ts        # API endpoints (HTTP layer)
│   ├── upload.service.ts           # Business logic layer
│   ├── upload.dto.ts               # Type definitions
│   ├── upload.module.ts            # Module configuration
│   └── file-validation.helper.ts   # Validation utilities
└── app.module.ts                   # Import UploadModule
```

## 🏗️ Kiến trúc

### Controller Layer
- Xử lý HTTP requests/responses
- Routing và middleware
- Validation request parameters

### Service Layer  
- Business logic xử lý upload
- Gọi CloudinaryService
- Error handling

### Helper Layer
- Utilities cho validation
- Constants và configuration
- Reusable functions

## 🔧 Cài đặt

1. **Cài đặt dependencies:**

```bash
npm install cloudinary streamifier @types/streamifier @nestjs/platform-express @nestjs/config
```

2. **Cấu hình environment variables:**
   Thêm vào file `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=abcdefghijklmno
```

3. **Lấy thông tin Cloudinary:**

- Đăng ký tài khoản tại [cloudinary.com](https://cloudinary.com)
- Vào Dashboard để lấy Cloud Name, API Key, API Secret

## 📡 API Endpoints

### 1. Upload ảnh đơn lẻ

```http
POST /upload/image
Content-Type: multipart/form-data

Body:
- file: [IMAGE_FILE]
- folder: "products" (optional)
```

**Response:**

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/products/abc.jpg",
    "originalName": "product.jpg",
    "size": 245760,
    "mimeType": "image/jpeg"
  }
}
```

### 2. Upload nhiều ảnh

```http
POST /upload/multiple
Content-Type: multipart/form-data

Body:
- files: [IMAGE_FILE_1, IMAGE_FILE_2, ...]
- folder: "products" (optional)
```

**Response:**

```json
{
  "success": true,
  "message": "Images uploaded successfully",
  "data": [
    {
      "url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/products/abc1.jpg",
      "originalName": "product1.jpg",
      "size": 245760,
      "mimeType": "image/jpeg"
    },
    {
      "url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/products/abc2.jpg",
      "originalName": "product2.jpg",
      "size": 187420,
      "mimeType": "image/png"
    }
  ]
}
```

## 🛡️ Validation

- **File types:** Chỉ chấp nhận `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- **File size:** Tối đa 5MB
- **Multiple upload:** Tối đa 10 files/lần

## 🔄 Auto Optimization

Cloudinary tự động:

- Resize ảnh tối đa 1000x1000px
- Optimize chất lượng ảnh
- Convert format phù hợp với trình duyệt

## 💾 Sử dụng trong Database

Sau khi upload thành công, lưu URL vào database:

```typescript
// Product entity example
@Entity('products')
export class Product {
  @Column()
  name: string;

  @Column({ nullable: true })
  imageUrl: string; // Lưu URL từ Cloudinary

  @Column('text', { array: true, nullable: true })
  imageUrls: string[]; // Lưu nhiều URLs
}
```

## 📄 Frontend Integration

### JavaScript/TypeScript

```javascript
const uploadImage = async (file, folder = 'products') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await fetch('/api/upload/image', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  return result.data.url; // URL để lưu vào database
};
```

### React Hook

```jsx
const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      return result.data.url;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploading };
};
```

## 🔧 Tùy chỉnh

### Thay đổi folder upload

```typescript
// Trong controller hoặc service
await this.cloudinaryService.uploadImage(file, 'avatars');
await this.cloudinaryService.uploadImage(file, 'banners');
```

### Xóa ảnh

```typescript
// Lấy public_id từ URL
const publicId = extractPublicId(imageUrl);
await this.cloudinaryService.deleteImage(publicId);
```

## 🚨 Error Handling

```json
{
  "statusCode": 400,
  "message": "Only image files are allowed",
  "error": "Bad Request"
}
```

## 🔍 Debugging

Kiểm tra logs trong console nếu có lỗi:

```typescript
// Trong CloudinaryService
console.log('Upload result:', result);
console.error('Upload error:', error);
```