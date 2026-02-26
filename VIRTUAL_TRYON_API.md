# 🎨 Virtual Try-On API Documentation

API để thực hiện virtual try-on (thử đồ ảo) sử dụng OOTDiffusion trên Kaggle.

## 📋 Mục lục
- [Tổng quan](#tổng-quan)
- [Cấu hình](#cấu-hình)
- [API Endpoints](#api-endpoints)
- [Ví dụ sử dụng](#ví-dụ-sử-dụng)
- [Frontend Integration](#frontend-integration)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Tổng quan

API này cung cấp khả năng virtual try-on, cho phép khách hàng thử quần áo trước khi mua. Sử dụng OOTDiffusion model được host trên Kaggle.

### Tính năng:
- ✅ Thử đồ upper-body (áo, jacket, v.v.)
- ✅ Thử đồ lower-body (quần)
- ✅ Thử đồ full-body (váy, jumpsuit)
- ✅ Cache ảnh để tăng tốc
- ✅ Hỗ trợ upload file hoặc URL
- ✅ Tracking request ID

---

## ⚙️ Cấu hình

### Environment Variables (.env)
```bash
KAGGLE_OOTD_URL = "https://6301c6363e80cfc00d.gradio.live"
```

**Lưu ý**: 
- Link Kaggle Gradio sẽ expire sau 72h
- Cần update lại `KAGGLE_OOTD_URL` khi restart Kaggle notebook
- Để lấy link mới: Run notebook OOTDiffusion trên Kaggle và copy link `.gradio.live`

### Setup thư mục
API tự động tạo:
- `mask_cache/` - Cache ảnh tạm
- `garment_cache/` - Cache ảnh quần áo
- `uploads/tryon/` - Upload files

---

## 🔌 API Endpoints

### 1. 🔥 POST `/virtual-tryon/try-with-product` - **[RECOMMENDED]** Try-on với Upload + Product URL

**Dành cho E-commerce**: Upload ảnh người từ client, sử dụng URL ảnh quần áo từ product (Cloudinary).

**Form Data:**
```
personImage: [File] (ảnh người - upload từ client)
garmentImageUrl: "https://res.cloudinary.com/xxx/products/shirt.jpg" (URL ảnh quần áo từ product)
category: "Upper-body"
denoiseSteps: 20 (optional)
seed: -1 (optional)
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| personImage | File | ✅ | Ảnh người (upload file từ client) |
| garmentImageUrl | string | ✅ | URL ảnh quần áo từ Cloudinary/product |
| category | string | ✅ | `Upper-body`, `Lower-body`, `Dress` |
| denoiseSteps | number | ❌ | Số bước denoise (10-40), default: 20 |
| seed | number | ❌ | Seed, default: -1 (random) |

**Response:**
```json
{
  "outputImage": "https://res.cloudinary.com/xxx/virtual-tryon/output_xxx.jpg",
  "message": "✅ Thử đồ thành công!",
  "success": true,
  "requestId": "uuid-v4",
  "processingTime": 45000
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:4000/virtual-tryon/try-with-product \
  -F "personImage=@/path/to/person.jpg" \
  -F "garmentImageUrl=https://res.cloudinary.com/demo/products/shirt.jpg" \
  -F "category=Upper-body"
```

**JavaScript/Fetch Example:**
```javascript
const formData = new FormData();
formData.append('personImage', userPhotoFile); // File object
formData.append('garmentImageUrl', product.imageUrl); // String URL
formData.append('category', 'Upper-body');

const response = await fetch('http://localhost:4000/virtual-tryon/try-with-product', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Result image URL:', result.outputImage); // Cloudinary URL
```

**Ưu điểm:**
- ✅ Chỉ upload ảnh người (nhẹ, nhanh)
- ✅ Không cần upload lại ảnh product
- ✅ Kết quả trả về Cloudinary URL (public, có thể share)
- ✅ Phù hợp nhất cho E-commerce

---

### 2. POST `/virtual-tryon/process` - Try-on với URLs

**Request Body:**
```json
{
  "personImage": "https://example.com/person.jpg",
  "garmentImage": "https://example.com/garment.png",
  "category": "Upper-body",
  "denoiseSteps": 20,
  "seed": -1,
  "useCache": true
}
```

**Parameters:**
| Field | Type | Required | Description | Values |
|-------|------|----------|-------------|---------|
| personImage | string | ✅ | URL hoặc path ảnh người | URL hoặc local path |
| garmentImage | string | ✅ | URL hoặc path ảnh quần áo | URL hoặc local path |
| category | string | ✅ | Loại quần áo | `Upper-body`, `Lower-body`, `Dress` |
| denoiseSteps | number | ❌ | Số bước denoise (10-40) | Default: 20 |
| seed | number | ❌ | Seed cho reproducibility | Default: -1 (random) |
| useCache | boolean | ❌ | Sử dụng cache | Default: true |

**Response:**
```json
{
  "outputImage": "https://res.cloudinary.com/xxx/virtual-tryon/output_xxx.jpg",
  "message": "✅ Thử đồ thành công!",
  "success": true,
  "requestId": "uuid-v4",
  "processingTime": 45000
}
```

**Lưu ý:** `outputImage` giờ trả về **Cloudinary URL** (public URL), không còn là local path.

**cURL Example:**
```bash
curl -X POST http://localhost:4000/virtual-tryon/process \
  -H "Content-Type: application/json" \
  -d '{
    "personImage": "https://example.com/person.jpg",
    "garmentImage": "https://example.com/tshirt.png",
    "category": "Upper-body",
    "denoiseSteps": 20
  }'
```

---3

### 2. POST `/virtual-tryon/upload` - Try-on với upload files

**Form Data:**
```
personImage: [File] (ảnh người)
garmentImage: [File] (ảnh quần áo)
category: "Upper-body"
denoiseSteps: 20
seed: -1
useCache: true
```

**Giới hạn:**
- Max file size: 10MB
- Allowed formats: JPG, JPEG, PNG
- Max resolution: Khuyến nghị <= 1024x1024 để xử lý nhanh

**Response:** Giống `/process`

**cURL Example:**
```bash
curl -X POST http://localhost:4000/virtual-tryon/upload \
  -F "personImage=@/path/to/person.jpg" \
  -F "garmentImage=@/path/to/garment.png" \
  -F "category=Upper-body" \
  -F "denoiseSteps=20"
```

---4

### 3. GET `/virtual-tryon/health` - Kiểm tra kết nối Kaggle

**Response:**
```json
{
  "connected": true,
  "url": "https://6301c6363e80cfc00d.gradio.live",
  "message": "Kaggle OOTD service is available"
}
```

**Sử dụng:** 
- Kiểm tra trước khi gọi API try-on
- Monitoring health của Kaggle service

---5

### 4. GET `/virtual-tryon/config` - Lấy cấu hình

**Response:**
```json
{
  "categories": ["Upper-body", "Lower-body", "Dress"],
  "denoiseSteps": {
    "min": 10,
    "max": 40,
    "default": 20,
    "description": "Số bước denoise, cao hơn = chất lượng tốt hơn"
  },
  "seed": {
    "default": -1,
    "description": "Seed cho reproducibility. Dùng -1 để random"
  },
  "maxFileSize": "10MB",
  "supportedFormats": ["jpg", "jpeg", "png"],
  "processingTime": {
    "estimated": "30-60 seconds",
    "note": "Thời gian tùy vào tải Kaggle server"
  }
}
```

---

## 💻 Ví dụ sử dụng

### JavaScript/TypeScript

#### 1. 🔥 **[RECOMMENDED]** Upload ảnh người + URL sản phẩm

```typescript
async function tryOnWithProduct(userPhoto: File, productImageUrl: string, category: string) {
  const formData = new FormData();
  formData.append('personImage', userPhoto);
  formData.append('garmentImageUrl', productImageUrl);
  formData.append('category', category);
  formData.append('denoiseSteps', '20');

  const response = await fetch('http://localhost:4000/virtual-tryon/try-with-product', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('✅ Success!');
    console.log('Result URL (Cloudinary):', result.outputImage);
    // result.outputImage là Cloudinary URL, có thể dùng trực tiếp trong <img>
    return result.outputImage;
  } else {
    console.error('❌ Failed:', result.message);
    throw new Error(result.message);
  }
}

// Sử dụng
const userFile = document.querySelector('input[type=file]').files[0];
const3. Với File Upload (cả 2 ảnh)ps://res.cloudinary.com/demo/products/shirt.jpg';
const resultUrl = await tryOnWithProduct(userFile, productUrl, 'Upper-body');

// Hiển thị kết quả
document.querySelector('#result-img').src = resultUrl;
```

#### 2. Với URLs
```typescript
async function tryOnWithUrls() {
  const response = await fetch('http://localhost:4000/virtual-tryon/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personImage: 'https://cdn.example.com/person.jpg',
      garmentImage: 'https://cdn.example.com/shirt.png',
      category: 'Upper-body',
     4denoiseSteps: 20,
      seed: 42,
      useCache: true
    })
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('✅ Success!');
    console.log('Output image:', result.outputImage);
    console.log('Processing time:', result.processingTime, 'ms');
  } else {
    console.error('❌ Failed:', result.message);
  }
}
``` - **Recommended cho E-commerce**

```tsx
import React, { useState } from 'react';

interface VirtualTryonWidgetProps {
  productImage: string;        // URL ảnh sản phẩm từ Cloudinary
  productCategory: string;      // 'Upper-body', 'Lower-body', 'Dress'
  productName: string;
}

export const VirtualTryonWidget: React.FC<VirtualTryonWidgetProps> = ({ 
  productImage, 
  productCategory,
  productName 
}) => {
  const [personImage, setPersonImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTryOn = async () => {
    if (!personImage) {
      alert('Vui lòng upload ảnh của bạn!');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('personImage', personImage);
      formData.append('garmentImageUrl', productImage); // URL từ product
      formData.append('category', productCategory);
      formData.append('denoiseSteps', '20');

      const response = await fetch('http://localhost:4000/virtual-tryon/try-with-product', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data.outputImage); // Cloudinary URL
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Có lỗi xảy ra khi xử lý!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tryon-widget">
      <h2>🎨 Thử đồ ảo - {productName}</h2>
      
      <div className="product-preview">
        <img src={productImage} alt={productName} />
      </div>

      {!result ? (
        <div className="upload-section">
          <label>
            📸 Upload ảnh của bạn:
            <input 
              type="file" 
              accept="image/jpeg,image/jpg,image/png"
              onChange={(e) => setPersonImage(e.target.files?.[0] || null)}
            />
          </label>

          <button 
            onClick={handleTryOn} 
            disabled={loading || !personImage}
            className="try-on-btn"
          >
            {loading ? '⏳ Đang xử lý... (~30-60s)' : '✨ Thử đồ ngay'}
          </button>

          {error && <p className="error">{error}</p>}
        </div>
      ) : (
        <div className="result-section">
          <h3>✅ Kết quả:</h3>
          <img src={result} alt="Try-on result" />
          <div className="actions">
            <button onClick={() => setResult(null)}>🔄 Thử lại</button>
            <button onClick={() => {/* Add to cart logic */}}>
              🛒 Thêm vào giỏ hàng
            </button>
          </div>
        </div>
      )} - **Recommended cho E-commerce**

```vue
<template>
  <div class="tryon-widget">
    <h2>🎨 Thử đồ ảo - {{ productName }}</h2>
    
    <div class="product-preview">
      <img :src="productImage" :alt="productName" />
    </div>

    <div v-if="!result" class="upload-section">
      <label>
        📸 Upload ảnh của bạn:
        <input 
          type="file" 
          @change="onPersonImageChange" 
          accept="image/jpeg,image/jpg,image/png" 
        />
      </label>

      <button 
        @click="handleTryOn" 
        :disabled="loading || !personImage"
        class="try-on-btn"
      >
        {{ loading ? '⏳ Đang xử lý... (~30-60s)' : '✨ Thử đồ ngay' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div v-else class="result">
      <h3>✅ Kết quả:</h3>
      <img :src="result" alt="Try-on result" />
      <div class="actions">
        <button @click="result = null">🔄 Thử lại</button>
        <button @click="addToCart">🛒 Thêm vào giỏ hàng</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  productImage: string;      // URL ảnh sản phẩm từ Cloudinary
  productCategory: string;   // 'Upper-body', 'Lower-body', 'Dress'
  productName: string;
}

const props = defineProps<Props>();

const personImage = ref<File | null>(null);
const loading = ref(false);
const result = ref<string | null>(null);
const error = ref<string | null>(null);

const onPersonImageChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  personImage.value = target.files?.[0] || null;
  error.value = null;
};

const handleTryOn = async () => {
  if (!personImage.value) {
    alert('Vui lòng upload ảnh của bạn!');
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const formData = new FormData();
    formData.append('personImage', personImage.value);
    formData.append('garmentImageUrl', props.productImage); // URL từ product
    formData.append('category', props.productCategory);
    formData.append('denoiseSteps', '20');

    const response = await fetch('http://localhost:4000/virtual-tryon/try-with-product', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
 - **Recommended**

Thêm button "Thử đồ" vào trang sản phẩm:

```typescript
// ProductPage.tsx
import { useState } from 'react';

function ProductPage({ product }) {
  const [showTryOn, setShowTryOn] = useState(false);

  return (
    <div className="product-page">
      <img src={product.imageUrl} alt={product.name} />
      <h1>{product.name}</h1>
      <p>{product.price}</p>
      
      {/* Try-On Button */}
      <button 
        className="try-on-btn"
        onClick={() => setShowTryOn(true)}
      >
        🎨 Thử đồ ảo
      </button>

      {/* Try-On Modal */}
      {showTryOn && (
        <TryOnModal
          productImageUrl={product.imageUrl}  // Cloudinary URL
          category={product.category}
          productName={product.name}
          onClose={() => setShowTryOn(false)}
        />
      )}
    </div>
  );
}
```

### 2. Try-On Modal Component - **Recommended**

```typescript
// TryOnModal.tsx
interface TryOnModalProps {
  productImageUrl: string;  // URL ảnh sản phẩm từ Cloudinary
  category: string;
  productName: string;
  onClose: () => void;
}

export function TryOnModal({ productImageUrl, category, productName, onClose }: TryOnModalProps) {
  const [personImage, setPersonImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTryOn = async () => {
    if (!personImage) {
      alert('Vui lòng upload ảnh của bạn!');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('personImage', personImage);
      formData.append('garmentImageUrl', productImageUrl); // URL từ product
      formData.append('category', category);
      formData.append('denoiseSteps', '20');

      const response = await fetch('http://localhost:4000/virtual-tryon/try-with-product', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data.outputImage); // Cloudinary URL
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Có lỗi xảy ra khi xử lý!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        
        <h2>🎨 Thử đồ ảo - {productName}</h2>

        {!result ? (
          <>
            <div className="preview">
              <img src={productImageUrl} alt={productName} />
              <p className="hint">Sản phẩm bạn muốn thử</p>
            </div>

            <div className="upload-section">
              <label className="upload-label">
                📸 Upload ảnh của bạn
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={(e) => setPersonImage(e.target.files?.[0] || null)}
                />
              </label>

              {personImage && (
                <p className="file-info">✅ {personImage.name}</p>
              )}
            </div>

            <button 
              onClick={handleTryOn} 
              disabled={loading || !personImage}
              className="action-btn"
            >
              {loading ? '⏳ Đang xử lý... (30-60s)' : '✨ Thử đồ ngay'}
            </button>

            {error && <p className="error">{error}</p>}
          </>
        ) : (
          <div className="result">
            <h3>✅ Kết quả thử đồ</h3>
            <img src={result} alt="Try-on result" />
            <Url?: string; // Cloudinary URL của ảnh try-on
}

// Khi add to cart sau khi try-on
async function addToCartWithTryOn(product: Product, tryonResultUrl: string) {
  const cartItem = {
    productId: product.id,
    quantity: 1,
    tryonResultUrl: tryonResultUrl // Cloudinary URL
  };
  
  // Gọi API add to cart
  const response = await fetch('/api/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cartItem)
  });
  
  if (response.ok) {
    alert('✅ Đã thêm vào giỏ hàng với ảnh thử đồ!');
  }
}

// Hiển thị trong cart
function CartItem({ item }) {
  return (
    <div className="cart-item">
      <img 
        src={item.tryonResultUrl || item.product.imageUrl} 
        alt={item.product.name}
      />
      {item.tryonResultUrl && (
        <span className="badge">✨ Đã thử đồ ảo</span>
      )}
      <h4>{item.product.name}</h4>
      <p>{item.product.price}</p>
      
      {/* Xem lại ảnh thử đồ */}
      {item.tryonResultUrl && (
        <button onClick={() => window.open(item.tryonResultUrl, '_blank')}>
          🔍 Xem ảnh thử đồ
        </button>
      )}
    </div>
  );
}

// Backend: Lưu tryonResultUrl vào database
// Schema example (Prisma)
model CartItem {
  id             String   @id @default(cuid())
  userId         String
  productId      String
  quantity       Int
  tryonResultUrl String?  // Cloudinary URL
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  product        Product  @relation(fields: [productId], references: [id])
  user           User     @relation(fields: [userId], references: [id])
```typescript
// ProductPage.tsx
import { useState } from 'react';

function ProductPage({ product }) {
  const [showTryOn, setShowTryOn] = useState(false);

  return (
    <div className="product-page">
      <img src={product.image} alt={product.name} />
      <h1>{product.name}</h1>
      <p>{product.price}</p>
      
      {/* Try-On Button */}
      <button 
        className="try-on-btn"
        onClick={() => setShowTryOn(true)}
      >
        🎨 Thử đồ ảo
      </button>

      {/* Try-On Modal */}
      {showTryOn && (
        <TryOnModal
          garmentImage={product.image}
          category={product.category}
          onClose={() => setShowTryOn(false)}
        />
      )}
    </div>
  );
}
```

### 2. Try-On Modal Component

```typescript
// TryOnModal.tsx
interface TryOnModalProps {
  garmentImage: string;
  Giải pháp:** Kết quả giờ trả về **Cloudinary URL** (public URL), có thể dùng trực tiếp:

```typescript
// Backend response
{
  "outputImage": "https://res.cloudinary.com/xxx/virtual-tryon/output_xxx.jpg"
}

// Frontend - Dùng trực tiếp
<img src={result.outputImage} alt="Try-on result" />

// Không cần setup static file serving
// Không cần convert path
// URL sẵn sàng để share, lưu vào database, v.v.
```

**Lưu ý:**
- `outputImage` giờ là Cloudinary URL, không phải local path
- URL này permanent và public
- Có thể lưu vào database để hiển thị lại sau
- Có thể share cho người khác xem   const response = await fetch('http://localhost:4000/virtual-tryon/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personImage: URL.createObjectURL(personImage), // Convert to URL
          garmentImage,
          category,
          denoiseSteps: 20
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data.outputImage);
      } else {
        alert('Lỗi: ' + data.message);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        
        <h2>Thử đồ ảo</h2>

        {!result ? (
          <>
            <div className="preview">
              <img src={garmentImage} alt="Garment" />
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPersonImage(e.target.files?.[0] || null)}
            />

            <button onClick={handleTryOn} disabled={loading || !personImage}>
              {loading ? 'Đang xử lý...' : 'Thử đồ ngay'}
            </button>
          </>
        ) : (
          <div className="result">
            <img src={result} alt="Try-on result" />
            <button onClick={() => setResult(null)}>Thử lại</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 3. Tích hợp với Cart/Checkout

```typescript
// Lưu kết quả try-on vào cart item
interface CartItem {
  productId: string;
  quantity: number;
  tryonResult?: string; // URL của ảnh try-on
}

// Khi add to cart sau khi try-on
function addToCartWithTryOn(product: Product, tryonImage: string) {
  const cartItem = {
    productId: product.id,
    quantity: 1,
    tryonResult: tryonImage
  };
  
  // Gọi API add to cart
  fetch('/api/cart/add', {
    method: 'POST',
    body: JSON.stringify(cartItem)
  });
}

// Hiển thị trong cart
function CartItem({ item }) {
  return (
    <div className="cart-item">
      <img src={item.tryonResult || item.product.image} />
      {item.tryonResult && <span className="badge">Đã thử đồ</span>}
      {/* ... */}
    </div>
  );
}
```

---

## 🔧 Troubleshooting

### 1. Kaggle Link Expired
**Lỗi:** `Cannot connect to Kaggle OOTD service`

**Giải pháp:**
1. Vào Kaggle notebook OOTDiffusion
2. Restart notebook
3. Copy link `.gradio.live` mới
4. Update `KAGGLE_OOTD_URL` trong `.env`
5. Restart backend server

### 2. Processing Time quá lâu
**Nguyên nhân:** 
- Kaggl1.0 (2026-02-05)
- 🔥 **NEW**: Endpoint `/try-with-product` - Upload ảnh người + URL sản phẩm
- ✅ Upload kết quả lên Cloudinary (trả về public URL)
- ✅ Không cần cache local nữa
- ✅ Kết quả có thể share và lưu vào database
- ✅ Tối ưu cho E-commerce use case

### v1.0.0 (2026-02-04)
- ✅ Initial release
- ✅ Support Upper-body, Lower-body, Dress
- ✅ Upload và URL support
- ✅ Caching mechanism
- ✅ Request tracking với UUID
- ✅ Health check endpoint

---

## 🎯 Quick Start cho Frontend Dev

**TL;DR - Chỉ cần làm 3 bước:**

1. **Lấy thông tin sản phẩm:**
```typescript
const product = {
  imageUrl: "https://res.cloudinary.com/demo/products/shirt.jpg",
  category: "Upper-body", // hoặc "Lower-body", "Dress"
  name: "Áo sơ mi nam"
};
```

2. **Upload ảnh người từ client:**
```typescript
const userPhoto = document.querySelector('input[type=file]').files[0];
```

3. **Gọi API:**
```typescript
const formData = new FormData();
formData.append('personImage', userPhoto);
formData.append('garmentImageUrl', product.imageUrl);
formData.append('category', product.category);

const response = await fetch('http://localhost:4000/virtual-tryon/try-with-product', {
  method: 'POST',
  body: formData
});

const result = await response.json();
// result.outputImage: "https://res.cloudinary.com/.../output_xxx.jpg"

// Hiển thị kết quả
document.querySelector('#result').src = result.outputImage;
```

**That's it!** 🎉) và retry logic

```typescript
async function tryOnWithRetry(data, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/virtual-tryon/process', {
        method: 'POST',
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(120000) // 2 minutes
      });
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
    }
  }
}
```

### 3. Upload file lỗi
**Lỗi:** `Only image files are allowed!`

**Giải pháp:**
- Chỉ upload JPG, JPEG, PNG
- Check file size < 10MB
- Validate trước khi upload:

```typescript
function validateImage(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    alert('Chỉ hỗ trợ JPG, PNG!');
    return false;
  }

  if (file.size > maxSize) {
    alert('File quá lớn! Tối đa 10MB');
    return false;
  }

  return true;
}
```

### 4. Result image không load
**Nguyên nhân:** Path trả về là local path

**Giải pháp:** Setup static file serving

```typescript
// main.ts
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'mask_cache'), {
    prefix: '/tryon-results/',
  });
  
  await app.listen(4000);
}
```

Frontend:
```typescript
const imageUrl = `http://localhost:4000${result.outputImage}`;
```

---

## 📊 Performance Tips

### 1. Implement Loading UI
```typescript
function LoadingSpinner() {
  return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Đang xử lý... (~30-60 giây)</p>
      <p>Vui lòng không tắt trang!</p>
    </div>
  );
}
```

### 2. Cache Results
```typescript
// Cache kết quả try-on trong localStorage
function cacheTryOnResult(personHash: string, garmentId: string, result: string) {
  const cacheKey = `tryon_${personHash}_${garmentId}`;
  localStorage.setItem(cacheKey, JSON.stringify({
    result,
    timestamp: Date.now()
  }));
}

function getCachedResult(personHash: string, garmentId: string): string | null {
  const cacheKey = `tryon_${personHash}_${garmentId}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    const { result, timestamp } = JSON.parse(cached);
    // Cache valid for 24h
    if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
      return result;
    }
  }
  
  return null;
}
```

### 3. Optimize Images
```typescript
async function compressImage(file: File, maxWidth = 768): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(new File([blob!], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.85);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}
```

---

## 🚀 Production Checklist

- [ ] Setup persistent storage cho cache (S3, Cloudinary)
- [ ] Implement CDN cho result images
- [ ] Add rate limiting (max 10 requests/user/hour)
- [ ] Setup monitoring cho Kaggle health
- [ ] Implement webhook notification khi Kaggle down
- [ ] Add analytics tracking (success rate, processing time)
- [ ] Setup error reporting (Sentry)
- [ ] Optimize image delivery (WebP format)
- [ ] Add watermark cho free users
- [ ] Implement queue system cho high load

---

## 📞 Support

**API Base URL:** `http://localhost:4000/virtual-tryon`  
**Swagger Docs:** `http://localhost:4000/api`  
**Health Check:** `http://localhost:4000/virtual-tryon/health`

**Kaggle Notebook:** [OOTDiffusion on Kaggle](https://www.kaggle.com/)

---

## 📝 Changelog

### v1.0.0 (2026-02-04)
- ✅ Initial release
- ✅ Support Upper-body, Lower-body, Dress
- ✅ Upload và URL support
- ✅ Caching mechanism
- ✅ Request tracking với UUID
- ✅ Health check endpoint
